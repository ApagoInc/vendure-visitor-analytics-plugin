import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit,
    ViewChild
} from "@angular/core"
import { DataService, SharedModule } from "@vendure/admin-ui/core"
import {
    BarController,
    BarElement,
    CategoryScale,
    Chart,
    ChartConfiguration,
    ChartOptions,
    Legend,
    LinearScale,
    Tooltip
} from "chart.js"
import { gql } from "graphql-tag"
import { BaseChartDirective } from "ng2-charts"
import { Subject, of } from "rxjs"
import { catchError, finalize, map, take, takeUntil } from "rxjs/operators"

import { DateRangePreset, getDateRange } from "../utils/date-utils"

Chart.register(
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend
)

interface ProductViewStat {
    productId: string
    name: string | null
    views: number
}

interface ChartEntry {
    label: string
    value: number
}

interface GetTopProductsResponse {
    analyticsTopProducts: ProductViewStat[]
}

type BarPoint = { x: number; y: string }

@Component({
    selector: "vdr-top-products-chart",
    template: `
        <div class="widget-container">
            <div class="date-range-selector">
                <button
                    *ngFor="let preset of datePresets"
                    class="btn btn-sm"
                    [class.btn-primary]="selectedRange === preset.value"
                    [class.btn-secondary]="selectedRange !== preset.value"
                    (click)="selectDateRange(preset.value)"
                >
                    {{ preset.label }}
                </button>
            </div>

            <div class="chart-container">
                <canvas
                    baseChart
                    [data]="chartData"
                    [options]="chartOptions"
                    [type]="'bar'"
                ></canvas>

                <div *ngIf="loading" class="loading-overlay">Loading…</div>
                <div *ngIf="!loading && isEmpty" class="empty-state">
                    No product views in this period
                </div>
            </div>
        </div>
    `,
    styles: [
        `
            .widget-container {
                padding: 0;
                height: 100%;
            }
            .date-range-selector {
                padding: 12px 16px;
                border-bottom: 1px solid #e0e0e0;
                display: flex;
                gap: 8px;
                background: #f9f9f9;
            }
            .date-range-selector .btn {
                font-size: 12px;
                padding: 4px 12px;
            }
            .chart-container {
                padding: 20px;
                position: relative;
                min-height: 300px;
            }
            .loading-overlay {
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.6);
                font-size: 14px;
            }
            .empty-state {
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #999;
                font-size: 14px;
            }
        `
    ],
    standalone: true,
    imports: [SharedModule, BaseChartDirective],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopProductsChartComponent implements OnInit, OnDestroy {
    @ViewChild(BaseChartDirective) chart?: BaseChartDirective

    private destroy$ = new Subject<void>()

    chartData: ChartConfiguration<"bar", BarPoint[]>["data"] = {
        labels: [],
        datasets: [
            {
                label: "Product Views",
                data: [],
                parsing: { xAxisKey: "x", yAxisKey: "y" },
                backgroundColor: "#3f51b5",
                borderColor: "#2c3e8f",
                borderWidth: 1
            }
        ]
    }

    chartOptions: ChartOptions<"bar"> = {
        indexAxis: "y", // Horizontal bars
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: true,
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                titleColor: "#fff",
                bodyColor: "#fff",
                borderColor: "#3f51b5",
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                callbacks: {
                    title: ctx =>
                        (ctx[0]?.raw as BarPoint)?.y ?? ctx[0]?.label ?? "",
                    label: ctx => {
                        const val = (ctx.raw as BarPoint)?.x ?? ctx.parsed.x
                        return `${val} view${val !== 1 ? "s" : ""}`
                    }
                }
            }
        },
        scales: {
            x: {
                beginAtZero: true,
                ticks: { precision: 0 },
                grid: { color: "rgba(0,0,0,0.05)" }
            },
            y: { grid: { display: false } }
        }
    }

    loading = false
    isEmpty = false

    selectedRange: DateRangePreset = "30days"
    datePresets = [
        { label: "7D", value: "7days" as DateRangePreset },
        { label: "30D", value: "30days" as DateRangePreset },
        { label: "90D", value: "90days" as DateRangePreset }
    ]

    constructor(
        private dataService: DataService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.loadData()
    }

    ngOnDestroy() {
        this.destroy$.next()
        this.destroy$.complete()
    }

    selectDateRange(preset: DateRangePreset) {
        if (this.selectedRange === preset) return
        this.selectedRange = preset
        this.loadData()
    }

    private loadData() {
        this.loading = true
        this.isEmpty = false
        this.cdr.markForCheck()

        const range = getDateRange(this.selectedRange)
        const limit = 5

        this.dataService
            .query<GetTopProductsResponse>(
                gql`
                    query GetTopProducts($range: DateRange!, $limit: Int!) {
                        analyticsTopProducts(range: $range, limit: $limit) {
                            productId
                            name
                            views
                        }
                    }
                `,
                { range, limit }
            )
            .mapStream(res => res.analyticsTopProducts)
            .pipe(
                take(1),
                map(products => {
                    const list = products ?? []
                    return list.map<BarPoint>(p => ({
                        y: p.name || `Product #${p.productId}`,
                        x: p.views
                    }))
                }),
                catchError(err => {
                    console.error("GetTopProducts error", err)
                    return of<BarPoint[]>([])
                }),
                finalize(() => {
                    this.loading = false
                    this.cdr.markForCheck()
                }),
                takeUntil(this.destroy$)
            )
            .subscribe(points => {
                this.isEmpty = points.length === 0
                this.chartData.datasets[0].data = points
                this.chartData.labels = []
                this.chart?.update()
                this.cdr.markForCheck()
            })
    }

    private updateChartData(entries: ChartEntry[]) {
        const points: BarPoint[] = entries.map(e => ({
            x: e.value,
            y: e.label
        }))
        this.chartData.datasets[0].data = points
        this.chartData.labels = []
        this.chart?.update()
    }
}
