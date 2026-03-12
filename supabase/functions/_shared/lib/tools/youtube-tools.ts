/**
 * _shared/lib/tools/youtube-tools.ts
 * Inner G Complete Agency — YouTube Intelligence Tools for AI Agent
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { RegisteredTool, ToolContext } from "./index.ts"
import { RagService, RagResult } from "../rag.ts"

/**
 * Tool: get_youtube_channel_stats
 * Fetches subscriber counts, view counts, and video counts for a project's YouTube channels.
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
 * Fetches the latest videos uploaded to the project's YouTube channels.
 */
export const listRecentYoutubeVideosTool: RegisteredTool = {
    definition: {
        name: "list_recent_youtube_videos",
        description: "Fetches the most recently uploaded YouTube videos to track content performance and reach.",
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
            .from("youtube_videos")
            .select("*, youtube_channels(title)")
            .eq("project_id", context.projectId)
            .order("published_at", { ascending: false })
            .limit(limit)

        if (error) throw error
        if (!data || data.length === 0) return { message: "No YouTube videos found for this project." }
        
        return data
    }
}

/**
 * Tool: search_youtube_knowledge
 * Semantic search over YouTube channel data and video performance metrics.
 */
export const searchYoutubeKnowledgeTool: RegisteredTool = {
    definition: {
        name: "search_youtube_knowledge",
        description: "Performs a semantic search over YouTube video descriptions, titles, and channel metadata. Use this to answer specific questions like 'What was our best performing video about AI?' or 'Provide a summary of our recent YouTube content strategy.'.",
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

        // Filter for youtube related tables
        const youtubeResults = results.filter((r: RagResult) => 
            ["youtube_channels", "youtube_videos"].includes(r.source_table)
        )

        if (youtubeResults.length === 0) {
            return "I couldn't find any specific YouTube data or video content related to your query. If you've recently uploaded videos, they might not be fully indexed yet."
        }

        return youtubeResults.map((r: RagResult) => `[${r.source_table}] ${r.content}`).join("\n\n")
    }
}
