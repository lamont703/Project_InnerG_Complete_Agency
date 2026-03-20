/**
 * _shared/lib/tools/facebook/index.ts
 * Inner G Complete Agency — Facebook Intelligence Tools
 */

import { createSearchTool } from "../factory.ts"
import { RegisteredTool, ToolContext } from "../index.ts"

/**
 * Tool: get_facebook_page_stats
 */
export const getFacebookPageStatsTool: RegisteredTool = {
    definition: {
        name: "get_facebook_page_stats",
        description: "Fetches overview statistics for the project's connected Facebook Pages, including fan count (likes) and follower counts.",
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
            .from("facebook_pages")
            .select("*")
            .eq("project_id", context.projectId)
            .limit(limit)

        if (error) throw error
        if (!data || data.length === 0) return { message: "No Facebook Pages connected to this project." }
        
        return data
    }
}

/**
 * Tool: search_facebook_knowledge
 */
export const searchFacebookKnowledgeTool = createSearchTool({
    name: "search_facebook_knowledge",
    platform: "Facebook",
    tableNames: ["facebook_pages"],
    description: "Performs a semantic search over Facebook Page descriptions and metadata. Use this to answer specific questions about the linked Page's purpose or branding."
})
