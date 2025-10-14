import { graphql } from "./admin"

export const GET_VISITOR_TIMESERIES = graphql(`
    query GetVisitorTimeseries($range: DateRange!) {
        analyticsVisitors(range: $range) {
            date
            uniqueVisitors
        }
    }
`)

export const GET_TOP_PRODUCTS = graphql(`
    query GetTopProducts($range: DateRange!, $limit: Int) {
        analyticsTopProducts(range: $range, limit: $limit) {
            productId
            name
            views
        }
    }
`)

export const GET_PRODUCT_TREND = graphql(`
    query GetProductTrend($productId: ID!, $range: DateRange!) {
        analyticsProductTrend(productId: $productId, range: $range) {
            date
            views
        }
    }
`)

export const GET_ANALYTICS_SUMMARY = graphql(`
    query GetAnalyticsSummary($range: DateRange!) {
        analyticsSummary(range: $range) {
            totalUniqueVisitors
        }
    }
`)
