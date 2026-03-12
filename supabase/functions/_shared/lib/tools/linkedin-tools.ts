/**
 * _shared/lib/tools/linkedin-tools.ts
 * Inner G Complete Agency — LinkedIn Intelligence Tools for AI Agent
 */

import { RegisteredTool, ToolContext } from "./index.ts"
import { RagService, RagResult } from "../rag.ts"

/**
 * Tool: get_linkedin_page_stats
 * Fetches follower counts and engagement metrics for a project's LinkedIn pages.
 */
export const getLinkedinPageStatsTool: RegisteredTool = {
    definition: {
        name: "get_linkedin_page_stats",
        description: "Fetches overview metrics for the project's LinkedIn pages, including followers, impressions, and engagement rates.",
        parameters: {
            type: "object",
            properties: {
                limit: {
                    type: "number",
                    description: "Number of pages to return. Defaults to 5.",
                    default: 5
                }
            }
        }
    },
    execute: async (context: ToolContext, args: any) => {
        const { limit = 5 } = args
        const { data, error } = await context.adminClient
            .from("linkedin_pages")
            .select("*")
            .eq("project_id", context.projectId)
            .limit(limit)

        if (error) throw error
        if (!data || data.length === 0) return { message: "No LinkedIn pages connected to this project." }
        
        return data
    }
}

/**
 * Tool: list_recent_linkedin_posts
 * Fetches the latest posts from the project's LinkedIn pages.
 */
export const listRecentLinkedinPostsTool: RegisteredTool = {
    definition: {
        name: "list_recent_linkedin_posts",
        description: "Fetches the most recent LinkedIn posts to track content performance and professional engagement.",
        parameters: {
            type: "object",
            properties: {
                limit: {
                    type: "number",
                    description: "Number of posts to return. Defaults to 10.",
                    default: 10
                }
            }
        }
    },
    execute: async (context: ToolContext, args: any) => {
        const { limit = 10 } = args
        
        const { data, error } = await context.adminClient
            .from("linkedin_posts")
            .select("*, linkedin_pages(name)")
            .eq("project_id", context.projectId)
            .order("published_at", { ascending: false })
            .limit(limit)

        if (error) throw error
        if (!data || data.length === 0) return { message: "No LinkedIn posts found for this project." }
        
        return data
    }
}

/**
 * Tool: search_linkedin_knowledge
 * Semantic search over LinkedIn page data and post performance.
 */
export const searchLinkedinKnowledgeTool: RegisteredTool = {
    definition: {
        name: "search_linkedin_knowledge",
        description: "Performs a semantic search over LinkedIn post content and page insights. Use this to answer questions like 'What was our most engaging LinkedIn post about growth?' or 'Summarize our LinkedIn presence.'.",
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

        // Filter for linkedin related tables
        const linkedinResults = results.filter((r: RagResult) => 
            ["linkedin_pages", "linkedin_posts"].includes(r.source_table)
        )

        if (linkedinResults.length === 0) {
            return "I couldn't find any specific LinkedIn data or post content related to your query. If you've recently posted on LinkedIn, it might not be fully indexed yet."
        }

        return linkedinResults.map((r: RagResult) => `[${r.source_table}] ${r.content}`).join("\n\n")
    }
}
