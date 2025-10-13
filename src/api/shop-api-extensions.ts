import gql from "graphql-tag"

export const shopApiExtensions = gql`
    enum VisitorEventType {
        PAGE_VIEW
        PRODUCT_VIEW
    }

    input TrackVisitorEventInput {
        type: VisitorEventType!
        path: String!
        productId: ID
        referrer: String
        sessionToken: String
    }

    type TrackVisitorEventPayload {
        ok: Boolean!
    }

    extend type Mutation {
        trackVisitorEvent(
            input: TrackVisitorEventInput!
        ): TrackVisitorEventPayload!
    }
`
