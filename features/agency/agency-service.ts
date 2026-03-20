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

        // 2. Fallback: If no pages for specific project, try to find any synced page (for Agency overview)
        if (!pages || pages.length === 0) {
            const { data: anyPages } = await this.supabase
                .from("linkedin_pages")
                .select("*")
                .order("last_synced_at", { ascending: false })
                .limit(1)
            pages = anyPages
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

        if (!channels || channels.length === 0) {
            const { data: anyChannels } = await this.supabase
                .from("youtube_channels")
                .select("*")
                .order("last_synced_at", { ascending: false })
                .limit(1)
            channels = anyChannels
        }

        if (!channels || channels.length === 0) return null

        const primary = channels[0]
        return {
            subscribers: primary.subscriber_count,
            views: primary.view_count,
            videos: primary.video_count,
            channelTitle: primary.title
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

        if (!accounts || accounts.length === 0) {
            const { data: anyAcc } = await this.supabase
                .from("instagram_accounts")
                .select("*")
                .order("last_synced_at", { ascending: false })
                .limit(1)
            accounts = anyAcc
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

        if (!pages || pages.length === 0) {
            const { data: anyPages } = await this.supabase
                .from("facebook_pages")
                .select("*")
                .order("last_synced_at", { ascending: false })
                .limit(1)
            pages = anyPages
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

        if (!accounts || accounts.length === 0) {
            const { data: anyAcc } = await this.supabase
                .from("tiktok_accounts")
                .select("*")
                .order("last_synced_at", { ascending: false })
                .limit(1)
            accounts = anyAcc
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
}
