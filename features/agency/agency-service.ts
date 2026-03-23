import { SupabaseClient } from "@supabase/supabase-js"
import { AgencyProject, StrategicSignal, OperationalSignal, AgencyUserData } from "./types"

/**
 * AgencyService - Handles all database and API interactions for the Super Admin dashboard.
 */
export class AgencyService {
    constructor(private supabase: SupabaseClient) { }

    /**
     * Fetch user profile and verify super_admin status
     */
    async getAdminProfile(userId: string, userMetadata?: any): Promise<AgencyUserData | null> {
        const { data: profile } = await this.supabase
            .from("users")
            .select("full_name, role")
            .eq("id", userId)
            .maybeSingle()

        if (!profile || profile.role !== "super_admin") return null

        const nameFallback = userMetadata?.full_name || userMetadata?.name || userMetadata?.display_name || "Admin"

        return {
            name: profile.full_name || nameFallback,
            role: "SUPER ADMIN"
        }
    }

    /**
     * Fetch all active projects across the portfolio
     */
    async getActiveProjects(): Promise<AgencyProject[]> {
        const { data } = await this.supabase
            .from("projects")
            .select("id, name, slug, status, type, active_campaign_name, clients(name, industry)")
            .eq("status", "active")
            .order("name")

        return (data as any[]) || []
    }

    /**
     * Fetch recent signals, split into Strategic (Agency Only) and Operational
     */
    async getAllAgencySignals(): Promise<{ strategic: StrategicSignal[], operational: OperationalSignal[] }> {
        const { data } = await this.supabase
            .from("ai_signals")
            .select("id, project_id, signal_type, title, body, severity, is_resolved, is_agency_only, created_at, action_url, metadata, projects(name)")
            .eq("is_resolved", false)
            .order("created_at", { ascending: false })
            .limit(50)

        const signals = (data as any[]) || []

        return {
            strategic: signals.filter(s => s.is_agency_only),
            operational: signals.filter(s => !s.is_agency_only)
        }
    }

    /**
     * Delete a social draft and its associated signal
     */
    async deleteSocialDraft(draftId: string, projectId: string): Promise<void> {
        const { error } = await this.supabase.rpc("delete_social_draft_signal", {
            p_draft_id: draftId,
            p_project_id: projectId
        })
        if (error) throw error
    }


    /**
     * Trigger the GHL Sync function via Supabase Edge Function
     */
    async syncGHL(accessToken: string, anonKey: string, connectionId?: string | null): Promise<void> {
        const p1 = this.supabase.functions.invoke("sync-ghl-pipeline", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                apikey: anonKey
            }
        });

        const promises = [p1];

        if (connectionId) {
            promises.push(
                this.supabase.functions.invoke("ghl-social-sync", {
                    body: { connection_id: connectionId },
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        apikey: anonKey
                    }
                })
            );
        }

        const results = await Promise.all(promises);

        for (const res of results) {
            if (res.error) {
                const responseBody = await res.error.context?.json().catch(() => null);
                throw new Error(responseBody?.error?.message || res.error.message);
            }
        }
    }

    /**
     * Find the primary GHL connection for the portfolio
     */
    async getGHLConnection(): Promise<string | null> {
        const { data } = await this.supabase
            .from("client_db_connections")
            .select("id, connector_types!inner(provider)")
            .eq("connector_types.provider", "ghl")
            .eq("is_active", true)
            .limit(1)
            .maybeSingle()

        return data?.id || null
    }

    /**
     * Trigger GitHub Sync for a specific connection
     */
    async syncGithub(accessToken: string, anonKey: string, connectionId: string): Promise<void> {
        const { error } = await this.supabase.functions.invoke("connector-sync", {
            body: { connection_id: connectionId },
            headers: {
                Authorization: `Bearer ${accessToken}`,
                apikey: anonKey
            }
        })

        if (error) {
            const responseBody = await error.context?.json()
            throw new Error(responseBody?.error?.message || error.message)
        }
    }

    /**
     * Find the primary GitHub connection for the portfolio
     */
    async getGitHubConnection(): Promise<string | null> {
        const { data } = await this.supabase
            .from("client_db_connections")
            .select("id, connector_types!inner(provider)")
            .eq("connector_types.provider", "github")
            .eq("is_active", true)
            .limit(1)
            .maybeSingle()

        return data?.id || null
    }

    /**
     * Find the primary LinkedIn connection for the portfolio
     */
    async getLinkedInConnection(): Promise<string | null> {
        const { data } = await this.supabase
            .from("client_db_connections")
            .select("id, connector_types!inner(provider)")
            .eq("connector_types.provider", "linkedin")
            .eq("is_active", true)
            .limit(1)
            .maybeSingle()

        return data?.id || null
    }

    /**
     * Fetch pending social content drafts
     */
    async getSocialDrafts(): Promise<any[]> {
        const { data } = await this.supabase
            .from("social_content_plan")
            .select("*, projects(name)")
            .eq("status", "draft")
            .order("created_at", { ascending: false })

        return (data as any[]) || []
    }

    /**
     * Invoke the publishing Edge Function for a draft
     */
    async publishSocialPost(accessToken: string, anonKey: string, draftId: string, platforms?: string[]): Promise<void> {
        const { error } = await this.supabase.functions.invoke("publish-social-post", {
            body: { draft_id: draftId, platforms },
            headers: {
                Authorization: `Bearer ${accessToken}`,
                apikey: anonKey
            }
        })

        if (error) {
            const responseBody = await error.context?.json().catch(() => null)
            throw new Error(responseBody?.error || error.message)
        }
    }

    /**
     * Generate an AI image for a social draft
     */
    async generateSocialImage(accessToken: string, anonKey: string, draftId: string, style?: string): Promise<string> {
        const { data, error } = await this.supabase.functions.invoke("generate-social-image", {
            body: { draft_id: draftId, style },
            headers: {
                Authorization: `Bearer ${accessToken}`,
                apikey: anonKey
            }
        })

        if (error) {
            const responseBody = await error.context?.json().catch(() => null)
            throw new Error(responseBody?.error || error.message)
        }

        return data.imageUrl
    }

    /**
     * Generate an AI video for a social draft using Google Veo
     */
    async generateSocialVideo(accessToken: string, anonKey: string, draftId: string): Promise<string> {
        const { data, error } = await this.supabase.functions.invoke("generate-social-video", {
            body: { draft_id: draftId },
            headers: {
                Authorization: `Bearer ${accessToken}`,
                apikey: anonKey
            }
        })

        if (error) {
            const responseBody = await error.context?.json().catch(() => null)
            throw new Error(responseBody?.error || error.message)
        }

        return data.videoUrl
    }

    /**
     * Clear the media URL from a draft (Decline flow)
     */
    async clearDraftMedia(draftId: string): Promise<void> {
        const { error } = await this.supabase
            .from("social_content_plan")
            .update({ media_url: null })
            .eq("id", draftId)

        if (error) throw error
    }

    /**
     * Fetch LinkedIn metrics for the agency project
     */
    async getLinkedInMetrics(projectSlug: string = "innergcomplete"): Promise<any> {
        // 1. Try to find the specific project's metrics
        const { data: project } = await this.supabase
            .from("projects")
            .select("id")
            .eq("slug", projectSlug)
            .single()

        let pages = null
        if (project) {
            const { data } = await this.supabase
                .from("linkedin_pages")
                .select("*")
                .eq("project_id", project.id)
            pages = data
        }


        if (!pages || pages.length === 0) return null

        // Return the metrics of the primary page + aggregated post metrics
        const primary = pages[0]
        
        // Fetch Post Aggregations for this specific project
        const { data: posts } = await this.supabase
            .from("linkedin_posts")
            .select("like_count, comment_count, share_count, view_count")
            .eq("project_id", primary.project_id)

        const postStats = (posts || []).reduce((acc: any, p: any) => ({
            likes: acc.likes + (p.like_count || 0),
            comments: acc.comments + (p.comment_count || 0),
            shares: acc.shares + (p.share_count || 0),
            postViews: acc.postViews + (p.view_count || 0)
        }), { likes: 0, comments: 0, shares: 0, postViews: 0 })

        return {
            followers: primary.follower_count,
            views: primary.total_views,
            clicks: primary.total_clicks,
            engagement: primary.engagement_rate,
            pageName: primary.name,
            likes: postStats.likes,
            comments: postStats.comments,
            shares: postStats.shares,
            postViews: postStats.postViews
        }
    }

    /**
     * Trigger LinkedIn Sync for a specific connection
     */
    async syncLinkedIn(accessToken: string, anonKey: string, connectionId: string): Promise<void> {
        const { error } = await this.supabase.functions.invoke("connector-sync", {
            body: { connection_id: connectionId },
            headers: {
                Authorization: `Bearer ${accessToken}`,
                apikey: anonKey
            }
        })

        if (error) {
            const responseBody = await error.context?.json().catch(() => null)
            throw new Error(responseBody?.error?.message || error.message)
        }
    }

    /**
     * Find the primary LinkedIn connection for the portfolio
     */
    async getYouTubeConnection(): Promise<string | null> {
        const { data } = await this.supabase
            .from("client_db_connections")
            .select("id, connector_types!inner(provider)")
            .eq("connector_types.provider", "youtube")
            .eq("is_active", true)
            .limit(1)
            .maybeSingle()

        return data?.id || null
    }

    /**
     * Fetch YouTube metrics for the agency project
     */
    async getYouTubeMetrics(projectSlug: string = "innergcomplete"): Promise<any> {
        const { data: project } = await this.supabase
            .from("projects")
            .select("id")
            .eq("slug", projectSlug)
            .single()

        let channels = null
        if (project) {
            const { data } = await this.supabase
                .from("youtube_channels")
                .select("*")
                .eq("project_id", project.id)
            channels = data
        }


        if (!channels || channels.length === 0) return null

        const primary = channels[0]

        // Fetch Video Aggregations for YouTube
        const { data: videos } = await this.supabase
            .from("youtube_videos")
            .select("like_count, comment_count")
            .eq("project_id", primary.project_id)

        const videoStats = (videos || []).reduce((acc: any, v: any) => ({
            likes: acc.likes + (v.like_count || 0),
            comments: acc.comments + (v.comment_count || 0)
        }), { likes: 0, comments: 0 })

        return {
            subscribers: primary.subscriber_count,
            views: primary.view_count,
            videos: primary.video_count,
            channelTitle: primary.title,
            likes: videoStats.likes,
            comments: videoStats.comments
        }
    }

    /**
     * Fetch Instagram metrics for the agency project
     */
    async getInstagramMetrics(projectSlug: string = "innergcomplete"): Promise<any> {
        const { data: project } = await this.supabase
            .from("projects")
            .select("id")
            .eq("slug", projectSlug)
            .single()

        let accounts = null
        if (project) {
            const { data } = await this.supabase
                .from("instagram_accounts")
                .select("*")
                .eq("project_id", project.id)
            accounts = data
        }


        if (!accounts || accounts.length === 0) return null

        const primary = accounts[0]
        
        // Fetch Media Aggregations
        const { data: media } = await this.supabase
            .from("instagram_media")
            .select("like_count, comments_count, reach, impressions")
            .eq("project_id", primary.project_id)

        const mediaStats = (media || []).reduce((acc: any, m: any) => ({
            likes: acc.likes + (m.like_count || 0),
            comments: acc.comments + (m.comments_count || 0),
            reach: acc.reach + (m.reach || 0),
            impressions: acc.impressions + (m.impressions || 0)
        }), { likes: 0, comments: 0, reach: 0, impressions: 0 })

        const mediaCount = (media || []).length
        const engagement = mediaCount > 0 ? (mediaStats.likes + mediaStats.comments) / mediaCount : 0

        return {
            followers: primary.follower_count,
            mediaCount: primary.media_count,
            username: primary.username,
            likes: mediaStats.likes,
            comments: mediaStats.comments,
            reach: mediaStats.reach,
            impressions: mediaStats.impressions,
            engagement: engagement
        }
    }

    /**
     * Fetch Facebook metrics for the agency project
     */
    async getFacebookMetrics(projectSlug: string = "innergcomplete"): Promise<any> {
        const { data: project } = await this.supabase
            .from("projects")
            .select("id")
            .eq("slug", projectSlug)
            .single()

        let pages = null
        if (project) {
            const { data } = await this.supabase
                .from("facebook_pages")
                .select("*")
                .eq("project_id", project.id)
            pages = data
        }


        if (!pages || pages.length === 0) return null

        const primary = pages[0]
        return {
            followers: primary.followers_count,
            fans: primary.fan_count,
            pageName: primary.name
        }
    }

    /**
     * Fetch TikTok metrics for the agency project
     */
    async getTikTokMetrics(projectSlug: string = "innergcomplete"): Promise<any> {
        const { data: project } = await this.supabase
            .from("projects")
            .select("id")
            .eq("slug", projectSlug)
            .single()

        let accounts = null
        if (project) {
            const { data } = await this.supabase
                .from("tiktok_accounts")
                .select("*")
                .eq("project_id", project.id)
            accounts = data
        }


        if (!accounts || accounts.length === 0) return null

        const account = accounts[0]
        
        // Fetch Video Aggregations
        const { data: videos } = await this.supabase
            .from("tiktok_videos")
            .select("view_count, like_count, comment_count, share_count")
            .eq("project_id", account.project_id)

        const videoStats = (videos || []).reduce((acc: any, v: any) => ({
            views: acc.views + (v.view_count || 0),
            likes: acc.likes + (v.like_count || 0),
            comments: acc.comments + (v.comment_count || 0),
            shares: acc.shares + (v.share_count || 0)
        }), { views: 0, likes: 0, comments: 0, shares: 0 })

        const videoLikes = videoStats.likes;
        const videoComments = videoStats.comments;
        const videoShares = videoStats.shares;
        const videoViews = videoStats.views;

        return {
            followerCount: account.follower_count || 0,
            heartCount: videoLikes, // Using aggregated video likes as requested
            videoCount: account.video_count || 0,
            username: account.username || 'TikTok User',
            averageViews: videos && videos.length > 0 ? videoViews / videos.length : 0,
            totalViews: videoViews,
            videoLikes,
            videoComments,
            videoShares,
            latestVideos: (videos || []).slice(0, 5)
        }
    }

    /**
     * Fetch Pixel tracking metrics for the agency project
     */
    async getPixelMetrics(projectSlug: string = "innergcomplete"): Promise<any> {
        const { data: project } = await this.supabase
            .from("projects")
            .select("id")
            .eq("slug", projectSlug)
            .single()

        if (!project) return null

        // 1. Optimized Server-Side Extraction via RPC
        const { data, error } = await this.supabase.rpc("get_pixel_metrics_summary", {
            p_project_id: project.id
        })

        // 2. Return data if RPC is successful
        if (!error && data) {
            return data
        }

        // 3. Fallback logic if RPC is missing or fails (limit still applies here)
        console.warn("[AgencyService] Error fetching pixel metrics via RPC, using fallback...", error)
        
        const [events, visitors, clickData] = await Promise.all([
            this.supabase.from("pixel_events").select("*", { count: "exact", head: true }).eq("project_id", project.id),
            this.supabase.from("pixel_visitors").select("*").eq("project_id", project.id),
            this.supabase.from("pixel_events")
                .select("event_name, element_name")
                .eq("project_id", project.id)
                .limit(5000)
        ])

        const totalHits = events.count || 0
        const visitorData = visitors.data || []
        
        const clicks = (clickData.data || []).reduce((acc: any, c: any) => {
            if (c.event_name) acc[c.event_name] = (acc[c.event_name] || 0) + 1
            if (c.element_name) acc[c.element_name] = (acc[c.element_name] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        const identifiedCount = visitorData.filter((v: any) => 
            v.email || 
            v.full_name || 
            (v.identity_metadata && Object.keys(v.identity_metadata).length > 0)
        ).length

        return {
            totalHits,
            uniqueVisitors: visitorData.length,
            identifiedCount,
            clicks
        }
    }

    /**
     * Force sync pixel data to public snapshots
     */
    async syncPixelSnapshot(projectSlug: string = "innergcomplete"): Promise<void> {
        const metrics = await this.getPixelMetrics(projectSlug)
        if (!metrics) throw new Error("Could not fetch metrics for project")

        const { data: project } = await this.supabase
            .from("projects")
            .select("id")
            .eq("slug", projectSlug)
            .single()

        if (!project) throw new Error("Project not found")

        // Get latest snapshot payload to preserve other fields
        const { data: latest } = await this.supabase
            .from("project_metrics_snapshots")
            .select("metrics_payload")
            .eq("project_id", project.id)
            .order("snapshot_date", { ascending: false })
            .limit(1)
            .maybeSingle()

        const payload = (latest as any)?.metrics_payload || {}
        
        // Merge pixel data
        const updatedPayload = {
            ...payload,
            pixel_total_hits: metrics.totalHits,
            pixel_unique_visitors: metrics.uniqueVisitors,
            pixel_identified_leads: metrics.identifiedCount,
            pixel_click_signin: metrics.clicks["Sign In"] || 0,
            pixel_click_buy_xrp: (metrics.clicks["Buy XRP"] || 0) + (metrics.clicks["Buy XRP ↗"] || 0),
            pixel_click_join_revolution: metrics.clicks["Join The Revolution"] || 0,
            pixel_click_become_trader: metrics.clicks["Become a Trader"] || 0,
            pixel_click_login: (metrics.clicks["Login"] || 0) + (metrics.clicks["LOGIN"] || 0),
            pixel_click_create_account: metrics.clicks["Create Account"] || 0,
            pixel_click_claim_free: metrics.clicks["Claim My Free Month — Join Now"] || 0,
            last_pixel_sync: new Date().toISOString()
        }

        const { error } = await this.supabase
            .from("project_metrics_snapshots")
            .upsert({
                project_id: project.id,
                snapshot_date: new Date().toISOString().split('T')[0],
                metrics_payload: updatedPayload
            }, {
                onConflict: 'project_id,snapshot_date'
            })

        if (error) throw error
    }

    /**
     * Fetch funnel configuration for a specific project
     */
    async getFunnelConfig(projectSlug: string = "innergcomplete"): Promise<any> {
        const { data: project } = await this.supabase
            .from("projects")
            .select("id")
            .eq("slug", projectSlug)
            .single()

        if (!project) return null

        const { data } = await (this.supabase
            .from("project_agent_config") as any)
            .select("funnel_config")
            .eq("project_id", project.id)
            .single()

        return data?.funnel_config || null
    }
}
