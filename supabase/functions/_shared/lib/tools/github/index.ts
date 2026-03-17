/**
 * _shared/lib/tools/github/index.ts
 * Inner G Complete Agency — GitHub Intelligence Tools
 */

import { RegisteredTool, ToolContext } from "../index.ts"
import { createInsightsTool, createSearchTool } from "../factory.ts"

/**
 * Tool: get_github_insights
 */
export const getGithubInsightsTool = createInsightsTool({
    name: "get_github_insights",
    platform: "GitHub technical progress",
    tableName: "github_insights",
    insightEnums: ["progress_summary", "growth_idea", "technical_debt", "security_brief"],
    description: "Fetches strategic AI-distilled insights related to technical progress, growth ideas, and technical debt derived from GitHub activity."
})

/**
 * Tool: search_github_knowledge
 */
export const searchGithubKnowledgeTool = createSearchTool({
    name: "search_github_knowledge",
    platform: "GitHub",
    tableNames: ["github_commits", "github_insights", "github_repos", "github_pull_requests"],
    description: "Performs a semantic search over GitHub commits and technical insights. Use this to answer specific questions like 'What did we do for Stripe?' or 'How was the checkout logic implemented?'."
})

/**
 * Tool: get_recent_github_activity
 * Custom logic to aggregate commits and PRs across multiple repos.
 */
export const getRecentGithubActivityTool: RegisteredTool = {
    definition: {
        name: "get_recent_github_activity",
        description: "Fetches the latest commits and pull requests for a project to track developer progress and code changes.",
        parameters: {
            type: "object",
            properties: {
                limit: {
                    type: "number",
                    description: "Number of items to return per category. Defaults to 5.",
                    default: 5
                }
            }
        }
    },
    execute: async (context: ToolContext, args: any) => {
        const { limit = 5 } = args
        
        // 1. Get repo IDs for this project
        const { data: repos } = await context.adminClient
            .from("github_repos")
            .select("id, name")
            .eq("project_id", context.projectId)

        if (!repos || repos.length === 0) return { message: "No GitHub repositories connected to this project." }

        const repoIds = repos.map((r: any) => r.id)

        // 2. Fetch commits
        const { data: commits } = await context.adminClient
            .from("github_commits")
            .select("*")
            .in("repo_id", repoIds)
            .order("authored_at", { ascending: false })
            .limit(limit)

        // 3. Fetch PRs
        const { data: prs } = await context.adminClient
            .from("github_pull_requests")
            .select("*")
            .in("repo_id", repoIds)
            .order("created_at", { ascending: false })
            .limit(limit)

        return {
            repositories: repos.map((r: any) => r.name),
            recent_commits: commits,
            recent_pull_requests: prs
        }
    }
}
