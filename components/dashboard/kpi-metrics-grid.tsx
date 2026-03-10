"use client"

import { MetricsGrid } from "@/features/metrics/MetricsGrid"

interface KpiMetricsGridProps {
    projectSlug: string
    campaignName?: string
    metrics?: any[]
    readerCountThisWeek?: string
}

/**
 * @deprecated Use @/features/metrics/MetricsGrid instead.
 * Wrapper for backward compatibility during the modular transition.
 */
export function KpiMetricsGrid({
    projectSlug,
    readerCountThisWeek
}: KpiMetricsGridProps) {
    return (
        <MetricsGrid
            projectSlug={projectSlug}
            readerCountThisWeek={readerCountThisWeek}
        />
    )
}
