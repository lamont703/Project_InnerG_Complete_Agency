/**
 * _shared/lib/tools/tiktok-tools.ts
 * Inner G Complete Agency — TikTok Intelligence Tools for AI Agent
 */

import { RegisteredTool, ToolContext } from "./index.ts"
import { RagService, RagResult } from "../rag.ts"

/**
 * Tool: get_tiktok_account_stats
 * Fetches subscriber counts, heart counts, and video counts for a project's TikTok accounts.
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
 * Fetches the latest videos uploaded to the project's TikTok accounts.
 */
export const listRecentTiktokVideosTool: RegisteredTool = {
    definition: {
        name: "list_recent_tiktok_videos",
        description: "Fetches the most recently uploaded TikTok videos to track content performance and viral reach.",
        parameters: {
            type: "object",
            properties: {
                limit: {
                    type: "number",
                    description: "Number of videos to return. Defaults to 10.",
                    default: 10
                }
            }
        }
    },
    execute: async (context: ToolContext, args: any) => {
        const { limit = 10 } = args
        
        const { data, error } = await context.adminClient
            .from("tiktok_videos")
            .select("*")
            .eq("project_id", context.projectId)
            .order("published_at", { ascending: false })
            .limit(limit)

        if (error) throw error
        if (!data || data.length === 0) return { message: "No TikTok videos found for this project." }
        
        return data
    }
}

/**
 * Tool: search_tiktok_knowledge
 * Semantic search over TikTok video captions and account data.
 */
export const searchTiktokKnowledgeTool: RegisteredTool = {
    definition: {
        name: "search_tiktok_knowledge",
        description: "Performs a semantic search over TikTok video captions and account metadata. Use this to answer specific questions like 'What was our most viral TikTok about social media?' or 'Provide a summary of our recent TikTok engagement trends.'.",
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

        // Filter for tiktok related tables
        const tiktokResults = results.filter((r: RagResult) => 
            ["tiktok_accounts", "tiktok_videos"].includes(r.source_table)
        )

        if (tiktokResults.length === 0) {
            return "I couldn't find any specific TikTok data or video content related to your query. If you've recently uploaded videos, they might still be indexing."
        }

        return tiktokResults.map((r: RagResult) => `[TikTok: ${r.source_table}] ${r.content}`).join("\n\n")
    }
}
