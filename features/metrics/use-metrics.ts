import { useState, useEffect, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/browser"
import { MetricsService, KANES_MOCK_METRICS } from "./metrics-service"
import { Metric } from "./types"

export function useMetrics(projectSlug: string, initialMetrics?: Metric[]) {
    const [metrics, setMetrics] = useState<Metric[]>(initialMetrics || [])
    const [campaignName, setCampaignName] = useState("General Portfolio")
    const [isLoading, setIsLoading] = useState(!initialMetrics)
    const [error, setError] = useState<string | null>(null)

    const [supabase] = useState(() => createBrowserClient())
    const [metricsService] = useState(() => new MetricsService(supabase))

    const fetchMetrics = useCallback(async () => {
        if (initialMetrics) return

        try {
            setIsLoading(true)
            const project = await metricsService.getProjectData(projectSlug)
            if (!project) throw new Error("Project not found")

            const campaign = await metricsService.getActiveCampaign(project.id)
            if (!campaign) {
                setCampaignName("General Portfolio")
                setMetrics(KANES_MOCK_METRICS)
                return
            }

            setCampaignName(campaign.name)
            const latestMetrics = await metricsService.getLatestMetrics(campaign.id)
            setMetrics(latestMetrics)
        } catch (err: any) {
            console.error("[useMetrics] Error:", err)
            setError("Failed to stream campaign metrics.")
            if (metrics.length === 0) {
                setMetrics(KANES_MOCK_METRICS)
            }
        } finally {
            setIsLoading(false)
        }
    }, [projectSlug, metricsService, initialMetrics])

    useEffect(() => {
        fetchMetrics()
    }, [fetchMetrics])

    return {
        metrics,
        campaignName,
        isLoading,
        error,
        refresh: fetchMetrics
    }
}
