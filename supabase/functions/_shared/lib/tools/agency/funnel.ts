import { RegisteredTool } from "../index.ts"

/**
 * get_funnel_intelligence
 * Aggregates real-time metrics across all social platforms and the InnerG Pixel 
 * to provide a holistic view of the Omni-Channel Funnel.
 */
export const getFunnelIntelligenceTool: RegisteredTool = {
    definition: {
        name: "get_funnel_intelligence",
        description: "Fetches live, aggregated performance data across the three-stage Omni-Channel Funnel: Global Source Intake (Noise), Engagement Pool (Intent), and Conversion Hub (Revenue). Use this to analyze friction points and flow efficiency.",
        parameters: {
            type: "object",
            properties: {
                project_id: { type: "string", description: "Optional UUID of a specific client project to filter by. Defaults to agency-wide aggregation." }
            }
        }
    },
    execute: async (context, args: { project_id?: string }) => {
        const { adminClient } = context
        const targetProjectId = args.project_id

        console.log(`[get_funnel_intelligence] Aggregating funnel data${targetProjectId ? ` for project: ${targetProjectId}` : " for entire agency"}`)

        try {
            // Helper to handle optional project_id filtering
            const withProject = (query: any) => targetProjectId ? query.eq("project_id", targetProjectId) : query

            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

            // 1. Fetch Social Metrics (Noise Stage) - Filtered to last 30 days where possible
            const [
                { data: ytChannels },
                { data: ytVideos },
                { data: liPosts },
                { data: igMedia },
                { data: ttVideos },
                { data: fbPages }
            ] = await Promise.all([
                withProject(adminClient.from("youtube_channels").select("view_count")),
                withProject(adminClient.from("youtube_videos").select("view_count, like_count, comment_count").gt("published_at", thirtyDaysAgo).limit(5000)),
                withProject(adminClient.from("linkedin_posts").select("view_count, like_count, comment_count, share_count").gt("published_at", thirtyDaysAgo).limit(5000)),
                withProject(adminClient.from("instagram_media").select("reach, impressions, like_count, comments_count").gt("timestamp", thirtyDaysAgo).limit(5000)),
                withProject(adminClient.from("tiktok_videos").select("view_count, like_count, comment_count, share_count").gt("published_at", thirtyDaysAgo).limit(5000)),
                withProject(adminClient.from("facebook_pages").select("followers_count, fan_count"))
            ])

            // YouTube: The dashboard "168 Channel Views" likely refers to views in the period
            const ytViews = ytVideos?.reduce((acc: number, v: any) => acc + (v.view_count || 0), 0) || 0
            const ytLikes = ytVideos?.reduce((acc: number, v: any) => acc + (v.like_count || 0), 0) || 0
            const ytComments = ytVideos?.reduce((acc: number, v: any) => acc + (v.comment_count || 0), 0) || 0

            // LinkedIn: "3.0k Post Reach" in period
            const liViews = liPosts?.reduce((acc: number, p: any) => acc + (p.view_count || 0), 0) || 0
            const liLikes = liPosts?.reduce((acc: number, p: any) => acc + (p.like_count || 0), 0) || 0
            const liComments = liPosts?.reduce((acc: number, p: any) => acc + (p.comment_count || 0), 0) || 0
            const liShares = liPosts?.reduce((acc: number, p: any) => acc + (p.share_count || 0), 0) || 0

            // Instagram: "Direct Reach"
            const igReach = igMedia?.reduce((acc: number, m: any) => acc + (m.reach || m.impressions || 0), 0) || 0
            const igLikes = igMedia?.reduce((acc: number, m: any) => acc + (m.like_count || 0), 0) || 0
            const igComments = igMedia?.reduce((acc: number, m: any) => acc + (m.comments_count || 0), 0) || 0

            // TikTok: "Video Reach"
            const ttViews = ttVideos?.reduce((acc: number, v: any) => acc + (v.view_count || 0), 0) || 0
            const ttLikes = ttVideos?.reduce((acc: number, v: any) => acc + (v.like_count || 0), 0) || 0
            const ttComments = ttVideos?.reduce((acc: number, v: any) => acc + (v.comment_count || 0), 0) || 0
            const ttShares = ttVideos?.reduce((acc: number, v: any) => acc + (v.share_count || 0), 0) || 0

            // Facebook & Other
            const fbReach = fbPages?.reduce((acc: number, p: any) => acc + (p.followers_count || 0) + (p.fan_count || 0), 0) || 0

            // 2. Fetch Pixel Metrics (Intent & Conversion Hub) - Period filter
            const [
                { data: pixelVisitors },
                { data: pixelEvents }
            ] = await Promise.all([
                withProject(adminClient.from("pixel_visitors").select("visitor_id").gt("last_seen", thirtyDaysAgo)), 
                withProject(adminClient.from("pixel_events").select("element_name, metadata").eq("event_name", "click").gt("created_at", thirtyDaysAgo))
            ])

            const uniqueVisitors = pixelVisitors?.length || 0
            
            const clickMap: Record<string, number> = {}
            pixelEvents?.forEach((e: any) => {
                const elementName = e.element_name || e.metadata?.element_name
                if (elementName) {
                    clickMap[elementName] = (clickMap[elementName] || 0) + 1
                }
            })

            // Conversion Hub milestones
            const milestones = {
                step_2_clicks: clickMap["Go To Step #2"] || clickMap["Step #2 Clicks"] || 0,
                audit_requests: clickMap["Request Growth Audit"] || clickMap["Request Audit"] || 0,
                audit_schedules: clickMap["Schedule a Growth Audit"] || clickMap["Schedule Audit"] || 0,
                school_logins: clickMap["button-CLEbFRjXN7_btn"] || clickMap["School Logins"] || clickMap["school_login"] || 0
            }

            const total_conversions = Object.values(milestones).reduce((a: number, b: number) => a + b, 0)
            
            // Secondary clicks (Intent stage)
            const secondary_clicks = Object.entries(clickMap).reduce((acc: number, [name, count]: [string, number]) => {
                const knownHighValue = ["Go To Step #2", "Step #2 Clicks", "Request Growth Audit", "Request Audit", "Schedule a Growth Audit", "Schedule Audit", "button-CLEbFRjXN7_btn", "School Logins", "school_login"]
                return knownHighValue.includes(name) ? acc : acc + count
            }, 0)

            // 3. Final Funnel Aggregation
            const totalLikes = ytLikes + liLikes + igLikes + ttLikes
            const totalComments = ytComments + liComments + igComments + ttComments
            const totalShares = liShares + ttShares

            // Total Noise Reach in period
            const total_reach_points = ytViews + liViews + igReach + ttViews + fbReach

            const funnel = {
                noise: {
                    label: "Global Source Intake",
                    total_reach_points: total_reach_points,
                    breakdown: {
                        youtube: { channel_views: ytViews, likes: ytLikes, comments: ytComments },
                        linkedin: { post_reach: liViews, likes: liLikes, comments: liComments, shares: liShares },
                        instagram: { direct_reach: igReach, likes: igLikes, comments: igComments },
                        tiktok: { video_reach: ttViews, likes: ttLikes, comments: ttComments, shares: ttShares },
                        facebook: { organic_flow: fbReach },
                        x_twitter: { pulse_traffic: 0 },
                        threads: { social_threads: 0 }
                    }
                },
                intent: {
                    label: "Engagement Pool",
                    unique_website_visitors: uniqueVisitors,
                    total_hearts_likes: totalLikes,
                    total_comments: totalComments,
                    total_shares: totalShares,
                    secondary_website_interactions: secondary_clicks,
                    total_engagement: totalLikes + totalComments + totalShares + uniqueVisitors + secondary_clicks
                },
                conversion: {
                    label: "Conversion Hub",
                    milestones,
                    total_conversions
                }
            }

            return {
                funnel,
                summary: `Omni-Channel Funnel (Last 30 Days): Global Source Intake reaches ${funnel.noise.total_reach_points.toLocaleString()}. Engagement Pool has ${uniqueVisitors} unique Pixel visitors and ${totalLikes + totalComments + totalShares + uniqueVisitors} total interactions. Conversion Hub records ${total_conversions} revenue-generating actions.`
            }

        } catch (error: any) {
            console.error(`[get_funnel_intelligence] Fatal Error: ${error.message}`)
            return { error: `Failed to aggregate funnel intelligence: ${error.message}` }
        }



    }
}
