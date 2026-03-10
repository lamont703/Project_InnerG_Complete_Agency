"use client"

import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMetrics } from "./use-metrics"
import { MetricCard } from "./components/MetricCard"
import { Metric } from "./types"

interface MetricsGridProps {
    projectSlug: string
    initialMetrics?: Metric[]
    readerCountThisWeek?: string
}

export function MetricsGrid({
    projectSlug,
    initialMetrics,
    readerCountThisWeek = "+1,240"
}: MetricsGridProps) {
    const {
        metrics,
        campaignName,
        isLoading,
        error
    } = useMetrics(projectSlug, initialMetrics)

    return (
        <div className="mb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <h2 className="text-xl md:text-2xl font-bold text-foreground line-clamp-1">
                            Campaign: {campaignName}
                        </h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Architecture Performance: Real-time Growth Snapshot
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="glass-panel px-3 py-2 rounded-xl flex-1 md:flex-none flex items-center gap-3 border-white/5 overflow-hidden">
                        <div className="flex -space-x-2 shrink-0">
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className="h-6 w-6 md:h-7 md:w-7 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[10px] font-bold"
                                >
                                    {String.fromCharCode(64 + i)}
                                </div>
                            ))}
                        </div>
                        <span className="text-[10px] md:text-xs font-medium text-muted-foreground truncate">
                            <span className="text-foreground font-bold">{readerCountThisWeek}</span> active readers
                        </span>
                    </div>
                    <Button
                        id="btn-export-report"
                        size="sm"
                        variant="outline"
                        className="border-white/10 hidden sm:flex shrink-0"
                    >
                        Export PDF
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="glass-panel h-32 animate-pulse rounded-2xl" />
                    ))}
                </div>
            ) : error ? (
                <div className="p-8 rounded-2xl bg-destructive/5 border border-destructive/10 text-center">
                    <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                    <p className="text-sm text-destructive">{error}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {metrics.map((stat, i) => (
                        <MetricCard key={`${stat.label}-${i}`} stat={stat} />
                    ))}
                </div>
            )}
        </div>
    )
}
