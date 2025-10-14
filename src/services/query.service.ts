import { Injectable } from "@nestjs/common"
import { ID, RequestContext, TransactionalConnection } from "@vendure/core"

import { DailyProductViewStat } from "../entities/daily-product-view-stat.entity"
import { DailyVisitorStat } from "../entities/daily-visitor-stat.entity"

export interface DateRange {
    start: string
    end: string
}

export interface VisitorTimeseriesPoint {
    date: string
    uniqueVisitors: number
}

export interface ProductViewStat {
    productId: ID
    name?: string
    views: number
}

export interface ProductTrendPoint {
    date: string
    views: number
}

@Injectable()
export class QueryService {
    constructor(private connection: TransactionalConnection) {}

    /**
     * Get visitor timeseries data for a date range.
     * Returns daily unique visitor counts for chart display.
     */
    async getVisitorTimeseries(
        ctx: RequestContext,
        range: DateRange
    ): Promise<VisitorTimeseriesPoint[]> {
        const stats = await this.connection
            .getRepository(ctx, DailyVisitorStat)
            .createQueryBuilder("stat")
            .where("stat.date >= :start", { start: range.start })
            .andWhere("stat.date <= :end", { end: range.end })
            .andWhere("stat.channelId = :channelId", {
                channelId: ctx.channelId
            })
            .orderBy("stat.date", "ASC")
            .getMany()

        return stats.map(stat => ({
            date: stat.date,
            uniqueVisitors: stat.uniqueVisitors
        }))
    }

    /**
     * Get most viewed products for a date range.
     * Returns aggregated view counts sorted by views descending.
     * Used for "Top Products" table in dashboard.
     */
    async getTopProducts(
        ctx: RequestContext,
        range: DateRange,
        limit: number = 10
    ): Promise<ProductViewStat[]> {
        const results = await this.connection
            .getRepository(ctx, DailyProductViewStat)
            .createQueryBuilder("stat")
            .select("stat.productId", "productId")
            .addSelect("SUM(stat.views)", "totalViews")
            .leftJoinAndSelect("stat.product", "product")
            .where("stat.date >= :start", { start: range.start })
            .andWhere("stat.date <= :end", { end: range.end })
            .andWhere("stat.channelId = :channelId", {
                channelId: ctx.channelId
            })
            .groupBy("stat.productId")
            .addGroupBy("product.id")
            .orderBy("totalViews", "DESC")
            .limit(limit)
            .getRawAndEntities()

        return results.raw.map((raw, index) => {
            const entity = results.entities[index]
            return {
                productId: raw.productId,
                name: entity?.product?.name,
                views: parseInt(raw.totalViews, 10)
            }
        })
    }

    /**
     * Get view trend for a specific product over a date range.
     * Returns daily view counts for product drill-down charts.
     * Useful for seeing "Did my Facebook post spike views for this product?"
     */
    async getProductTrend(
        ctx: RequestContext,
        productId: ID,
        range: DateRange
    ): Promise<ProductTrendPoint[]> {
        const stats = await this.connection
            .getRepository(ctx, DailyProductViewStat)
            .createQueryBuilder("stat")
            .where("stat.productId = :productId", { productId })
            .andWhere("stat.date >= :start", { start: range.start })
            .andWhere("stat.date <= :end", { end: range.end })
            .andWhere("stat.channelId = :channelId", {
                channelId: ctx.channelId
            })
            .orderBy("stat.date", "ASC")
            .getMany()

        return stats.map(stat => ({
            date: stat.date,
            views: stat.views
        }))
    }

    /**
     * Get total unique visitors for a date range.
     * Sums up daily unique visitors across the range.
     * Useful for summary metrics.
     */
    async getTotalUniqueVisitors(
        ctx: RequestContext,
        range: DateRange
    ): Promise<number> {
        const result = await this.connection
            .getRepository(ctx, DailyVisitorStat)
            .createQueryBuilder("stat")
            .select("SUM(stat.uniqueVisitors)", "total")
            .where("stat.date >= :start", { start: range.start })
            .andWhere("stat.date <= :end", { end: range.end })
            .andWhere("stat.channelId = :channelId", {
                channelId: ctx.channelId
            })
            .getRawOne()

        return parseInt(result?.total || "0", 10)
    }
}
