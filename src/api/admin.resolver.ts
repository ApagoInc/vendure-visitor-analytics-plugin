import { Args, Query, Resolver } from "@nestjs/graphql"
import { Allow, Ctx, type ID, RequestContext } from "@vendure/core"

import { ReadAnalytics } from "../permissions"
import { QueryService } from "../services/query.service"

interface DateRangeInput {
    start: string
    end: string
}

@Resolver()
export class AdminAnalyticsResolver {
    constructor(private queryService: QueryService) {}

    @Query()
    @Allow(ReadAnalytics.Permission)
    async analyticsVisitors(
        @Ctx() ctx: RequestContext,
        @Args("range") range: DateRangeInput
    ) {
        return this.queryService.getVisitorTimeseries(ctx, range)
    }

    @Query()
    @Allow(ReadAnalytics.Permission)
    async analyticsTopProducts(
        @Ctx() ctx: RequestContext,
        @Args("range") range: DateRangeInput,
        @Args("limit") limit?: number
    ) {
        return this.queryService.getTopProducts(ctx, range, limit || 10)
    }

    @Query()
    @Allow(ReadAnalytics.Permission)
    async analyticsProductTrend(
        @Ctx() ctx: RequestContext,
        @Args("productId") productId: ID,
        @Args("range") range: DateRangeInput
    ) {
        return this.queryService.getProductTrend(ctx, productId, range)
    }

    @Query()
    @Allow(ReadAnalytics.Permission)
    async analyticsSummary(
        @Ctx() ctx: RequestContext,
        @Args("range") range: DateRangeInput
    ) {
        const totalUniqueVisitors =
            await this.queryService.getTotalUniqueVisitors(ctx, range)

        return {
            totalUniqueVisitors
        }
    }
}
