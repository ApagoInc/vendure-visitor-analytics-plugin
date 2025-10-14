import gql from "graphql-tag"

export const shopApiExtensions = gql`
    """
    Input for tracking a product view event.
    Session is automatically managed via RequestContext.
    """
    input TrackProductViewInput {
        productId: ID!
    }

    """
    Result of tracking a product view.
    """
    type TrackProductViewResult {
        success: Boolean!
    }

    extend type Mutation {
        """
        Track a product view event from the storefront.
        Uses the current session automatically - no manual session management needed.
        """
        trackProductView(input: TrackProductViewInput!): TrackProductViewResult!
    }
`
