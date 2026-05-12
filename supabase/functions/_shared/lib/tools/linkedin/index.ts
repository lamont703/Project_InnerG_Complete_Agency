/**
 * _shared/lib/tools/linkedin/index.ts
 * Inner G Complete Agency — LinkedIn Intelligence Tools
 */

import { createSearchTool, createRecentActivityTool } from "../factory.ts"
import { RegisteredTool, ToolContext } from "../index.ts"

/**
 * Tool: get_linkedin_page_stats
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
 */
export const listRecentLinkedinPostsTool = createRecentActivityTool({
    name: "list_recent_linkedin_posts",
    platform: "LinkedIn",
    tableName: "linkedin_posts",
    dateField: "published_at",
    description: "Fetches the most recent LinkedIn posts to track content performance and professional engagement."
})

/**
 * Tool: search_linkedin_knowledge
 */
export const searchLinkedinKnowledgeTool = createSearchTool({
    name: "search_linkedin_knowledge",
    platform: "LinkedIn",
    tableNames: ["linkedin_pages", "linkedin_posts"],
    description: "Performs a semantic search over LinkedIn post content and page insights. Use this to answer questions like 'What was our most engaging LinkedIn post about growth?' or 'Summarize our LinkedIn presence.'."
})
