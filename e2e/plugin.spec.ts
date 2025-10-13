import { rm } from "node:fs/promises"
import path from "path"

import {
    SqljsInitializer,
    createTestEnvironment,
    registerInitializer
} from "@vendure/testing"

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
    }, 60000)

    afterAll(async () => {
        await server.destroy()
        await rm(TEST_DB_DIR, { recursive: true })
    })

    it("works", async () => {
        expect(true).toBe(true)
    }, 10000)
})
