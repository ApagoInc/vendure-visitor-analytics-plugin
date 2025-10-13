import path from "path"

import { PluginCommonModule, VendurePlugin } from "@vendure/core"
import { AdminUiExtension } from "@vendure/ui-devkit/compiler"

import { adminApiExtensions } from "./api/admin-api-extensions"
import { AdminAnalyticsResolver } from "./api/admin.resolver"
import { shopApiExtensions } from "./api/shop-api-extensions"
import { ShopAnalyticsResolver } from "./api/shop.resolver"
import { configuration } from "./config/runtime-config"
import { DailyProductViewStat } from "./entities/daily-product-view-stat.entity"
import { DailyVisitorStat } from "./entities/daily-visitor-stat.entity"
import { VisitorEvent } from "./entities/visitor-event.entity"
import { VisitorSession } from "./entities/visitor-session.entity"

@VendurePlugin({
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [AdminAnalyticsResolver]
    },
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [ShopAnalyticsResolver]
    },
    compatibility: ">3.4.1",
    entities: [
        DailyProductViewStat,
        DailyVisitorStat,
        VisitorEvent,
        VisitorSession
    ],
    imports: [PluginCommonModule],
    providers: [],
    configuration
})
export class VisitorAnalyticsPlugin {
    static ui: AdminUiExtension = {
        id: "visitors-analytics",
        extensionPath: path.join(__dirname, "ui"),
        providers: ["providers.ts"],
        routes: [{ route: "visitors-analytics", filePath: "routes.ts" }]
    }
}
