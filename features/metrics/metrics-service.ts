import { SupabaseClient } from "@supabase/supabase-js"
import { Users, Bot, Activity, Instagram, Youtube, Play } from "lucide-react"
import { Metric, RawMetricRecord, MetricsData } from "./types"

export class MetricsService {
    constructor(private supabase: SupabaseClient) { }

    // Helper to calc growth
    private calcGrowth(curr: number, prev: number): string {
        if (prev === 0) return "+0%"
        const pct = ((curr - prev) / prev) * 100
        return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`
    }

    async getProjectData(projectSlug: string): Promise<{ id: string } | undefined> {
        const { data, error } = await this.supabase
            .from("projects")
            .select("id")
            .eq("slug", projectSlug)
            .maybeSingle()

        if (error) return undefined
        return data as { id: string } | undefined
    }

    async getActiveCampaign(projectId: string): Promise<{ id: string; name: string } | undefined> {
        const { data, error } = await this.supabase
            .from("campaigns")
            .select("id, name")
            .eq("project_id", projectId)
            .eq("status", "active")
            .limit(1)
            .maybeSingle()

        if (error) throw error
        return data as { id: string; name: string } | undefined
    }

    async getLatestMetrics(campaignId: string): Promise<Metric[]> {
        const { data, error } = await this.supabase
            .from("campaign_metrics")
            .select("*")
            .eq("campaign_id", campaignId)
            .order("snapshot_date", { ascending: false })
            .limit(2)

        if (error) throw error

        const snapshots = data as RawMetricRecord[]
        if (!snapshots || snapshots.length === 0) {
            return DEMO_MOCK_METRICS
        }

        // Fetch YouTube stats as well - using campaign_id to link back to project if needed
        // For now, simple fetch for the project's YouTube data
        const { data: campaignData } = await this.supabase
            .from("campaigns")
            .select("project_id")
            .eq("id", campaignId)
            .single()

        const { data: ytData } = await this.supabase
            .from("youtube_channels")
            .select("subscriber_count, view_count")
            .eq("project_id", (campaignData as any)?.project_id || "")
            .limit(1) as any
            
        const ytStats = ytData?.[0] || { subscriber_count: 0, view_count: 0 }

        const latest = snapshots[0]
        const previous = snapshots[1] || latest

        return [
            {
                id: "total_signups",
                label: "Total Signups (GHL)",
                value: latest.total_signups.toLocaleString(),
                growth: this.calcGrowth(latest.total_signups, previous.total_signups),
                icon: Users,
                color: "text-primary bg-primary/10",
            },
            {
                id: "app_installs",
                label: "Reader App Installs",
                value: latest.reader_app_installs.toLocaleString(),
                growth: this.calcGrowth(latest.reader_app_installs, previous.reader_app_installs),
                icon: Bot,
                color: "text-emerald-500 bg-emerald-500/10",
            },
            {
                id: "funnel_conversion",
                label: "Funnel Conv. Rate",
                value: `${latest.funnel_conversion_rate}%`,
                growth: this.calcGrowth(latest.funnel_conversion_rate, previous.funnel_conversion_rate),
                icon: Activity,
                color: "text-orange-500 bg-orange-500/10",
            },
            {
                id: "social_reach",
                label: "Total Social Reach",
                value: (latest.social_reach_total / 1000).toFixed(1) + "k",
                growth: this.calcGrowth(latest.social_reach_total, previous.social_reach_total),
                icon: Instagram,
                color: "text-pink-500 bg-pink-500/10",
            },
            {
                id: "youtube_subscribers",
                label: "YT Subscribers",
                value: ytStats.subscriber_count.toLocaleString(),
                growth: "+0.5%", // Placeholder for now
                icon: Youtube,
                color: "text-red-500 bg-red-500/10",
            },
            {
                id: "youtube_views",
                label: "YouTube Views",
                value: (ytStats.view_count / 1000).toFixed(1) + "k",
                growth: "+1.2%", // Placeholder for now
                icon: Play,
                color: "text-white bg-white/10",
            },
        ]
    }
}

export const DEMO_MOCK_METRICS: Metric[] = [
    {
        id: "total_signups",
        label: "Total Registrations",
        value: "4,822",
        growth: "+12%",
        icon: Users,
        color: "text-primary bg-primary/10",
    },
    {
        id: "app_installs",
        label: "Active System Users",
        value: "3,140",
        growth: "+24%",
        icon: Bot,
        color: "text-emerald-500 bg-emerald-500/10",
    },
    {
        id: "funnel_conversion",
        label: "Conversion Velocity",
        value: "65.1%",
        growth: "+4.2%",
        icon: Activity,
        color: "text-orange-500 bg-orange-500/10",
    },
    {
        id: "social_reach",
        label: "Total Social Reach",
        value: "82.4k",
        growth: "+115%",
        icon: Instagram,
        color: "text-pink-500 bg-pink-500/10",
    },
    {
        id: "youtube_subscribers",
        label: "YT Subscribers",
        value: "5",
        growth: "+20%",
        icon: Youtube,
        color: "text-red-500 bg-red-500/10",
    },
    {
        id: "youtube_views",
        label: "YouTube Views",
        value: "0.2k",
        growth: "+15%",
        icon: Play,
        color: "text-white bg-white/10",
    },
]
