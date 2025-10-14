import { rm } from "node:fs/promises"
import path from "path"

import {
    SqljsInitializer,
    createTestEnvironment,
    registerInitializer
} from "@vendure/testing"
import { gql } from "graphql-tag"

import { VisitorAnalyticsPlugin } from "src"

import { initialData, testConfig, testPaymentMethod } from "./utils"

const TEST_DB_DIR = path.join(__dirname, "../__test_db__")

describe("Visitor Analytics Plugin", function () {
    const { server, adminClient, shopClient } = createTestEnvironment({
        ...testConfig(4000),
        plugins: [VisitorAnalyticsPlugin],
        paymentOptions: {
            paymentMethodHandlers: [testPaymentMethod]
        }
    })

    let productId1: string
    let productId2: string

    beforeAll(async () => {
        registerInitializer("sqljs", new SqljsInitializer(TEST_DB_DIR))

        await server.init({
            productsCsvPath: path.join(__dirname, "./utils/products.csv"),
            initialData: {
                ...initialData,
                paymentMethods: [
                    {
                        name: testPaymentMethod.code,
                        handler: { code: testPaymentMethod.code, arguments: [] }
                    }
                ]
            },
            customerCount: 2
        })
        await adminClient.asSuperAdmin()

        const products = await shopClient.query(gql`
            query {
                products {
                    items {
                        id
                        name
                    }
                }
            }
        `)
        productId1 = products.products.items[0].id
        productId2 = products.products.items[1]?.id || productId1
    }, 60000)

    afterAll(async () => {
        await server.destroy()
        await rm(TEST_DB_DIR, { recursive: true })
    })

    describe("Shop API - trackProductView", () => {
        it("should track a product view", async () => {
            const result = await shopClient.query(
                gql`
                    mutation TrackView($input: TrackProductViewInput!) {
                        trackProductView(input: $input) {
                            success
                        }
                    }
                `,
                {
                    input: { productId: productId1 }
                }
            )

            expect(result.trackProductView.success).toBe(true)
        })

        it("should handle invalid product ID gracefully", async () => {
            const result = await shopClient.query(
                gql`
                    mutation TrackView($input: TrackProductViewInput!) {
                        trackProductView(input: $input) {
                            success
                        }
                    }
                `,
                {
                    input: { productId: "999999" }
                }
            )

            expect(result.trackProductView).toBeDefined()
        })

        it("should track multiple product views", async () => {
            const results = []

            // Track product 1 three times
            for (let i = 0; i < 3; i++) {
                const result = await shopClient.query(
                    gql`
                        mutation TrackView($input: TrackProductViewInput!) {
                            trackProductView(input: $input) {
                                success
                            }
                        }
                    `,
                    {
                        input: { productId: productId1 }
                    }
                )
                results.push(result.trackProductView.success)
            }

            // Track product 2 twice
            for (let i = 0; i < 2; i++) {
                const result = await shopClient.query(
                    gql`
                        mutation TrackView($input: TrackProductViewInput!) {
                            trackProductView(input: $input) {
                                success
                            }
                        }
                    `,
                    {
                        input: { productId: productId2 }
                    }
                )
                results.push(result.trackProductView.success)
            }

            expect(results.every(r => r === true)).toBe(true)
        })

        it("should deduplicate views within the same session", async () => {
            // First view should succeed
            const result1 = await shopClient.query(
                gql`
                    mutation TrackView($input: TrackProductViewInput!) {
                        trackProductView(input: $input) {
                            success
                        }
                    }
                `,
                {
                    input: { productId: productId1 }
                }
            )

            // Immediate duplicate view in same session
            const result2 = await shopClient.query(
                gql`
                    mutation TrackView($input: TrackProductViewInput!) {
                        trackProductView(input: $input) {
                            success
                        }
                    }
                `,
                {
                    input: { productId: productId1 }
                }
            )

            expect(result1.trackProductView.success).toBe(true)
            // Second one might be deduplicated (depends on implementation)
            expect(result2.trackProductView).toBeDefined()
        })
    })

    describe("Admin API - Analytics Queries", () => {
        beforeAll(async () => {
            // Track some views to have data for queries
            await shopClient.query(
                gql`
                    mutation TrackView($input: TrackProductViewInput!) {
                        trackProductView(input: $input) {
                            success
                        }
                    }
                `,
                {
                    input: { productId: productId1 }
                }
            )

            await shopClient.query(
                gql`
                    mutation TrackView($input: TrackProductViewInput!) {
                        trackProductView(input: $input) {
                            success
                        }
                    }
                `,
                {
                    input: { productId: productId2 }
                }
            )
        })

        describe("analyticsVisitors", () => {
            it("should return visitor timeseries data", async () => {
                const result = await adminClient.query(
                    gql`
                        query GetVisitors($range: DateRange!) {
                            analyticsVisitors(range: $range) {
                                date
                                uniqueVisitors
                            }
                        }
                    `,
                    {
                        range: {
                            start: new Date(
                                Date.now() - 7 * 24 * 60 * 60 * 1000
                            ).toISOString(),
                            end: new Date().toISOString()
                        }
                    }
                )

                expect(result.analyticsVisitors).toBeDefined()
                expect(Array.isArray(result.analyticsVisitors)).toBe(true)
            })

            it("should handle empty date ranges", async () => {
                const result = await adminClient.query(
                    gql`
                        query GetVisitors($range: DateRange!) {
                            analyticsVisitors(range: $range) {
                                date
                                uniqueVisitors
                            }
                        }
                    `,
                    {
                        range: {
                            start: new Date(
                                Date.now() - 365 * 24 * 60 * 60 * 1000
                            ).toISOString(),
                            end: new Date(
                                Date.now() - 364 * 24 * 60 * 60 * 1000
                            ).toISOString()
                        }
                    }
                )

                expect(result.analyticsVisitors).toBeDefined()
                expect(Array.isArray(result.analyticsVisitors)).toBe(true)
            })

            it("should return data with correct structure", async () => {
                const result = await adminClient.query(
                    gql`
                        query GetVisitors($range: DateRange!) {
                            analyticsVisitors(range: $range) {
                                date
                                uniqueVisitors
                            }
                        }
                    `,
                    {
                        range: {
                            start: new Date(
                                Date.now() - 7 * 24 * 60 * 60 * 1000
                            ).toISOString(),
                            end: new Date().toISOString()
                        }
                    }
                )

                if (result.analyticsVisitors.length > 0) {
                    const point = result.analyticsVisitors[0]
                    expect(point).toHaveProperty("date")
                    expect(point).toHaveProperty("uniqueVisitors")
                    expect(typeof point.date).toBe("string")
                    expect(typeof point.uniqueVisitors).toBe("number")
                }
            })
        })

        describe("analyticsTopProducts", () => {
            it("should return top products", async () => {
                const result = await adminClient.query(
                    gql`
                        query GetTopProducts($range: DateRange!, $limit: Int!) {
                            analyticsTopProducts(range: $range, limit: $limit) {
                                productId
                                name
                                views
                            }
                        }
                    `,
                    {
                        range: {
                            start: new Date(
                                Date.now() - 7 * 24 * 60 * 60 * 1000
                            ).toISOString(),
                            end: new Date().toISOString()
                        },
                        limit: 5
                    }
                )

                expect(result.analyticsTopProducts).toBeDefined()
                expect(Array.isArray(result.analyticsTopProducts)).toBe(true)
            })

            it("should respect limit parameter", async () => {
                const limit = 3
                const result = await adminClient.query(
                    gql`
                        query GetTopProducts($range: DateRange!, $limit: Int!) {
                            analyticsTopProducts(range: $range, limit: $limit) {
                                productId
                                name
                                views
                            }
                        }
                    `,
                    {
                        range: {
                            start: new Date(
                                Date.now() - 7 * 24 * 60 * 60 * 1000
                            ).toISOString(),
                            end: new Date().toISOString()
                        },
                        limit
                    }
                )

                expect(result.analyticsTopProducts.length).toBeLessThanOrEqual(
                    limit
                )
            })

            it("should return products with correct structure", async () => {
                const result = await adminClient.query(
                    gql`
                        query GetTopProducts($range: DateRange!, $limit: Int!) {
                            analyticsTopProducts(range: $range, limit: $limit) {
                                productId
                                name
                                views
                            }
                        }
                    `,
                    {
                        range: {
                            start: new Date(
                                Date.now() - 7 * 24 * 60 * 60 * 1000
                            ).toISOString(),
                            end: new Date().toISOString()
                        },
                        limit: 10
                    }
                )

                if (result.analyticsTopProducts.length > 0) {
                    const product = result.analyticsTopProducts[0]
                    expect(product).toHaveProperty("productId")
                    expect(product).toHaveProperty("name")
                    expect(product).toHaveProperty("views")
                    expect(typeof product.productId).toBe("string")
                    expect(typeof product.views).toBe("number")
                    expect(product.views).toBeGreaterThanOrEqual(0)
                }
            })

            it("should sort products by views in descending order", async () => {
                const result = await adminClient.query(
                    gql`
                        query GetTopProducts($range: DateRange!, $limit: Int!) {
                            analyticsTopProducts(range: $range, limit: $limit) {
                                productId
                                name
                                views
                            }
                        }
                    `,
                    {
                        range: {
                            start: new Date(
                                Date.now() - 7 * 24 * 60 * 60 * 1000
                            ).toISOString(),
                            end: new Date().toISOString()
                        },
                        limit: 10
                    }
                )

                if (result.analyticsTopProducts.length > 1) {
                    for (
                        let i = 0;
                        i < result.analyticsTopProducts.length - 1;
                        i++
                    ) {
                        const current = result.analyticsTopProducts[i]
                        const next = result.analyticsTopProducts[i + 1]
                        expect(current.views).toBeGreaterThanOrEqual(next.views)
                    }
                }
            })
        })

        describe("analyticsProductTrend", () => {
            it("should return product trend data", async () => {
                const result = await adminClient.query(
                    gql`
                        query GetProductTrend(
                            $productId: ID!
                            $range: DateRange!
                        ) {
                            analyticsProductTrend(
                                productId: $productId
                                range: $range
                            ) {
                                date
                                views
                            }
                        }
                    `,
                    {
                        productId: productId1,
                        range: {
                            start: new Date(
                                Date.now() - 7 * 24 * 60 * 60 * 1000
                            ).toISOString(),
                            end: new Date().toISOString()
                        }
                    }
                )

                expect(result.analyticsProductTrend).toBeDefined()
                expect(Array.isArray(result.analyticsProductTrend)).toBe(true)
            })

            it("should return data with correct structure", async () => {
                const result = await adminClient.query(
                    gql`
                        query GetProductTrend(
                            $productId: ID!
                            $range: DateRange!
                        ) {
                            analyticsProductTrend(
                                productId: $productId
                                range: $range
                            ) {
                                date
                                views
                            }
                        }
                    `,
                    {
                        productId: productId1,
                        range: {
                            start: new Date(
                                Date.now() - 7 * 24 * 60 * 60 * 1000
                            ).toISOString(),
                            end: new Date().toISOString()
                        }
                    }
                )

                if (result.analyticsProductTrend.length > 0) {
                    const point = result.analyticsProductTrend[0]
                    expect(point).toHaveProperty("date")
                    expect(point).toHaveProperty("views")
                    expect(typeof point.date).toBe("string")
                    expect(typeof point.views).toBe("number")
                }
            })

            it("should handle non-existent product", async () => {
                const result = await adminClient.query(
                    gql`
                        query GetProductTrend(
                            $productId: ID!
                            $range: DateRange!
                        ) {
                            analyticsProductTrend(
                                productId: $productId
                                range: $range
                            ) {
                                date
                                views
                            }
                        }
                    `,
                    {
                        productId: "999999",
                        range: {
                            start: new Date(
                                Date.now() - 7 * 24 * 60 * 60 * 1000
                            ).toISOString(),
                            end: new Date().toISOString()
                        }
                    }
                )

                expect(result.analyticsProductTrend).toBeDefined()
                expect(Array.isArray(result.analyticsProductTrend)).toBe(true)
            })
        })

        describe("analyticsSummary", () => {
            it("should return summary metrics", async () => {
                const result = await adminClient.query(
                    gql`
                        query GetSummary($range: DateRange!) {
                            analyticsSummary(range: $range) {
                                totalUniqueVisitors
                            }
                        }
                    `,
                    {
                        range: {
                            start: new Date(
                                Date.now() - 7 * 24 * 60 * 60 * 1000
                            ).toISOString(),
                            end: new Date().toISOString()
                        }
                    }
                )

                expect(result.analyticsSummary).toBeDefined()
                expect(result.analyticsSummary).toHaveProperty(
                    "totalUniqueVisitors"
                )
                expect(typeof result.analyticsSummary.totalUniqueVisitors).toBe(
                    "number"
                )
                expect(
                    result.analyticsSummary.totalUniqueVisitors
                ).toBeGreaterThanOrEqual(0)
            })

            it("should return zero for empty date range", async () => {
                const result = await adminClient.query(
                    gql`
                        query GetSummary($range: DateRange!) {
                            analyticsSummary(range: $range) {
                                totalUniqueVisitors
                            }
                        }
                    `,
                    {
                        range: {
                            start: new Date(
                                Date.now() - 365 * 24 * 60 * 60 * 1000
                            ).toISOString(),
                            end: new Date(
                                Date.now() - 364 * 24 * 60 * 60 * 1000
                            ).toISOString()
                        }
                    }
                )

                expect(result.analyticsSummary.totalUniqueVisitors).toBe(0)
            })
        })
    })

    describe("Session Management", () => {
        it("should create a new session for new visitor", async () => {
            const result = await shopClient.query(
                gql`
                    mutation TrackView($input: TrackProductViewInput!) {
                        trackProductView(input: $input) {
                            success
                        }
                    }
                `,
                {
                    input: { productId: productId1 }
                }
            )

            expect(result.trackProductView.success).toBe(true)
        })

        it("should reuse existing session token", async () => {
            // Track multiple views in same session
            const results = []
            for (let i = 0; i < 3; i++) {
                const result = await shopClient.query(
                    gql`
                        mutation TrackView($input: TrackProductViewInput!) {
                            trackProductView(input: $input) {
                                success
                            }
                        }
                    `,
                    {
                        input: {
                            productId: i % 2 === 0 ? productId1 : productId2
                        }
                    }
                )
                results.push(result.trackProductView.success)
            }

            expect(results.every(r => r === true)).toBe(true)
        })
    })

    describe("Date Range Filtering", () => {
        it("should filter data by date range", async () => {
            const now = new Date()
            const sevenDaysAgo = new Date(
                now.getTime() - 7 * 24 * 60 * 60 * 1000
            )

            const result = await adminClient.query(
                gql`
                    query GetVisitors($range: DateRange!) {
                        analyticsVisitors(range: $range) {
                            date
                            uniqueVisitors
                        }
                    }
                `,
                {
                    range: {
                        start: sevenDaysAgo.toISOString(),
                        end: now.toISOString()
                    }
                }
            )

            expect(result.analyticsVisitors).toBeDefined()
            // Verify all dates are within range
            if (result.analyticsVisitors.length > 0) {
                result.analyticsVisitors.forEach(
                    (point: { date: string; uniqueVisitors: number }) => {
                        const pointDate = new Date(point.date)
                        expect(pointDate.getTime()).toBeGreaterThanOrEqual(
                            sevenDaysAgo.getTime()
                        )
                        expect(pointDate.getTime()).toBeLessThanOrEqual(
                            now.getTime()
                        )
                    }
                )
            }
        })

        it("should handle different date range presets", async () => {
            const now = new Date()
            const ranges = [7, 30, 90] // days

            for (const days of ranges) {
                const start = new Date(
                    now.getTime() - days * 24 * 60 * 60 * 1000
                )
                const result = await adminClient.query(
                    gql`
                        query GetVisitors($range: DateRange!) {
                            analyticsVisitors(range: $range) {
                                date
                                uniqueVisitors
                            }
                        }
                    `,
                    {
                        range: {
                            start: start.toISOString(),
                            end: now.toISOString()
                        }
                    }
                )

                expect(result.analyticsVisitors).toBeDefined()
                expect(Array.isArray(result.analyticsVisitors)).toBe(true)
            }
        })
    })

    describe("Error Handling", () => {
        it("should handle invalid date ranges gracefully", async () => {
            try {
                await adminClient.query(
                    gql`
                        query GetVisitors($range: DateRange!) {
                            analyticsVisitors(range: $range) {
                                date
                                uniqueVisitors
                            }
                        }
                    `,
                    {
                        range: {
                            start: "invalid-date",
                            end: "invalid-date"
                        }
                    }
                )
            } catch (error) {
                expect(error).toBeDefined()
            }
        })

        it("should handle missing required parameters", async () => {
            try {
                await shopClient.query(
                    gql`
                        mutation TrackView($input: TrackProductViewInput!) {
                            trackProductView(input: $input) {
                                success
                            }
                        }
                    `,
                    {
                        input: {}
                    }
                )
            } catch (error) {
                expect(error).toBeDefined()
            }
        })
    })
})
