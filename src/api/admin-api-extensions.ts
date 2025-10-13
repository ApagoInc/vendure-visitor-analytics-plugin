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
        slug: String
        views: Int!
    }

    """
    Summary metrics for the selected window.
    """
    type VisitorSummary {
        totalUniqueVisitors: Int!
        authenticatedVisitors: Int!
        anonymousVisitors: Int!
    }

    extend type Query {
        """
        Unique visitors timeseries for the given date range (channel-aware).
        """
        analyticsVisitors(range: DateRange!): [VisitorTimeseriesPoint!]!

        """
        Most viewed products for the given date range (channel-aware).
        """
        analyticsTopProducts(
            range: DateRange!
            limit: Int = 10
        ): [ProductViewStat!]!

        """
        Summary rollup (total, authenticated vs anonymous) for the date range.
        """
        analyticsVisitorSummary(range: DateRange!): VisitorSummary!
    }
`
