import gql from "graphql-tag"

export const adminApiExtensions = gql`
    """
    One point on a visitors time series (daily buckets).
    """
    type VisitorTimeseriesPoint {
        date: String!
        uniqueVisitors: Int!
    }

    """
    Aggregated product view count for a product in the selected window.
    """
    type ProductViewStat {
        productId: ID!
        name: String
        views: Int!
    }

    """
    Product view trend over time (for drill-down charts).
    """
    type ProductTrendPoint {
        date: String!
        views: Int!
    }

    """
    Summary metrics for the selected window.
    """
    type VisitorSummary {
        totalUniqueVisitors: Int!
    }

    extend type Query {
        """
        Unique visitors timeseries for the given date range (channel-aware).
        Returns daily unique visitor counts for chart display.
        """
        analyticsVisitors(range: DateRange!): [VisitorTimeseriesPoint!]!

        """
        Most viewed products for the given date range (channel-aware).
        Returns top N products sorted by view count.
        """
        analyticsTopProducts(
            range: DateRange!
            limit: Int = 10
        ): [ProductViewStat!]!

        """
        View trend for a specific product over time (channel-aware).
        Returns daily view counts for drill-down analysis.
        """
        analyticsProductTrend(
            productId: ID!
            range: DateRange!
        ): [ProductTrendPoint!]!

        """
        Summary metrics for the selected date range.
        Returns total unique visitors.
        """
        analyticsSummary(range: DateRange!): VisitorSummary!
    }
`
