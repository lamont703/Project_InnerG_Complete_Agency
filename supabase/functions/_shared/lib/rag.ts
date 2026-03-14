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
import { getEnv } from "./env.ts"

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
    }): Promise<RagResult[]> {
        const { projectId, query, limit = 10, minSimilarity = 0.35, includeAgencyKnowledge = false } = params

        // 1. Generate search vector
        const apiKey = getEnv("GEMINI_API_KEY")
        const embedding = await embedText(query, apiKey)
        if (!embedding) return []

        // 2. Execute RPC call to match_documents (Postgres pgvector)
        // This RPC exists in Migration 025
        const { data, error } = await this.client.rpc("match_documents", {
            query_embedding: embedding,
            match_threshold: minSimilarity,
            match_count: limit,
            p_project_id: projectId
        })

        if (error) {
            console.error("[RagService] Vector search error:", error)
            return []
        }

        return (data || []) as RagResult[]
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
