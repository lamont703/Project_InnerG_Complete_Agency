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

            // 1. Fetch Social Metrics (Noise Stage)
            const [
                { data: ytVideos },
                { data: liPosts },
                { data: igMedia },
                { data: ttVideos },
                { data: fbPosts }
            ] = await Promise.all([
                withProject(adminClient.from("youtube_videos").select("like_count, comment_count")),
                withProject(adminClient.from("linkedin_posts").select("likes, comments, shares")),
                withProject(adminClient.from("instagram_media").select("like_count, comments_count")),
                withProject(adminClient.from("tiktok_videos").select("like_count, comment_count, share_count")),
                withProject(adminClient.from("facebook_posts").select("likes, comments"))
            ])

            const ytLikes = ytVideos?.reduce((acc, v) => acc + (v.like_count || 0), 0) || 0
            const ytComments = ytVideos?.reduce((acc, v) => acc + (v.comment_count || 0), 0) || 0
            
            const liLikes = liPosts?.reduce((acc, p) => acc + (p.likes || 0), 0) || 0
            const liComments = liPosts?.reduce((acc, p) => acc + (p.comments || 0), 0) || 0
            const liShares = liPosts?.reduce((acc, p) => acc + (p.shares || 0), 0) || 0

            const igLikes = igMedia?.reduce((acc, m) => acc + (m.like_count || 0), 0) || 0
            const igComments = igMedia?.reduce((acc, m) => acc + (m.comments_count || 0), 0) || 0

            const ttLikes = ttVideos?.reduce((acc, v) => acc + (v.like_count || 0), 0) || 0
            const ttComments = ttVideos?.reduce((acc, v) => acc + (v.comment_count || 0), 0) || 0
            const ttShares = ttVideos?.reduce((acc, v) => acc + (v.share_count || 0), 0) || 0

            const fbLikes = fbPosts?.reduce((acc, p) => acc + (p.likes || 0), 0) || 0
            const fbComments = fbPosts?.reduce((acc, p) => acc + (p.comments || 0), 0) || 0

            // 2. Fetch Pixel Metrics (Intent & Conversion Hub)
            const [
                { data: pixelVisitors },
                { data: pixelEvents }
            ] = await Promise.all([
                withProject(adminClient.from("visitors").select("visitor_id")), 
                withProject(adminClient.from("pixel_events").select("element_name, metadata").eq("event_name", "click"))
            ])

            const uniqueVisitors = pixelVisitors?.length || 0
            
            const clickMap: Record<string, number> = {}
            pixelEvents?.forEach(e => {
                const elementName = e.element_name || e.metadata?.element_name
                if (elementName) {
                    clickMap[elementName] = (clickMap[elementName] || 0) + 1
                }
            })

            // 3. Final Funnel Aggregation
            const totalLikes = ytLikes + liLikes + igLikes + ttLikes + fbLikes
            const totalComments = ytComments + liComments + igComments + ttComments + fbComments
            const totalShares = liShares + ttShares

            const funnel = {
                noise: {
                    label: "Global Source Intake",
                    total_reach_points: totalLikes + totalComments + totalShares + uniqueVisitors,
                    breakdown: ytVideos ? {
                        youtube: { likes: ytLikes, comments: ytComments },
                        linkedin: { likes: liLikes, comments: liComments, shares: liShares },
                        instagram: { likes: igLikes, comments: igComments },
                        tiktok: { likes: ttLikes, comments: ttComments, shares: ttShares },
                        facebook: { likes: fbLikes, comments: fbComments }
                    } : null
                },
                intent: {
                    label: "Engagement Pool",
                    unique_website_visitors: uniqueVisitors,
                    total_likes: totalLikes,
                    total_comments: totalComments,
                    total_shares: totalShares,
                    total_engagement: totalLikes + totalComments + totalShares + uniqueVisitors
                },
                conversion: {
                    label: "Conversion Hub",
                    milestones: {
                        step_2_clicks: clickMap["Go To Step #2"] || 0,
                        audit_requests: clickMap["Request Growth Audit"] || 0,
                        audit_schedules: clickMap["Schedule a Growth Audit"] || 0,
                        school_community_logins: clickMap["button-CLEbFRjXN7_btn"] || 0
                    },
                    total_conversions: (clickMap["Go To Step #2"] || 0) + (clickMap["Request Growth Audit"] || 0) + (clickMap["Schedule a Growth Audit"] || 0) + (clickMap["button-CLEbFRjXN7_btn"] || 0)
                }
            }

            return {
                funnel,
                summary: `Funnel Status: Intake reach points are ${funnel.noise.total_reach_points.toLocaleString()}. Engagement Pool has ${uniqueVisitors} unique visitors identified via Pixel. Conversion Hub has ${funnel.conversion.total_conversions} high-value revenue actions recorded.`
            }

        } catch (error) {
            console.error(`[get_funnel_intelligence] Fatal Error: ${error.message}`)
            return { error: `Failed to aggregate funnel intelligence: ${error.message}` }
        }
    }
}
