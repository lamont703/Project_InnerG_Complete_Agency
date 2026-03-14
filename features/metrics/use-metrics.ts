import { useState, useEffect, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/browser"
import { MetricsService, DEMO_MOCK_METRICS } from "./metrics-service"
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
            if (!project) {
                console.warn(`[useMetrics] Project with slug "${projectSlug}" not found. Falling back to demo data.`)
                setMetrics(DEMO_MOCK_METRICS)
                setCampaignName("General Portfolio")
                return
            }

            const campaign = await metricsService.getActiveCampaign(project.id)
            if (!campaign) {
                setCampaignName("General Portfolio")
                const projectMetrics = await metricsService.getProjectLevelMetrics(project.id)
                setMetrics(projectMetrics)
                return
            }

            setCampaignName(campaign.name)
            const latestMetrics = await metricsService.getLatestMetrics(campaign.id)
            setMetrics(latestMetrics)
        } catch (err: any) {
            console.error("[useMetrics] Error:", err)
            setError("Failed to stream campaign metrics.")
            if (metrics.length === 0) {
                setMetrics(DEMO_MOCK_METRICS)
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
