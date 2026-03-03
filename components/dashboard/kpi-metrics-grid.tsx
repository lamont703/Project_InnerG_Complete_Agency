"use client"

import { useState, useEffect } from "react"
import { Users, Bot, Activity, Instagram, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/browser"
import type { KpiMetric } from "@/types"

interface KpiMetricsGridProps {
    campaignName?: string
    metrics?: KpiMetric[]
    projectSlug: string
    readerCountThisWeek?: string
}

/**
 * KPI Metrics Grid — Top-level campaign statistics.
 * 
 * Fetches real-time snapshots from campaign_metrics for the given project.
 */
export function KpiMetricsGrid({
    campaignName: initialCampaignName,
    metrics: initialMetrics,
    projectSlug,
    readerCountThisWeek = "+1,240",
}: KpiMetricsGridProps) {
    const [metrics, setMetrics] = useState<KpiMetric[]>(initialMetrics || [])
    const [campaignName, setCampaignName] = useState(initialCampaignName || "Loading...")
    const [isLoading, setIsLoading] = useState(!initialMetrics)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (initialMetrics) return // Already have data

        const fetchMetrics = async () => {
            try {
                const supabase = createBrowserClient()

                // 1. Get the active campaign for this project
                const { data: campaign, error: campaignError } = await supabase
                    .from("campaigns")
                    .select("id, name")
                    .eq("project_id", (
                        await supabase
                            .from("projects")
                            .select("id")
                            .eq("slug", projectSlug)
                            .single() as any
                    ).data?.id)
                    .eq("status", "active")
                    .single() as any

                if (campaignError || !campaign) {
                    setCampaignName("General Portfolio")
                    setIsLoading(false)
                    return
                }

                setCampaignName(campaign.name)

                // 2. Get the latest 2 snapshots to calculate growth
                const { data: snapshots, error: metricsError } = await supabase
                    .from("campaign_metrics")
                    .select("*")
                    .eq("campaign_id", campaign.id)
                    .order("snapshot_date", { ascending: false })
                    .limit(2) as any

                if (metricsError) throw metricsError

                if (!snapshots || snapshots.length === 0) {
                    setIsLoading(false)
                    return
                }

                const latest = snapshots[0]
                const previous = snapshots[1] || latest

                // Helper to calc growth
                const calcGrowth = (curr: number, prev: number) => {
                    if (prev === 0) return "+0%"
                    const pct = ((curr - prev) / prev) * 100
                    return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`
                }

                const mappedMetrics: KpiMetric[] = [
                    {
                        label: "Total Signups (GHL)",
                        value: latest.total_signups.toLocaleString(),
                        growth: calcGrowth(latest.total_signups, previous.total_signups),
                        icon: Users,
                        color: "text-primary bg-primary/10",
                    },
                    {
                        label: "Reader App Installs",
                        value: latest.reader_app_installs.toLocaleString(),
                        growth: calcGrowth(latest.reader_app_installs, previous.reader_app_installs),
                        icon: Bot,
                        color: "text-emerald-500 bg-emerald-500/10",
                    },
                    {
                        label: "Funnel Conv. Rate",
                        value: `${latest.funnel_conversion_rate}%`,
                        growth: calcGrowth(latest.funnel_conversion_rate, previous.funnel_conversion_rate),
                        icon: Activity,
                        color: "text-orange-500 bg-orange-500/10",
                    },
                    {
                        label: "Total Social Reach",
                        value: (latest.social_reach_total / 1000).toFixed(1) + "k",
                        growth: calcGrowth(latest.social_reach_total, previous.social_reach_total),
                        icon: Instagram,
                        color: "text-pink-500 bg-pink-500/10",
                    },
                ]

                setMetrics(mappedMetrics)
            } catch (err) {
                console.error("[KpiMetricsGrid] Error:", err)
                setError("Failed to stream campaign metrics.")
            } finally {
                setIsLoading(false)
            }
        }

        fetchMetrics()
    }, [projectSlug, initialMetrics])

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
                        <div key={i} className="glass-panel-strong rounded-2xl p-6 border border-white/5 transition-transform hover:scale-[1.02]">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2.5 rounded-lg ${stat.color}`}>
                                    <stat.icon className="h-5 w-5" />
                                </div>
                                <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stat.growth.startsWith("+")
                                        ? "bg-emerald-500/10 text-emerald-500"
                                        : "bg-destructive/10 text-destructive"
                                        }`}
                                >
                                    {stat.growth}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                {stat.label}
                            </p>
                            <h3 className="text-2xl font-bold text-foreground mt-1">{stat.value}</h3>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

/** Default mock metrics for Kane's Bookstore — Phase 1 demo data */
export const KANES_MOCK_METRICS: KpiMetric[] = [
    {
        label: "Total Signups (GHL)",
        value: "4,822",
        growth: "+12%",
        icon: Users,
        color: "text-primary bg-primary/10",
    },
    {
        label: "Reader App Installs",
        value: "3,140",
        growth: "+24%",
        icon: Bot,
        color: "text-emerald-500 bg-emerald-500/10",
    },
    {
        label: "Funnel Conv. Rate",
        value: "65.1%",
        growth: "+4.2%",
        icon: Activity,
        color: "text-orange-500 bg-orange-500/10",
    },
    {
        label: "Total IG Reach",
        value: "82.4k",
        growth: "+115%",
        icon: Instagram,
        color: "text-pink-500 bg-pink-500/10",
    },
]
