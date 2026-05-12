/**
 * _shared/lib/tools/social/index.ts
 * Inner G Complete Agency — Social Planner Tools
 */

import { RegisteredTool, ToolContext } from "../index.ts"
import { createInsightsTool, createSearchTool } from "../factory.ts"

/**
 * Tool: get_social_insights
 */
export const getSocialInsightsTool = createInsightsTool({
    name: "get_social_insights",
    platform: "social media strategy",
    tableName: "ghl_social_insights",
    insightEnums: ["content_strategy", "engagement_alert", "trend_analysis"],
    description: "Fetches strategic social media insights, engagement alerts, and content trend analysis."
})

/**
 * Tool: list_recent_social_posts
 */
export const listRecentSocialPostsTool: RegisteredTool = {
    definition: {
        name: "list_recent_social_posts",
        description: "Fetches the most recent social media posts to track engagement and content performance.",
        parameters: {
            type: "object",
            properties: {
                status: {
                    type: "string",
                    description: "Filter by post status (e.g., posted, scheduled, failed).",
                    enum: ["posted", "scheduled", "failed"]
                },
                limit: {
                    type: "number",
                    description: "Number of posts to return. Defaults to 10.",
                    default: 10
                }
            }
        }
    },
    execute: async (context: ToolContext, args: any) => {
        const { status, limit = 10 } = args
        
        let query = context.adminClient
            .from("ghl_social_posts")
            .select("*, ghl_social_accounts(name, type)")
            .eq("project_id", context.projectId)
            .order("posted_at", { ascending: false, nullsFirst: false })
            .order("scheduled_at", { ascending: false, nullsFirst: false })
            .limit(limit)

        if (status) {
            query = query.eq("status", status)
        }

        const { data, error } = await query
        if (error) throw error
        return data
    }
}

/**
 * Tool: search_social_knowledge
 */
export const searchSocialKnowledgeTool = createSearchTool({
    name: "search_social_knowledge",
    platform: "social media",
    tableNames: ["ghl_social_posts", "ghl_social_insights", "ghl_social_accounts", "news_intelligence"],
    description: "Performs a semantic search over social media history and strategy insights. Use this to answer questions like 'What did we post about the holiday sale?' or 'What is our current Instagram strategy?'."
})
