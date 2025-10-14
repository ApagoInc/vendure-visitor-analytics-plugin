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
    CategoryScale,
    Chart,
    ChartConfiguration,
    ChartOptions,
    Filler,
    LineController,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip
} from "chart.js"
import { gql } from "graphql-tag"
import { BaseChartDirective } from "ng2-charts"
import { Subject, of } from "rxjs"
import { catchError, finalize, map, take, takeUntil } from "rxjs/operators"

import {
    DateRangePreset,
    formatDateShort,
    getDateRange
} from "../utils/date-utils"

Chart.register(
    CategoryScale,
    Filler,
    LinearScale,
    LineController,
    LineElement,
    PointElement,
    Tooltip
)

interface VisitorDataPoint {
    date: string
    uniqueVisitors: number
}

interface ChartEntry {
    label: string
    value: number
}

interface GetVisitorTimeseriesResponse {
    analyticsVisitors: VisitorDataPoint[]
}

@Component({
    selector: "vdr-unique-visitors-chart",
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
                    [type]="'line'"
                ></canvas>

                <div *ngIf="loading" class="loading-overlay">Loading…</div>
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
                min-height: 250px;
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
        `
    ],
    standalone: true,
    imports: [SharedModule, BaseChartDirective],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UniqueVisitorsChartComponent implements OnInit, OnDestroy {
    @ViewChild(BaseChartDirective) chart?: BaseChartDirective

    private destroy$ = new Subject<void>()

    chartData: ChartConfiguration<"line">["data"] = {
        labels: [],
        datasets: [
            {
                label: "Unique Visitors",
                data: [],
                borderColor: "#3f51b5",
                backgroundColor: "rgba(63, 81, 181, 0.1)",
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: "#3f51b5",
                pointBorderColor: "#fff",
                pointBorderWidth: 2
            }
        ]
    }

    chartOptions: ChartOptions<"line"> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
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
                    title: context => context[0].label || "",
                    label: context => {
                        const value = context.parsed.y
                        return `${value} visitor${value !== 1 ? "s" : ""}`
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { precision: 0 },
                grid: { color: "rgba(0,0,0,0.05)" }
            },
            x: { grid: { display: false } }
        }
    }

    loading = false

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
        this.cdr.markForCheck()

        const range = getDateRange(this.selectedRange)

        this.dataService
            .query<GetVisitorTimeseriesResponse>(
                gql`
                    query GetVisitorTimeseries($range: DateRange!) {
                        analyticsVisitors(range: $range) {
                            date
                            uniqueVisitors
                        }
                    }
                `,
                { range }
            )
            .mapStream(res => res.analyticsVisitors)
            .pipe(
                take(1),
                map(visitors => {
                    const list = visitors ?? []
                    if (list.length === 0) {
                        return this.createZeroSeriesFromRange(
                            new Date(range.start),
                            new Date(range.end)
                        )
                    }
                    return list.map(v => {
                        const localYmd =
                            v.date.length > 10
                                ? this.toLocalYmd(new Date(v.date))
                                : v.date
                        return {
                            label: formatDateShort(localYmd),
                            value: v.uniqueVisitors
                        }
                    })
                }),
                catchError(err => {
                    console.error("GetVisitorTimeseries error", err)
                    const zeros = this.createZeroSeriesFromRange(
                        new Date(range.start),
                        new Date(range.end)
                    )
                    return of(zeros)
                }),
                finalize(() => {
                    this.loading = false
                    this.cdr.markForCheck()
                }),
                takeUntil(this.destroy$)
            )
            .subscribe(entries => {
                this.updateChartData(entries)
                this.cdr.markForCheck()
            })
    }

    private updateChartData(entries: ChartEntry[]) {
        this.chartData.labels = entries.map(e => e.label)
        this.chartData.datasets[0].data = entries.map(e => e.value)
        this.chart?.update()
    }

    private createZeroSeriesFromRange(start: Date, end: Date): ChartEntry[] {
        return this.eachDayInclusive(start, end).map(d => ({
            label: formatDateShort(this.toLocalYmd(d)),
            value: 0
        }))
    }

    private eachDayInclusive(start: Date, end: Date): Date[] {
        const days: Date[] = []
        const d = new Date(start)
        d.setHours(0, 0, 0, 0)
        const endCopy = new Date(end)
        endCopy.setHours(0, 0, 0, 0)
        while (d <= endCopy) {
            days.push(new Date(d))
            d.setDate(d.getDate() + 1)
        }
        return days
    }

    private toLocalYmd(d: Date): string {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, "0")
        const day = String(d.getDate()).padStart(2, "0")
        return `${y}-${m}-${day}`
    }
}
