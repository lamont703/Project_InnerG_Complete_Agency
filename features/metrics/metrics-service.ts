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
    Eye,
    Video,
    UserSquare2,
    ExternalLink,
    CheckCircle2,
    Music,
    Heart,
    UserSearch
} from "lucide-react"


import { Metric, RawMetricRecord } from "./types"
import { getIcon } from "./utils/icon-map"

export class MetricsService {
    constructor(private supabase: SupabaseClient) { }

    private async getKnowledgeAggregates(projectId: string) {
        const { data: knowledge, error } = await this.supabase
            .from("project_knowledge")
            .select("tags, body")
            .eq("project_id", projectId);

        if (error || !knowledge) return null;

        let activeReaders = 0;
        let totalSales = 0;
        let orderCount = 0;
        let inventoryValue = 0;

        for (const item of knowledge) {
            const tags = item.tags || [];
            const body = item.body || "";
            
            const jsonStart = body.indexOf('{');
            const jsonEnd = body.lastIndexOf('}');
            if (jsonStart === -1 || jsonEnd === -1) continue;
            
            try {
                const data = JSON.parse(body.substring(jsonStart, jsonEnd + 1));
                
                if (tags.includes("users")) {
                    activeReaders++;
                } else if (tags.includes("orders")) {
                    orderCount++;
                    totalSales += (Number(data.total) || 0);
                } else if (tags.includes("book_variants")) {
                    inventoryValue += (Number(data.price) || 0);
                }
            } catch (e) { /* ignore parse errors */ }
        }

        const avgOrderValue = orderCount > 0 ? totalSales / orderCount : 0;

        return { activeReaders, totalSales, orderCount, inventoryValue, avgOrderValue };
    }

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

        // 1. Fetch Campaign / Project context first
        const { data: campaignData } = await this.supabase
            .from("campaigns")
            .select("project_id")
            .eq("id", campaignId)
            .single()

        const projectId = (campaignData as any)?.project_id || ""

        const snapshots = (data as RawMetricRecord[]) || []
        
        // If NO snapshots AND NO project, fallback to demo.
        // Otherwise, if we have a project, continue to fetch real stats (YouTube, TikTok, etc.)
        if (snapshots.length === 0 && !projectId) {
            return DEMO_MOCK_METRICS
        }

        const latest = snapshots[0] || {
            total_signups: 0,
            reader_app_installs: 0,
            funnel_conversion_rate: 0,
            social_reach_total: 0
        }
        const previous = snapshots[1] || latest

        // 1. YouTube Stats
        const { data: ytData } = await this.supabase
            .from("youtube_channels")
            .select("subscriber_count, view_count, video_count")
            .eq("project_id", projectId)
            .limit(1) as any
        
        const ytStats = ytData?.[0] || { subscriber_count: 0, view_count: 0, video_count: 0 }

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

        // 4. Instagram Stats
        const { data: igAccData } = await this.supabase
            .from("instagram_accounts")
            .select("follower_count, media_count")
            .eq("project_id", projectId)
            .limit(1) as any
        
        const igAcc = igAccData?.[0] || { follower_count: 0, media_count: 0 }

        const { data: igMediaData } = await this.supabase
            .from("instagram_media")
            .select("like_count, comments_count, reach, impressions, video_views, saves")
            .eq("project_id", projectId) as any
        
        const igMedia = igMediaData || []
        const igLikes = igMedia.reduce((sum: number, m: any) => sum + (m.like_count || 0), 0)
        const igComments = igMedia.reduce((sum: number, m: any) => sum + (m.comments_count || 0), 0)
        const igSaves = igMedia.reduce((sum: number, m: any) => sum + (m.saves || 0), 0)
        const igVideoViews = igMedia.reduce((sum: number, m: any) => sum + (m.video_views || 0), 0)
        const igReachTotal = igMedia.reduce((sum: number, m: any) => sum + (m.reach || 0), 0)
        const igImpressionsTotal = igMedia.reduce((sum: number, m: any) => sum + (m.impressions || 0), 0)
        const igEngagement = igMedia.length > 0 ? (igLikes + igComments + igSaves) / igMedia.length : 0
        const igInteractions = igLikes + igComments + igSaves

        // 5. Profile-level Activity (from snapshots)
        const { data: snapshotData } = await this.supabase
            .from("project_metrics_snapshots")
            .select("metrics_payload")
            .eq("project_id", projectId)
            .order("snapshot_date", { ascending: false })
            .limit(1)
            .maybeSingle();
        
        const igProfileViews = (snapshotData as any)?.metrics_payload?.instagram_profile_views || 0;
        const igWebsiteClicks = (snapshotData as any)?.metrics_payload?.instagram_website_clicks || 0;

        // 6. TikTok Stats
        const { data: ttAccData } = await this.supabase
            .from("tiktok_accounts")
            .select("follower_count, heart_count, video_count")
            .eq("project_id", projectId)
            .limit(1) as any
        
        const ttAcc = ttAccData?.[0] || { follower_count: 0, heart_count: 0, video_count: 0 }

        const { data: ttVideoData } = await this.supabase
            .from("tiktok_videos")
            .select("view_count, like_count, comment_count, share_count")
            .eq("project_id", projectId) as any
        
        const ttVideos = ttVideoData || []
        
        // Use Number() for numeric safety with BIGINT columns from Postgres
        const ttViews = ttVideos.reduce((sum: number, v: any) => sum + Number(v.view_count || 0), 0)
        const ttLikes = ttVideos.reduce((sum: number, v: any) => sum + Number(v.like_count || 0), 0)

        console.log(`[MetricsService] getLatestMetrics: project=${projectId}, ttAccs=${ttAccData?.length || 0}, ttVideos=${ttVideos.length}, totalViews=${ttViews}`)

        // 7. Pixel Stats
        const [pixelHits, pixelVisitors] = await Promise.all([
            this.supabase.from("pixel_events").select("*", { count: "exact", head: true }).eq("project_id", projectId),
            this.supabase.from("pixel_visitors").select("*").eq("project_id", projectId)
        ]) as any

        const totalHits = pixelHits.count || 0
        const visitors = pixelVisitors.data || []
        const identifiedCount = visitors.filter((v: any) => 
            v.email || 
            v.full_name || 
            (v.identity_metadata && Object.keys(v.identity_metadata).length > 0)
        ).length

        const metrics: Metric[] = [
            {
                id: "total_signups",
                label: "Total Signups (GHL)",
                value: latest.total_signups.toLocaleString(),
                growth: this.calcGrowth(latest.total_signups, previous.total_signups),
                icon: Users,
                color: "text-primary bg-primary/10",
            },
            {
                id: "pixel_total_pings",
                label: "Website Hits",
                value: totalHits.toLocaleString(),
                growth: "+100%",
                icon: Activity,
                color: "text-blue-500 bg-blue-500/10",
            },
            {
                id: "pixel_unique_visitors",
                label: "Unique Visitors",
                value: visitors.length.toLocaleString(),
                growth: "+100%",
                icon: Users,
                color: "text-indigo-500 bg-indigo-500/10",
            },
            {
                id: "pixel_identified_count",
                label: "Identified Leads",
                value: identifiedCount.toLocaleString(),
                growth: "+100%",
                icon: UserSearch,
                color: "text-emerald-500 bg-emerald-500/10",
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
                value: ((Number(latest.social_reach_total) + ttViews) / 1000).toFixed(1) + "k",
                growth: this.calcGrowth(Number(latest.social_reach_total) + ttViews, Number(previous.social_reach_total) + ttViews),
                icon: Zap,
                color: "text-emerald-500 bg-emerald-500/10",
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
                id: "youtube_video_count",
                label: "YouTube Videos",
                value: ytStats.video_count.toLocaleString(),
                growth: "+0%",
                icon: Video,
                color: "text-red-400 bg-red-400/10",
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
            {
                id: "instagram_followers",
                label: "Instagram Followers",
                value: igAcc.follower_count.toLocaleString(),
                growth: "+3.4%",
                icon: Instagram,
                color: "text-pink-500 bg-pink-500/10",
            },
            {
                id: "instagram_reach",
                label: "Instagram Reach",
                value: igReachTotal.toLocaleString(),
                growth: "+12%",
                icon: BarChart3,
                color: "text-pink-500 bg-pink-500/10",
            },
            {
                id: "instagram_engagement",
                label: "Instagram Engagement",
                value: igEngagement.toFixed(1),
                growth: "+0.5%",
                icon: Zap,
                color: "text-pink-500 bg-pink-500/10",
            },
            {
                id: "instagram_profile_views",
                label: "IG Profile Views",
                value: igProfileViews.toLocaleString(),
                growth: "+2.1%",
                icon: UserSquare2,
                color: "text-pink-500 bg-pink-500/10",
            },
            {
                id: "instagram_website_clicks",
                label: "IG Website Clicks",
                value: igWebsiteClicks.toLocaleString(),
                growth: "+1.5%",
                icon: ExternalLink,
                color: "text-pink-500 bg-pink-500/10",
            },
            {
                id: "instagram_post_views",
                label: "IG Video Views",
                value: igVideoViews.toLocaleString(),
                growth: "+8.4%",
                icon: Eye,
                color: "text-pink-500 bg-pink-500/10",
            },
            {
                id: "instagram_interactions",
                label: "IG Interactions",
                value: igInteractions.toLocaleString(),
                growth: "+5.1%",
                icon: Zap,
                color: "text-pink-500 bg-pink-500/10",
            },
            {
                id: "instagram_post_success",
                label: "Automation Status",
                value: "Active",
                growth: "100%",
                icon: CheckCircle2,
                color: "text-emerald-500 bg-emerald-500/10",
            },
            {
                id: "tiktok_followers",
                label: "TikTok Followers",
                value: ttAcc.follower_count.toLocaleString(),
                growth: "+0%",
                icon: Music,
                color: "text-pink-400 bg-pink-400/10",
            },
            {
                id: "tiktok_views",
                label: "TikTok Views",
                value: ttViews.toLocaleString(),
                growth: "+0%",
                icon: Play,
                color: "text-pink-500 bg-pink-500/10",
            },
            {
                id: "tiktok_likes",
                label: "TikTok Likes",
                value: ttLikes.toLocaleString(),
                growth: "+0%",
                icon: Heart,
                color: "text-rose-500 bg-rose-500/10",
            },


            {
                id: "freelancer_registrations",
                label: "Freelancer Freedom",
                value: "...", // Will be updated by live query below
                growth: "+4.5%",
                icon: Users,
                color: "text-amber-500 bg-amber-500/10",
            }
        ]

        // --- KANE'S BOOKSTORE SPECIFIC DATA (MOCK/LIVE HYBRID) ---
        const { data: project } = await this.supabase
            .from("projects")
            .select("slug, name")
            .eq("id", projectId)
            .single()

        if (project?.slug === 'kanes-bookstore' || project?.name?.toLowerCase().includes('kane')) {
            const aggregates = await this.getKnowledgeAggregates(projectId);
            if (aggregates) {
                metrics.push(
                    {
                        id: "bookstore_inventory_value",
                        label: "Inventory Asset Value",
                        value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(aggregates.inventoryValue),
                        growth: "+2.4%",
                        icon: getIcon("HardDrive"),
                        color: "text-blue-500 bg-blue-500/10",
                    },
                    {
                        id: "active_readers",
                        label: "Active Reader Base",
                        value: aggregates.activeReaders.toLocaleString(),
                        growth: "+12.5%",
                        icon: getIcon("BookOpen"),
                        color: "text-emerald-500 bg-emerald-500/10",
                    },
                    {
                        id: "monthly_book_sales",
                        label: "Monthly Sales Velocity",
                        value: aggregates.totalSales.toLocaleString(),
                        growth: "+5.2%",
                        icon: getIcon("TrendingUp"),
                        color: "text-orange-500 bg-orange-500/10",
                    },
                    {
                        id: "bookstore_total_orders",
                        label: "Total Orders",
                        value: aggregates.orderCount.toLocaleString(),
                        growth: "+8.1%",
                        icon: getIcon("ShoppingBag"),
                        color: "text-purple-500 bg-purple-500/10",
                    },
                    {
                        id: "bookstore_total_sales_value",
                        label: "Total Order Value",
                        value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(aggregates.totalSales),
                        growth: "+4.2%",
                        icon: getIcon("DollarSign"),
                        color: "text-emerald-500 bg-emerald-500/10",
                    },
                    {
                        id: "bookstore_avg_order_value",
                        label: "Average Order Value",
                        value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(aggregates.avgOrderValue),
                        growth: "+1.5%",
                        icon: getIcon("Calculator"),
                        color: "text-indigo-500 bg-indigo-500/10",
                    }
                )
            }
        }

        // Fetch Pipeline Specific Stats
        const { data: freelancerPipe } = await this.supabase
            .from("ghl_pipelines")
            .select("id")
            .eq("name", "School of Freelancer Freedom Pipeline")
            .maybeSingle()
        
        if (freelancerPipe) {
            const { count } = await this.supabase
                .from("ghl_opportunities")
                .select("*", { count: "exact", head: true })
                .eq("pipeline_id", (freelancerPipe as any).id)
            
            const freelancerMetric = metrics.find(m => m.id === "freelancer_registrations")
            if (freelancerMetric) {
                freelancerMetric.value = (count ?? 0).toLocaleString()
            }
        }
        return metrics
    }

    async getProjectLevelMetrics(projectId: string): Promise<Metric[]> {
        // Fetch Platform Stats
        const [ytData, liPageData, liPostAgg, ttAccData, ttVideoData] = await Promise.all([
            this.supabase.from("youtube_channels").select("subscriber_count, view_count, video_count").eq("project_id", projectId).limit(1),
            this.supabase.from("linkedin_pages").select("follower_count, total_views, engagement_rate, total_clicks").eq("project_id", projectId).limit(1),
            this.supabase.from("linkedin_posts").select("like_count, comment_count, share_count, view_count").eq("project_id", projectId),
            this.supabase.from("tiktok_accounts").select("follower_count, heart_count, video_count").eq("project_id", projectId).limit(1),
            this.supabase.from("tiktok_videos").select("view_count, like_count, comment_count, share_count").eq("project_id", projectId)
        ]) as any


        const ytStats = ytData?.data?.[0] || { subscriber_count: 0, view_count: 0, video_count: 0 }
        const liPage = liPageData?.data?.[0] || { follower_count: 0, total_views: 0, engagement_rate: 0, total_clicks: 0 }
        const liPosts = liPostAgg?.data || []
        
        const liLikes = liPosts.reduce((sum: number, p: any) => sum + (p.like_count || 0), 0)
        const liComments = liPosts.reduce((sum: number, p: any) => sum + (p.comment_count || 0), 0)
        const liShares = liPosts.reduce((sum: number, p: any) => sum + (p.share_count || 0), 0)
        const liPostViews = liPosts.reduce((sum: number, p: any) => sum + (p.view_count || 0), 0)

        const ttAcc = ttAccData?.data?.[0] || { follower_count: 0, heart_count: 0, video_count: 0 }
        const ttVideos = ttVideoData?.data || []
        
        // Use Number() for numeric safety with BIGINT columns from Postgres
        const ttViews = ttVideos.reduce((sum: number, v: any) => sum + Number(v.view_count || 0), 0)
        const ttLikes = ttVideos.reduce((sum: number, v: any) => sum + Number(v.like_count || 0), 0)

        console.log(`[MetricsService] getProjectLevelMetrics: project=${projectId}, ttAcc=${ttAccData?.data?.length || 0}, ttVideos=${ttVideos.length}, totalViews=${ttViews}`)


        // 4. Instagram Stats
        const [igAccData, igMediaData, snapshotData, pixelHits, pixelVisitors] = await Promise.all([
            this.supabase.from("instagram_accounts").select("follower_count, media_count").eq("project_id", projectId).limit(1),
            this.supabase.from("instagram_media").select("like_count, comments_count, reach, impressions, video_views, saves").eq("project_id", projectId),
            this.supabase.from("project_metrics_snapshots").select("metrics_payload").eq("project_id", projectId).order("snapshot_date", { ascending: false }).limit(1).maybeSingle(),
            this.supabase.from("pixel_events").select("*", { count: "exact", head: true }).eq("project_id", projectId),
            this.supabase.from("pixel_visitors").select("*").eq("project_id", projectId)
        ]) as any
        
        const igAcc = igAccData?.data?.[0] || { follower_count: 0, media_count: 0 }
        const igMedia = igMediaData?.data || []
        const igLikes = igMedia.reduce((sum: number, m: any) => sum + (m.like_count || 0), 0)
        const igComments = igMedia.reduce((sum: number, m: any) => sum + (m.comments_count || 0), 0)
        const igSaves = igMedia.reduce((sum: number, m: any) => sum + (m.saves || 0), 0)
        const igVideoViews = igMedia.reduce((sum: number, m: any) => sum + (m.video_views || 0), 0)
        const igReachTotal = igMedia.reduce((sum: number, m: any) => sum + (m.reach || 0), 0)
        const igEngagement = igMedia.length > 0 ? (igLikes + igComments + igSaves) / igMedia.length : 0
        const igInteractions = igLikes + igComments + igSaves

        const igProfileViews = (snapshotData as any)?.data?.metrics_payload?.instagram_profile_views || 0;
        const igWebsiteClicks = (snapshotData as any)?.data?.metrics_payload?.instagram_website_clicks || 0;

        // Pixel aggregates
        const totalHits = pixelHits.count || 0
        const visitors = pixelVisitors.data || []
        const identifiedCount = visitors.filter((v: any) => 
            v.email || 
            v.full_name || 
            (v.identity_metadata && Object.keys(v.identity_metadata).length > 0)
        ).length

        const metrics: Metric[] = [
            {
                id: "social_reach",
                label: "Omni-Channel Reach",
                value: ((Number(liPage.total_views) + Number(igReachTotal) + Number(ttViews)) / 1000).toFixed(1) + "k",
                growth: "+0%",
                icon: Zap,
                color: "text-emerald-500 bg-emerald-500/10",
            },

            {
                id: "youtube_subscribers",
                label: "YT Subscribers",
                value: ytStats.subscriber_count.toLocaleString(),
                growth: "+0%",
                icon: Youtube,
                color: "text-red-500 bg-red-500/10",
            },
            {
                id: "youtube_views",
                label: "YouTube Views",
                value: (ytStats.view_count / 1000).toFixed(1) + "k",
                growth: "+0%",
                icon: Play,
                color: "text-white bg-white/10",
            },
            {
                id: "youtube_video_count",
                label: "YouTube Videos",
                value: ytStats.video_count.toLocaleString(),
                growth: "+0%",
                icon: Video,
                color: "text-red-400 bg-red-400/10",
            },
            {
                id: "linkedin_followers",
                label: "LinkedIn Followers",
                value: liPage.follower_count.toLocaleString(),
                growth: "+0%",
                icon: Linkedin,
                color: "text-[#0077b5] bg-[#0077b5]/10",
            },
            {
                id: "linkedin_impressions",
                label: "LinkedIn Reach",
                value: (liPage.total_views / 1000).toFixed(1) + "k",
                growth: "+0%",
                icon: BarChart3,
                color: "text-[#0077b5] bg-[#0077b5]/10",
            },
            {
                id: "linkedin_engagement",
                label: "LinkedIn Engagement",
                value: `${liPage.engagement_rate}%`,
                growth: "+0%",
                icon: Zap,
                color: "text-[#0077b5] bg-[#0077b5]/10",
            },
            {
                id: "linkedin_clicks",
                label: "LinkedIn Clicks",
                value: liPage.total_clicks.toLocaleString(),
                growth: "+0%",
                icon: Target,
                color: "text-[#0077b5] bg-[#0077b5]/10",
            },
            {
                id: "linkedin_likes",
                label: "LinkedIn Likes",
                value: liLikes.toLocaleString(),
                growth: "+0%",
                icon: ThumbsUp,
                color: "text-[#0077b5] bg-[#0077b5]/10",
            },
            {
                id: "linkedin_comments",
                label: "LinkedIn Comments",
                value: liComments.toLocaleString(),
                growth: "+0%",
                icon: MessageSquare,
                color: "text-[#0077b5] bg-[#0077b5]/10",
            },
            {
                id: "linkedin_shares",
                label: "LinkedIn Shares",
                value: liShares.toLocaleString(),
                growth: "+0%",
                icon: Share2,
                color: "text-[#0077b5] bg-[#0077b5]/10",
            },
            {
                id: "linkedin_post_views",
                label: "LinkedIn Post Views",
                value: liPostViews.toLocaleString(),
                growth: "+0%",
                icon: Eye,
                color: "text-[#0077b5] bg-[#0077b5]/10",
            },
            {
                id: "instagram_followers",
                label: "Instagram Followers",
                value: igAcc.follower_count.toLocaleString(),
                growth: "+0%",
                icon: Instagram,
                color: "text-pink-500 bg-pink-500/10",
            },
            {
                id: "instagram_reach",
                label: "Instagram Reach",
                value: igReachTotal.toLocaleString(),
                growth: "+0%",
                icon: BarChart3,
                color: "text-pink-500 bg-pink-500/10",
            },
            {
                id: "instagram_engagement",
                label: "Instagram Engagement",
                value: igEngagement.toFixed(1),
                growth: "+0%",
                icon: Zap,
                color: "text-pink-500 bg-pink-500/10",
            },
            {
                id: "instagram_profile_views",
                label: "IG Profile Views",
                value: igProfileViews.toLocaleString(),
                growth: "+0%",
                icon: UserSquare2,
                color: "text-pink-500 bg-pink-500/10",
            },
            {
                id: "instagram_website_clicks",
                label: "IG Website Clicks",
                value: igWebsiteClicks.toLocaleString(),
                growth: "+0%",
                icon: ExternalLink,
                color: "text-pink-500 bg-pink-500/10",
            },
            {
                id: "instagram_post_views",
                label: "IG Video Views",
                value: igVideoViews.toLocaleString(),
                growth: "+0%",
                icon: Eye,
                color: "text-pink-500 bg-pink-500/10",
            },
            {
                id: "instagram_interactions",
                label: "IG Interactions",
                value: igInteractions.toLocaleString(),
                growth: "+0%",
                icon: Zap,
                color: "text-pink-500 bg-pink-500/10",
            },
            {
                id: "instagram_post_success",
                label: "Automation Status",
                value: "Active",
                growth: "100%",
                icon: CheckCircle2,
                color: "text-emerald-500 bg-emerald-500/10",
            },
            {
                id: "tiktok_followers",
                label: "TikTok Followers",
                value: ttAcc.follower_count.toLocaleString(),
                growth: "+0%",
                icon: Music,
                color: "text-pink-400 bg-pink-400/10",
            },
            {
                id: "tiktok_views",
                label: "TikTok Views",
                value: ttViews.toLocaleString(),
                growth: "+0%",
                icon: Play,
                color: "text-pink-500 bg-pink-500/10",
            },
            {
                id: "tiktok_likes",
                label: "TikTok Likes",
                value: ttLikes.toLocaleString(),
                growth: "+0%",
                icon: Heart,
                color: "text-rose-500 bg-rose-500/10",
            },
            {
                id: "pixel_total_pings",
                label: "Website Hits",
                value: totalHits.toLocaleString(),
                growth: "+100%", // Start at 100% since it's new
                icon: Activity,
                color: "text-blue-500 bg-blue-500/10",
            },
            {
                id: "pixel_unique_visitors",
                label: "Unique Visitors",
                value: visitors.length.toLocaleString(),
                growth: "+100%",
                icon: Users,
                color: "text-indigo-500 bg-indigo-500/10",
            },
            {
                id: "pixel_identified_count",
                label: "Identified Leads",
                value: identifiedCount.toLocaleString(),
                growth: "+100%",
                icon: UserSearch,
                color: "text-emerald-500 bg-emerald-500/10",
            }
        ]


        // --- KANE'S BOOKSTORE SPECIFIC DATA ---
        const { data: project } = await this.supabase
            .from("projects")
            .select("slug, name")
            .eq("id", projectId)
            .single()

        if (project?.slug === 'kanes-bookstore' || project?.name?.toLowerCase().includes('kane')) {
            const aggregates = await this.getKnowledgeAggregates(projectId);
            if (aggregates) {
                metrics.push(
                    {
                        id: "bookstore_inventory_value",
                        label: "Inventory Asset Value",
                        value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(aggregates.inventoryValue),
                        growth: "+0%",
                        icon: getIcon("HardDrive"),
                        color: "text-blue-500 bg-blue-500/10",
                    },
                    {
                        id: "active_readers",
                        label: "Active Reader Base",
                        value: aggregates.activeReaders.toLocaleString(),
                        growth: "+0%",
                        icon: getIcon("BookOpen"),
                        color: "text-emerald-500 bg-emerald-500/10",
                    },
                    {
                        id: "monthly_book_sales",
                        label: "Monthly Sales Velocity",
                        value: aggregates.totalSales.toLocaleString(),
                        growth: "+0%",
                        icon: getIcon("TrendingUp"),
                        color: "text-orange-500 bg-orange-500/10",
                    },
                    {
                        id: "bookstore_total_orders",
                        label: "Total Orders",
                        value: aggregates.orderCount.toLocaleString(),
                        growth: "+0%",
                        icon: getIcon("ShoppingBag"),
                        color: "text-purple-500 bg-purple-500/10",
                    },
                    {
                        id: "bookstore_total_sales_value",
                        label: "Total Order Value",
                        value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(aggregates.totalSales),
                        growth: "+0%",
                        icon: getIcon("DollarSign"),
                        color: "text-emerald-500 bg-emerald-500/10",
                    },
                    {
                        id: "bookstore_avg_order_value",
                        label: "Average Order Value",
                        value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(aggregates.avgOrderValue),
                        growth: "+0%",
                        icon: getIcon("Calculator"),
                        color: "text-indigo-500 bg-indigo-500/10",
                    }
                )
            }
        }

        return metrics
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
        label: "Omni-Channel Reach",
        value: "82.4k",
        growth: "+115%",
        icon: Zap,
        color: "text-emerald-500 bg-emerald-500/10",
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
        id: "youtube_video_count",
        label: "YouTube Videos",
        value: "5",
        growth: "+0%",
        icon: Video,
        color: "text-red-400 bg-red-400/10",
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
        id: "tiktok_followers",
        label: "TikTok Followers",
        value: "2,420",
        growth: "+15.2%",
        icon: Music,
        color: "text-pink-400 bg-pink-400/10",
    },
    {
        id: "tiktok_views",
        label: "TikTok Views",
        value: "45.1k",
        growth: "+22%",
        icon: Play,
        color: "text-pink-500 bg-pink-500/10",
    },
    {
        id: "tiktok_likes",
        label: "TikTok Likes",
        value: "12.8k",
        growth: "+12.5%",
        icon: ThumbsUp,
        color: "text-rose-500 bg-rose-500/10",
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
    {
        id: "instagram_followers",
        label: "Instagram Followers",
        value: "8,420",
        growth: "+5.1%",
        icon: Instagram,
        color: "text-pink-500 bg-pink-500/10",
    },
    {
        id: "instagram_reach",
        label: "Instagram Reach",
        value: "2.4k",
        growth: "+18%",
        icon: BarChart3,
        color: "text-pink-500 bg-pink-500/10",
    },
    {
        id: "tiktok_followers",
        label: "TikTok Followers",
        value: "2,420",
        growth: "+15.2%",
        icon: Music,
        color: "text-pink-400 bg-pink-400/10",
    },
    {
        id: "tiktok_views",
        label: "TikTok Views",
        value: "45.1k",
        growth: "+22%",
        icon: Play,
        color: "text-pink-500 bg-pink-500/10",
    },
    {
        id: "tiktok_likes",
        label: "TikTok Likes",
        value: "12.8k",
        growth: "+12.5%",
        icon: ThumbsUp,
        color: "text-rose-500 bg-rose-500/10",
    },
]

