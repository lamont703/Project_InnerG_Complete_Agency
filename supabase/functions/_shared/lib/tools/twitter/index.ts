/**
 * _shared/lib/tools/twitter/index.ts
 * Inner G Complete Agency — X (Twitter) Intelligence Tools
 */

import { createSearchTool, createRecentActivityTool } from "../factory.ts"
import { RegisteredTool, ToolContext } from "../index.ts"

/**
 * Tool: get_twitter_account_stats
 */
export const getTwitterAccountStatsTool: RegisteredTool = {
    definition: {
        name: "get_twitter_account_stats",
        description: "Fetches overview statistics for the project's connected X (Twitter) accounts, including follower counts and tweet frequencies.",
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
            .from("twitter_accounts")
            .select("*")
            .eq("project_id", context.projectId)
            .limit(limit)

        if (error) throw error
        if (!data || data.length === 0) return { message: "No X (Twitter) accounts connected to this project." }
        
        return data
    }
}

/**
 * Tool: list_recent_tweets
 */
export const listRecentTweetsTool = createRecentActivityTool({
    name: "list_recent_tweets",
    platform: "X (Twitter)",
    tableName: "twitter_tweets",
    dateField: "created_at",
    description: "Fetches the most recently posted tweets to track reach, impressions, and engagement metrics (likes, retweets, replies)."
})

/**
 * Tool: search_twitter_knowledge
 */
export const searchTwitterKnowledgeTool = createSearchTool({
    name: "search_twitter_knowledge",
    platform: "X (Twitter)",
    tableNames: ["twitter_accounts", "twitter_tweets"],
    description: "Performs a semantic search over X tweet content and account metadata. Use this to answer specific questions like 'What was our most engaging tweet last month?' or 'Analyze our recent X content reach.'."
})
