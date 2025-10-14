import { ScheduledTask } from "@vendure/core"

import { AggregationService } from "../services"

export const aggregateAnalyticsTask = new ScheduledTask({
    id: "aggregate-analytics",
    description: "Aggregate analytics data",
    schedule: cron => cron.every(30).minutes(),
    execute: async ({ injector, scheduledContext }) => {
        const aggregationService = injector.get(AggregationService)

        await aggregationService.aggregateDate(
            scheduledContext,
            new Date().toISOString().split("T")[0] as string
        )
    }
})
