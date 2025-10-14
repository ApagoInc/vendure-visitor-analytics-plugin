import { PluginConfigurationFn } from "@vendure/core"

import { ReadAnalytics } from "../permissions"
import { aggregateAnalyticsTask } from "./aggregate-analytics-task"

export const configuration: PluginConfigurationFn = config => {
    config.authOptions.customPermissions.push(ReadAnalytics)

    config.schedulerOptions.tasks.push(aggregateAnalyticsTask)
    return config
}
