/**
 * _shared/lib/rag.ts
 * Inner G Complete Agency — Retrieval-Augmented Generation (RAG) Service
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This is the ONLY file that should handle
 * vector similarity searches and knowledge retrieval.
 * If you want the AI to "know" something new, add the 
 * search logic here first.
 * ─────────────────────────────────────────────────────────
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { embedText } from "./gemini.ts"
import { getEnv } from "../core/env.ts"

export interface RagResult {
    content: string
    source_table: string
    source_id: string
    similarity: number
}

export class RagService {
    constructor(private client: SupabaseClient) { }

    /**
     * Performs a vector search and returns formatted context for the AI.
     */
    async search(params: {
        projectId: string
        query: string
        limit?: number
        minSimilarity?: number
        includeAgencyKnowledge?: boolean
        agencyProjectId?: string
    }): Promise<RagResult[]> {
        const { 
            projectId, 
            query, 
            limit = 10, 
            minSimilarity = 0.35, 
            includeAgencyKnowledge = false,
            agencyProjectId = "00000000-0000-0000-0000-000000000001"
        } = params

        // 1. Generate search vector
        const apiKey = getEnv("GEMINI_API_KEY")
        const embedding = await embedText(query, apiKey)
        if (!embedding) return []

        // 2. Perform Parallel Search (Project Local + Agency Master)
        const searchTasks = [
            this.client.rpc("match_documents", {
                query_embedding: embedding,
                match_threshold: minSimilarity,
                match_count: limit,
                p_project_id: projectId
            })
        ]

        if (includeAgencyKnowledge && projectId !== agencyProjectId) {
            searchTasks.push(
                this.client.rpc("match_documents", {
                    query_embedding: embedding,
                    match_threshold: minSimilarity + 0.1, // Stricter for agency peering (0.45)
                    match_count: Math.floor(limit / 2),
                    p_project_id: agencyProjectId
                })
            )
        }

        const results = await Promise.all(searchTasks)
        
        // 3. Process & Filter Results
        const combined = results.flatMap((r: any, index: number) => {
            const taskProjectId = index === 0 ? projectId : agencyProjectId
            return (r.data || []).map((item: any) => ({
                ...item,
                project_id: item.project_id || taskProjectId
            }))
        }) as (RagResult & { project_id: string })[]

        return combined.filter(r => {
            // If the chunk belongs to the local project, it's always allowed (siloed)
            if (r.project_id === projectId) return true

            // If the chunk belongs to the Agency and we are a client portal,
            // ONLY allow "Master Knowledge" or "Shared" tables.
            // This prevents CRM data leakage (e.g. GHL contacts from another client).
            const GLOBAL_TABLES = ["project_knowledge", "ai_signals", "session_summaries", "news_intelligence"]
            const isGlobalTable = GLOBAL_TABLES.includes(r.source_table)

            return isGlobalTable
        }).map(r => ({
            ...r,
            content: r.project_id === agencyProjectId ? `[AGENCY_SHARED] ${r.content}` : r.content
        }))
    }

    /**
     * Convenience method to return RAG results as a single prompt-ready string.
     */
    async searchAsContext(params: Parameters<RagService["search"]>[0]): Promise<string> {
        const results = await this.search(params)
        if (results.length === 0) return "No relevant historical context found."

        return results
            .map(r => `[Source: ${r.source_table}] ${r.content}`)
            .join("\n\n")
    }
}
