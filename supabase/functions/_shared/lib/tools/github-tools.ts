/**
 * _shared/lib/tools/github-tools.ts
 * Inner G Complete Agency — GitHub Intelligence Tools for AI Agent
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { RegisteredTool, ToolContext } from "./index.ts"
import { RagService, RagResult } from "../rag.ts"

/**
 * Tool: get_github_insights
 * Fetches AI-distilled strategic insights (growth ideas, briefings).
 */
export const getGithubInsightsTool: RegisteredTool = {
    definition: {
        name: "get_github_insights",
        description: "Fetches strategic AI-distilled insights related to technical progress, growth ideas, and technical debt derived from GitHub activity.",
        parameters: {
            type: "object",
            properties: {
                type: {
                    type: "string",
                    description: "Filter by insight type.",
                    enum: ["progress_summary", "growth_idea", "technical_debt", "security_brief"]
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
            .from("github_insights")
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
 * Tool: get_recent_github_activity
 * Fetches recent commits and pull requests for a project.
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

        const repoIds = repos.map(r => r.id)

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

/**
 * Tool: search_github_knowledge
 * Semantic search over GitHub-specific context only.
 */
export const searchGithubKnowledgeTool: RegisteredTool = {
    definition: {
        name: "search_github_knowledge",
        description: "Performs a semantic search over GitHub commits and technical insights. Use this to answer specific questions like 'What did we do for Stripe?' or 'How was the checkout logic implemented?'.",
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
        
        // Use RAG to search but we'll manually filter for github related tables if needed, 
        // or just let it return the most relevant snippets.
        const results = await rag.search({
            projectId: context.projectId,
            query: args.query,
            limit: 10
        })

        // Filter the results to prioritize GitHub content for this specific tool
        const githubResults = results.filter((r: RagResult) => 
            ["github_commits", "github_insights", "github_repos", "github_pull_requests"].includes(r.source_table)
        )

        if (githubResults.length === 0) {
            return "I couldn't find any specific GitHub activity or insights related to your query. However, if this was recently added, please try syncing the connector first."
        }

        return githubResults.map((r: RagResult) => `[${r.source_table}] ${r.content}`).join("\n\n")
    }
}
