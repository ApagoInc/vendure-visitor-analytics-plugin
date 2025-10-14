import { registerDashboardWidget } from "@vendure/admin-ui/core"

export default [
    registerDashboardWidget("unique-visitors-chart", {
        title: "Unique Visitors",
        supportedWidths: [6, 8, 12],
        requiresPermissions: ["ReadAnalytics"],
        loadComponent: () =>
            import("./components/unique-visitors-chart.component").then(
                m => m.UniqueVisitorsChartComponent
            )
    }),
    registerDashboardWidget("top-products-chart", {
        title: "Most Viewed Products",
        supportedWidths: [6, 8, 12],
        requiresPermissions: ["ReadAnalytics"],
        loadComponent: () =>
            import("./components/top-products-chart.component").then(
                m => m.TopProductsChartComponent
            )
    })
]
