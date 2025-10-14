import { Args, Mutation, Resolver } from "@nestjs/graphql"
import { Ctx, ID, RequestContext } from "@vendure/core"

import { TrackingService } from "../services/tracking.service"

@Resolver()
export class ShopAnalyticsResolver {
    constructor(private trackingService: TrackingService) {}

    @Mutation()
    async trackProductView(
        @Ctx() ctx: RequestContext,
        @Args("input") input: { productId: ID }
    ) {
        const result = await this.trackingService.trackProductView(ctx, {
            productId: input.productId
        })

        return { success: result.recorded }
    }
}
