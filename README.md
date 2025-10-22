![Banner Image](https://raw.githubusercontent.com/ApagoInc/vendure-visitor-analytics-plugin/refs/heads/main/assets/banner.jpg)
# Vendure Visitor Analytics Plugin

A comprehensive visitor analytics plugin for Vendure that tracks product views, visitor sessions, and provides detailed analytics dashboards in the admin UI.

## Features

- **Visitor Session Tracking**: Automatically tracks unique visitors using Vendure's built-in session management
- **Product View Analytics**: Tracks product views with deduplication (one view per product per session)
- **Real-time Dashboard**: Interactive charts and analytics in the Vendure Admin UI
- **Channel-Aware**: All analytics are scoped to specific channels
- **Scheduled Aggregation**: Automatic daily aggregation of raw events into optimized statistics
- **Customer Association**: Links visitor sessions to registered customers when available

## Analytics Widgets

The plugin provides two main dashboard widget components:

### Unique Visitors Chart
- Interactive line chart showing daily unique visitor trends
- Date range presets (7D, 30D, 90D)
- Real-time data visualization with Chart.js

### Top Products Chart
- Horizontal bar chart showing most viewed products
- Configurable limit (default: top 5 products)
- Product names with view counts

## Installation

1. **Install the Plugin Package:**

   ```bash
   npm install @apagoinc/vendure-visitor-analytics-plugin
   ```

2. **Configure the Plugin in Vendure:**

   Add the plugin to your Vendure configuration:

   ```typescript
   import { VisitorAnalyticsPlugin } from '@apagoinc/vendure-visitor-analytics-plugin';

   export const config = {
     // ... other configurations
     plugins: [
       VisitorAnalyticsPlugin.init({
         // Plugin options go here
       }),
       // ... other plugins
     ],
   };
   ```

3. **Generate Database Migrations:**

4. **Set Up Admin UI Extensions:**

Add the plugin's UI extensions to the `AdminUiPlugin` options in your `VendureConfig`.

```ts
import { compileUiExtensions } from "@vendure/ui-devkit/compiler"
   import { VisitorAnalyticsPlugin } from '@apagoinc/vendure-visitor-analytics-plugin';

export const config: VendureConfig = {
    // ...
    plugins: [
        // ...
        AdminUiPlugin.init({
            //
            app: compileUiExtensions({
                outputPath: path.join(__dirname, "admin-ui"),
                extensions: [
                    VisitorAnalyticsPlugin.ui
                ]
            })
        })
    ]
}
```

## Configuration

The plugin includes a scheduled task that runs every 30 minutes to aggregate analytics data:


## Usage

### Tracking Product Views (Shop API)

From your storefront, track product views using the GraphQL mutation:

```graphql
mutation TrackProductView($input: TrackProductViewInput!) {
  trackProductView(input: $input) {
    success
  }
}
```

Variables:
```json
{
  "input": {
    "productId": "1"
  }
}
```

## Permissions

The plugin adds a custom permission:
- `ReadAnalytics`: Required to view analytics data in the admin UI

## License

This plugin is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue on the [GitHub repository](https://github.com/ApagoInc/vendure-visitor-analytics-plugin/issues).