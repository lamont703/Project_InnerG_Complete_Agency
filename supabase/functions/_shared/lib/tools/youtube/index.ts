/**
 * _shared/lib/tools/youtube/index.ts
 * Inner G Complete Agency — YouTube Intelligence Tools
 */

import { createSearchTool, createRecentActivityTool } from "../factory.ts"
import { RegisteredTool, ToolContext } from "../index.ts"

/**
 * Tool: get_youtube_channel_stats
 */
export const getYoutubeChannelStatsTool: RegisteredTool = {
    definition: {
        name: "get_youtube_channel_stats",
        description: "Fetches overview statistics for the project's connected YouTube channels, including subscriber counts, total views, and video counts.",
        parameters: {
            type: "object",
            properties: {
                limit: {
                    type: "number",
                    description: "Number of channels to return. Defaults to 5.",
                    default: 5
                }
            }
        }
    },
    execute: async (context: ToolContext, args: any) => {
        const { limit = 5 } = args
        const { data, error } = await context.adminClient
            .from("youtube_channels")
            .select("*")
            .eq("project_id", context.projectId)
            .limit(limit)

        if (error) throw error
        if (!data || data.length === 0) return { message: "No YouTube channels connected to this project." }
        
        return data
    }
}

/**
 * Tool: list_recent_youtube_videos
 */
export const listRecentYoutubeVideosTool = createRecentActivityTool({
    name: "list_recent_youtube_videos",
    platform: "YouTube",
    tableName: "youtube_videos",
    dateField: "published_at",
    description: "Fetches the most recently uploaded YouTube videos to track content performance and reach."
})

/**
 * Tool: search_youtube_knowledge
 */
export const searchYoutubeKnowledgeTool = createSearchTool({
    name: "search_youtube_knowledge",
    platform: "YouTube",
    tableNames: ["youtube_channels", "youtube_videos"],
    description: "Performs a semantic search over YouTube video descriptions, titles, and channel metadata. Use this to answer specific questions like 'What was our best performing video about AI?' or 'Provide a summary of our recent YouTube content strategy.'."
})
