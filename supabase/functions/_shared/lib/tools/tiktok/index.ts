/**
 * _shared/lib/tools/tiktok/index.ts
 * Inner G Complete Agency — TikTok Intelligence Tools
 */

import { createSearchTool, createRecentActivityTool } from "../factory.ts"
import { RegisteredTool, ToolContext } from "../index.ts"

/**
 * Tool: get_tiktok_account_stats
 */
export const getTiktokAccountStatsTool: RegisteredTool = {
    definition: {
        name: "get_tiktok_account_stats",
        description: "Fetches overview statistics for the project's connected TikTok accounts, including follower counts, total hearts, and video counts.",
        parameters: {
            type: "object",
            properties: {
                limit: {
                    type: "number",
                    description: "Number of accounts to return. Defaults to 5.",
                    default: 5
                }
            }
        }
    },
    execute: async (context: ToolContext, args: any) => {
        const { limit = 5 } = args
        const { data, error } = await context.adminClient
            .from("tiktok_accounts")
            .select("*")
            .eq("project_id", context.projectId)
            .limit(limit)

        if (error) throw error
        if (!data || data.length === 0) return { message: "No TikTok accounts connected to this project. Ensure the TikTok connector is synced." }
        
        return data
    }
}

/**
 * Tool: list_recent_tiktok_videos
 */
export const listRecentTiktokVideosTool = createRecentActivityTool({
    name: "list_recent_tiktok_videos",
    platform: "TikTok",
    tableName: "tiktok_videos",
    dateField: "published_at",
    description: "Fetches the most recently uploaded TikTok videos to track content performance and viral reach."
})

/**
 * Tool: search_tiktok_knowledge
 */
export const searchTiktokKnowledgeTool = createSearchTool({
    name: "search_tiktok_knowledge",
    platform: "TikTok",
    tableNames: ["tiktok_accounts", "tiktok_videos"],
    description: "Performs a semantic search over TikTok video captions and account metadata. Use this to answer specific questions like 'What was our most viral TikTok about social media?' or 'Provide a summary of our recent TikTok engagement trends.'."
})
