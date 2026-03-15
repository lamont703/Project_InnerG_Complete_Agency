/**
 * _shared/lib/tools/factory.ts
 * Inner G Complete Agency — Tool Factory Helpers
 */

import { RegisteredTool, ToolContext } from "./index.ts"
import { RagService, RagResult } from "../ai/rag.ts"

/**
 * Creates a standardized 'Insights' tool for a platform.
 * These tools fetch AI-distilled strategic insights from a specific table.
 */
export function createInsightsTool(options: {
    name: string
    platform: string
    tableName: string
    insightEnums: string[]
    description?: string
}): RegisteredTool {
    return {
        definition: {
            name: options.name,
            description: options.description || `Fetches strategic AI-distilled insights related to ${options.platform}.`,
            parameters: {
                type: "object",
                properties: {
                    type: {
                        type: "string",
                        description: "Filter by insight type.",
                        enum: options.insightEnums
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
                .from(options.tableName)
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
        },
        sourceTables: [options.tableName]
    }
}

/**
 * Creates a standardized 'Search' tool for a platform.
 * These tools perform semantic search over platform-specific RAG context.
 */
export function createSearchTool(options: {
    name: string
    platform: string
    tableNames: string[]
    description?: string
    emptyMessage?: string
}): RegisteredTool {
    return {
        definition: {
            name: options.name,
            description: options.description || `Performs a semantic search over ${options.platform} activity and technical insights.`,
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

            // Filter the results to prioritize the specific tables for this tool
            const filteredResults = results.filter((r: RagResult) => 
                options.tableNames.includes(r.source_table)
            )

            if (filteredResults.length === 0) {
                return options.emptyMessage || `I couldn't find any specific ${options.platform} activity or insights related to your query.`
            }

            return filteredResults.map((r: RagResult) => `[${r.source_table}] ${r.content}`).join("\n\n")
        },
        sourceTables: options.tableNames
    }
}

/**
 * Creates a standardized 'Recent Activity' tool for a platform.
 * Note: Some platforms (like GitHub) might still need custom logic for multi-table joins.
 */
export function createRecentActivityTool(options: {
    name: string
    platform: string
    tableName: string
    description: string
    statusEnum?: string[]
    dateField?: string
}): RegisteredTool {
    return {
        definition: {
            name: options.name,
            description: options.description,
            parameters: {
                type: "object",
                properties: Object.fromEntries(
                    Object.entries({
                        status: options.statusEnum ? {
                            type: "string",
                            description: `Filter by status.`,
                            enum: options.statusEnum
                        } : undefined,
                        limit: {
                            type: "number",
                            description: "Number of items to return. Defaults to 10.",
                            default: 10
                        }
                    }).filter(([_, v]) => v !== undefined)
                )
            }
        },
        execute: async (context: ToolContext, args: any) => {
            const { status, limit = 10 } = args
            const dateField = options.dateField || "created_at"
            
            let query = context.adminClient
                .from(options.tableName)
                .select("*")
                .eq("project_id", context.projectId)
                .order(dateField, { ascending: false })
                .limit(limit)

            if (status) {
                query = query.eq("status", status)
            }

            const { data, error } = await query
            if (error) throw error
            return data
        },
        sourceTables: [options.tableName]
    }
}
