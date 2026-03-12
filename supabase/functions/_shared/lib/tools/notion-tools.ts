/**
 * _shared/lib/tools/notion-tools.ts
 * Inner G Complete Agency — Notion Intelligence Tools for AI Agent
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { RegisteredTool, ToolContext } from "./index.ts"
import { RagService, RagResult } from "../rag.ts"

/**
 * Tool: list_recent_notion_pages
 * Fetches the most recently synced or updated Notion pages.
 */
export const listRecentNotionPagesTool: RegisteredTool = {
    definition: {
        name: "list_recent_notion_pages",
        description: "Fetches the most recently updated Notion pages to track current documentation and knowledge base updates.",
        parameters: {
            type: "object",
            properties: {
                limit: {
                    type: "number",
                    description: "Number of pages to return. Defaults to 10.",
                    default: 10
                }
            }
        }
    },
    execute: async (context: ToolContext, args: any) => {
        const { limit = 10 } = args
        
        const { data, error } = await context.adminClient
            .from("notion_pages")
            .select("id, title, url, last_edited_time, last_synced_at")
            .eq("project_id", context.projectId)
            .order("last_edited_time", { ascending: false })
            .limit(limit)

        if (error) throw error
        if (!data || data.length === 0) return { message: "No Notion pages found for this project. Ensure the Notion connector is configured and synced." }
        
        return data
    }
}

/**
 * Tool: search_notion_knowledge
 * Semantic search over Notion page content and titles.
 */
export const searchNotionKnowledgeTool: RegisteredTool = {
    definition: {
        name: "search_notion_knowledge",
        description: "Performs a semantic search over Notion page content, titles, and discussions. Use this to answer specific questions like 'What is our SOP for onboarding?' or 'Give me a summary of the latest project roadmap from Notion.'.",
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

        // Filter for notion related tables
        const notionResults = results.filter((r: RagResult) => 
            ["notion_pages"].includes(r.source_table)
        )

        if (notionResults.length === 0) {
            return "I couldn't find any specific Notion pages or content related to your query. If you've recently added pages, they might still be indexing."
        }

        return notionResults.map((r: RagResult) => `[Notion: ${r.source_table}] ${r.content}`).join("\n\n")
    }
}
