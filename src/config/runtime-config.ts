import { PluginConfigurationFn } from "@vendure/core"

import { ReadAnalytics } from "../permissions"

export const configuration: PluginConfigurationFn = config => {
    config.authOptions.customPermissions.push(ReadAnalytics)
    return config
}
