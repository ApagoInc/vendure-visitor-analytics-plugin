import { Injectable } from "@nestjs/common"
import {
    Channel,
    ID,
    Logger,
    RequestContext,
    TransactionalConnection
} from "@vendure/core"

import { loggerCtx } from "../constants"
import { DailyProductViewStat } from "../entities/daily-product-view-stat.entity"
import { DailyVisitorStat } from "../entities/daily-visitor-stat.entity"
import { VisitorEvent } from "../entities/visitor-event.entity"
import { VisitorSession } from "../entities/visitor-session.entity"

/**
 * Service responsible for aggregating raw visitor events and sessions
 * into daily statistics for fast querying.
 *
 * Should be run as a scheduled job.
 */
@Injectable()
export class AggregationService {
    constructor(private connection: TransactionalConnection) {}

    /**
     * Aggregate visitor and product view statistics for a specific date.
     * This processes raw events and sessions into pre-computed daily stats.
     *
     * @param ctx Request context
     * @param date Date to aggregate in YYYY-MM-DD format
     */
    async aggregateDate(ctx: RequestContext, date: string): Promise<void> {
        Logger.info(`Aggregating analytics for date: ${date}`, loggerCtx)

        // Get all channels to process stats per channel
        const channels = await this.connection
            .getRepository(ctx, Channel)
            .find()

        for (const channel of channels) {
            await this.aggregateVisitorStats(ctx, date, channel.id)
            await this.aggregateProductViewStats(ctx, date, channel.id)
        }

        Logger.info(`Completed aggregation for date: ${date}`, loggerCtx)
    }

    /**
     * Aggregate unique visitor counts for a specific date and channel.
     * Counts distinct sessions where firstSeen falls on the given date.
     */
    private async aggregateVisitorStats(
        ctx: RequestContext,
        date: string,
        channelId: ID
    ): Promise<void> {
        const startOfDay = `${date} 00:00:00`
        const endOfDay = `${date} 23:59:59`

        const result = await this.connection
            .getRepository(ctx, VisitorSession)
            .createQueryBuilder("session")
            .innerJoin(
                "session.channels",
                "channel",
                "channel.id = :channelId",
                {
                    channelId
                }
            )
            .where("session.firstSeen >= :start", { start: startOfDay })
            .andWhere("session.firstSeen <= :end", { end: endOfDay })
            .getCount()

        const channel = await this.connection
            .getRepository(ctx, Channel)
            .findOne({ where: { id: channelId } })

        if (!channel) {
            Logger.warn(
                `Channel ${channelId} not found, skipping visitor stats`,
                loggerCtx
            )
            return
        }

        const stat = await this.connection
            .getRepository(ctx, DailyVisitorStat)
            .findOne({
                where: { date, channelId }
            })

        if (stat) {
            stat.uniqueVisitors = result
            await this.connection
                .getRepository(ctx, DailyVisitorStat)
                .save(stat)
        } else {
            const newStat = new DailyVisitorStat({
                date,
                channel,
                uniqueVisitors: result
            })
            await this.connection
                .getRepository(ctx, DailyVisitorStat)
                .save(newStat)
        }

        Logger.debug(
            `Aggregated ${result} unique visitors for ${date} on channel ${channelId}`,
            loggerCtx
        )
    }

    /**
     * Aggregate product view counts for a specific date and channel.
     * Groups events by product and counts distinct sessions (unique viewers).
     */
    private async aggregateProductViewStats(
        ctx: RequestContext,
        date: string,
        channelId: ID
    ): Promise<void> {
        const startOfDay = `${date} 00:00:00`
        const endOfDay = `${date} 23:59:59`

        const results = await this.connection
            .getRepository(ctx, VisitorEvent)
            .createQueryBuilder("event")
            .innerJoin("event.session", "session")
            .select("event.productId", "productId")
            .addSelect("COUNT(DISTINCT session.id)", "viewCount")
            .innerJoin("event.channels", "channel", "channel.id = :channelId", {
                channelId
            })
            .where("event.type = :type", { type: "PRODUCT_VIEW" })
            .andWhere("event.productId IS NOT NULL")
            .andWhere("event.createdAt >= :start", { start: startOfDay })
            .andWhere("event.createdAt <= :end", { end: endOfDay })
            .groupBy("event.productId")
            .getRawMany()

        const channel = await this.connection
            .getRepository(ctx, Channel)
            .findOne({ where: { id: channelId } })

        if (!channel) {
            Logger.warn(
                `Channel ${channelId} not found, skipping product view stats`,
                loggerCtx
            )
            return
        }

        for (const row of results) {
            const productId = row.productId
            const viewCount = parseInt(row.viewCount, 10)

            const existingStat = await this.connection
                .getRepository(ctx, DailyProductViewStat)
                .findOne({
                    where: { date, channelId, productId }
                })

            if (existingStat) {
                existingStat.views = viewCount
                await this.connection
                    .getRepository(ctx, DailyProductViewStat)
                    .save(existingStat)
            } else {
                const newStat = new DailyProductViewStat({
                    date,
                    channel,
                    productId,
                    views: viewCount
                })
                await this.connection
                    .getRepository(ctx, DailyProductViewStat)
                    .save(newStat)
            }
        }

        Logger.debug(
            `Aggregated product view stats for ${results.length} products on ${date} channel ${channelId}`,
            loggerCtx
        )
    }

    /**
     * Backfill aggregations for a date range.
     * Useful for initial setup or catching up after downtime.
     *
     * @param ctx Request context
     * @param startDate Start date in YYYY-MM-DD format
     * @param endDate End date in YYYY-MM-DD format
     */
    async aggregateDateRange(
        ctx: RequestContext,
        startDate: string,
        endDate: string
    ): Promise<void> {
        const start = new Date(startDate)
        const end = new Date(endDate)

        Logger.info(
            `Backfilling aggregations from ${startDate} to ${endDate}`,
            loggerCtx
        )

        const current = new Date(start)
        while (current <= end) {
            const dateStr = current.toISOString().split("T")[0]
            await this.aggregateDate(ctx, dateStr as string)
            current.setDate(current.getDate() + 1)
        }

        Logger.info(
            `Completed backfill from ${startDate} to ${endDate}`,
            loggerCtx
        )
    }
}
