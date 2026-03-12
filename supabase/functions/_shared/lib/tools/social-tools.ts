/**
 * _shared/lib/tools/social-tools.ts
 * Inner G Complete Agency — Social Planner Tools for AI Agent
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { RegisteredTool, ToolContext } from "./index.ts"
import { RagService, RagResult } from "../rag.ts"

/**
 * Tool: get_social_insights
 * Fetches AI-distilled social media strategy and engagement alerts.
 */
export const getSocialInsightsTool: RegisteredTool = {
    definition: {
        name: "get_social_insights",
        description: "Fetches strategic social media insights, engagement alerts, and content trend analysis.",
        parameters: {
            type: "object",
            properties: {
                type: {
                    type: "string",
                    description: "Filter by insight type.",
                    enum: ["content_strategy", "engagement_alert", "trend_analysis"]
                },
                limit: {
                    type: "number",
                    description: "Number of insights to return. Defaults to 5.",
                    default: 5
                }
            }
        }
    },
    execute: async (context: ToolContext, args: any) => {
        const { type, limit = 5 } = args
        let query = context.adminClient
            .from("ghl_social_insights")
            .select("*")
            .eq("project_id", context.projectId)
            .order("created_at", { ascending: false })
            .limit(limit)

        if (type) {
            query = query.eq("type", type)
        }

        const { data, error } = await query
        if (error) throw error
        return data
    }
}

/**
 * Tool: list_recent_social_posts
 * Fetches the latest social media posts across various platforms.
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
 * Semantic search over social media posts and insights.
 */
export const searchSocialKnowledgeTool: RegisteredTool = {
    definition: {
        name: "search_social_knowledge",
        description: "Performs a semantic search over social media history and strategy insights. Use this to answer questions like 'What did we post about the holiday sale?' or 'What is our current Instagram strategy?'.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The natural language question or search term."
                }
            },
            required: ["query"]
        }
    },
    execute: async (context: ToolContext, args: any) => {
        const rag = new RagService(context.adminClient)
        
        const results = await rag.search({
            projectId: context.projectId,
            query: args.query,
            limit: 10
        })

        // Filter for social planner related tables
        const socialResults = results.filter((r: RagResult) => 
            ["ghl_social_posts", "ghl_social_insights", "ghl_social_accounts"].includes(r.source_table)
        )

        if (socialResults.length === 0) {
            return "I couldn't find any specific social media activity or insights related to your query. If you've recently scheduled new posts, they might not be indexed yet."
        }

        return socialResults.map((r: RagResult) => `[${r.source_table}] ${r.content}`).join("\n\n")
    }
}
