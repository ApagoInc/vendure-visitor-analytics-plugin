export type DateRangePreset = "7days" | "30days" | "90days"

export interface DateRange {
    start: string
    end: string
}

/**
 * Get date range for a preset timeframe.
 * Returns dates in ISO 8601 DateTime format for Vendure's DateRange type.
 */
export function getDateRange(preset: DateRangePreset): DateRange {
    const end = new Date()
    end.setHours(23, 59, 59, 999)

    const start = new Date()
    start.setHours(0, 0, 0, 0)

    switch (preset) {
        case "7days":
            start.setDate(start.getDate() - 6) // 7 days including today
            break
        case "30days":
            start.setDate(start.getDate() - 29) // 30 days including today
            break
        case "90days":
            start.setDate(start.getDate() - 89) // 90 days including today
            break
    }

    return {
        start: start.toISOString(),
        end: end.toISOString()
    }
}

/**
 * Format date as YYYY-MM-DD (for display only, not for GraphQL queries)
 */
export function formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

/**
 * Format date for display (e.g., "Jan 15")
 */
export function formatDateShort(dateStr: string): string {
    const date = new Date(dateStr)
    const month = date.toLocaleDateString("en-US", { month: "short" })
    const day = date.getDate()
    return `${month} ${day}`
}
