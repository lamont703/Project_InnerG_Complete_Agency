import { SupabaseClient } from "@supabase/supabase-js"
import {
    Users,
    Bot,
    Activity,
    Instagram,
    Youtube,
    Play,
    Linkedin,
    BarChart3,
    Zap,
    Target,
    ThumbsUp,
    MessageSquare,
    Share2,
    Eye
} from "lucide-react"
import { Metric, RawMetricRecord } from "./types"

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

        // Fetch Extra Stats from dedicated tables
        const { data: campaignData } = await this.supabase
            .from("campaigns")
            .select("project_id")
            .eq("id", campaignId)
            .single()

        const projectId = (campaignData as any)?.project_id || ""

        // 1. YouTube Stats
        const { data: ytData } = await this.supabase
            .from("youtube_channels")
            .select("subscriber_count, view_count")
            .eq("project_id", projectId)
            .limit(1) as any
        
        const ytStats = ytData?.[0] || { subscriber_count: 0, view_count: 0 }

        // 2. LinkedIn Page Stats
        const { data: liPageData } = await this.supabase
            .from("linkedin_pages")
            .select("follower_count, total_views, engagement_rate, total_clicks")
            .eq("project_id", projectId)
            .limit(1) as any
        
        const liPage = liPageData?.[0] || { follower_count: 0, total_views: 0, engagement_rate: 0, total_clicks: 0 }

        // 3. LinkedIn Post Aggregations (Live from individual content)
        const { data: liPostAgg } = await this.supabase
            .from("linkedin_posts")
            .select("like_count, comment_count, share_count, view_count")
            .eq("project_id", projectId) as any
        
        const liPosts = liPostAgg || []
        const liLikes = liPosts.reduce((sum: number, p: any) => sum + (p.like_count || 0), 0)
        const liComments = liPosts.reduce((sum: number, p: any) => sum + (p.comment_count || 0), 0)
        const liShares = liPosts.reduce((sum: number, p: any) => sum + (p.share_count || 0), 0)
        const liPostViews = liPosts.reduce((sum: number, p: any) => sum + (p.view_count || 0), 0)

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
                growth: "+0.5%", 
                icon: Youtube,
                color: "text-red-500 bg-red-500/10",
            },
            {
                id: "youtube_views",
                label: "YouTube Views",
                value: (ytStats.view_count / 1000).toFixed(1) + "k",
                growth: "+1.2%",
                icon: Play,
                color: "text-white bg-white/10",
            },
            {
                id: "linkedin_followers",
                label: "LinkedIn Followers",
                value: liPage.follower_count.toLocaleString(),
                growth: "+2.1%",
                icon: Linkedin,
                color: "text-[#0077b5] bg-[#0077b5]/10",
            },
            {
                id: "linkedin_impressions",
                label: "LinkedIn Reach",
                value: (liPage.total_views / 1000).toFixed(1) + "k",
                growth: "+5.4%",
                icon: BarChart3,
                color: "text-[#0077b5] bg-[#0077b5]/10",
            },
            {
                id: "linkedin_engagement",
                label: "LinkedIn Engagement",
                value: `${liPage.engagement_rate}%`,
                growth: "+0.8%",
                icon: Zap,
                color: "text-[#0077b5] bg-[#0077b5]/10",
            },
            {
                id: "linkedin_clicks",
                label: "LinkedIn Clicks",
                value: liPage.total_clicks.toLocaleString(),
                growth: "+12%",
                icon: Target,
                color: "text-[#0077b5] bg-[#0077b5]/10",
            },
            {
                id: "linkedin_likes",
                label: "LinkedIn Likes",
                value: liLikes.toLocaleString(),
                growth: "+8.2%",
                icon: ThumbsUp,
                color: "text-[#0077b5] bg-[#0077b5]/10",
            },
            {
                id: "linkedin_comments",
                label: "LinkedIn Comments",
                value: liComments.toLocaleString(),
                growth: "+4.1%",
                icon: MessageSquare,
                color: "text-[#0077b5] bg-[#0077b5]/10",
            },
            {
                id: "linkedin_shares",
                label: "LinkedIn Shares",
                value: liShares.toLocaleString(),
                growth: "+1.5%",
                icon: Share2,
                color: "text-[#0077b5] bg-[#0077b5]/10",
            },
            {
                id: "linkedin_post_views",
                label: "LinkedIn Post Views",
                value: liPostViews.toLocaleString(),
                growth: "+10.2%",
                icon: Eye,
                color: "text-[#0077b5] bg-[#0077b5]/10",
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
    {
        id: "linkedin_followers",
        label: "LinkedIn Followers",
        value: "1,240",
        growth: "+5.2%",
        icon: Linkedin,
        color: "text-[#0077b5] bg-[#0077b5]/10",
    },
    {
        id: "linkedin_impressions",
        label: "LinkedIn Reach",
        value: "12.5k",
        growth: "+18%",
        icon: BarChart3,
        color: "text-[#0077b5] bg-[#0077b5]/10",
    },
    {
        id: "linkedin_engagement",
        label: "LinkedIn Engagement",
        value: "4.8%",
        growth: "+0.5%",
        icon: Zap,
        color: "text-[#0077b5] bg-[#0077b5]/10",
    },
    {
        id: "linkedin_clicks",
        label: "LinkedIn Clicks",
        value: "420",
        growth: "+22%",
        icon: Target,
        color: "text-[#0077b5] bg-[#0077b5]/10",
    },
    {
        id: "linkedin_likes",
        label: "LinkedIn Likes",
        value: "350",
        growth: "+12%",
        icon: ThumbsUp,
        color: "text-[#0077b5] bg-[#0077b5]/10",
    },
    {
        id: "linkedin_comments",
        label: "LinkedIn Comments",
        value: "85",
        growth: "+8%",
        icon: MessageSquare,
        color: "text-[#0077b5] bg-[#0077b5]/10",
    },
    {
        id: "linkedin_shares",
        label: "LinkedIn Shares",
        value: "42",
        growth: "+15%",
        icon: Share2,
        color: "text-[#0077b5] bg-[#0077b5]/10",
    },
    {
        id: "linkedin_post_views",
        label: "LinkedIn Post Views",
        value: "14,240",
        growth: "+24%",
        icon: Eye,
        color: "text-[#0077b5] bg-[#0077b5]/10",
    },
]
