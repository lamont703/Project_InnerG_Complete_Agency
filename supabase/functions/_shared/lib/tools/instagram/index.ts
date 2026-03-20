/**
 * _shared/lib/tools/instagram/index.ts
 * Inner G Complete Agency — Instagram Intelligence Tools
 */

import { createSearchTool, createRecentActivityTool } from "../factory.ts"
import { RegisteredTool, ToolContext } from "../index.ts"

/**
 * Tool: get_instagram_account_stats
 */
export const getInstagramAccountStatsTool: RegisteredTool = {
    definition: {
        name: "get_instagram_account_stats",
        description: "Fetches overview statistics for the project's connected Instagram Business accounts, including follower counts and total media counts.",
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
            .from("instagram_accounts")
            .select("*")
            .eq("project_id", context.projectId)
            .limit(limit)

        if (error) throw error
        if (!data || data.length === 0) return { message: "No Instagram Business accounts connected to this project." }
        
        return data
    }
}

/**
 * Tool: list_recent_instagram_media
 */
export const listRecentInstagramMediaTool = createRecentActivityTool({
    name: "list_recent_instagram_media",
    platform: "Instagram",
    tableName: "instagram_media",
    dateField: "timestamp",
    description: "Fetches the most recently published Instagram posts and reels to track reach, impressions, and engagement metrics."
})

/**
 * Tool: search_instagram_knowledge
 */
export const searchInstagramKnowledgeTool = createSearchTool({
    name: "search_instagram_knowledge",
    platform: "Instagram",
    tableNames: ["instagram_accounts", "instagram_media"],
    description: "Performs a semantic search over Instagram post captions and account metadata. Use this to answer specific questions like 'What was our most engaging post last month?' or 'Analyze our recent Instagram content themes.'."
})
