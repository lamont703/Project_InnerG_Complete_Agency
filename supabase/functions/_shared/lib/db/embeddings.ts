/**
 * _shared/lib/db/embeddings.ts
 * Inner G Complete Agency — Embedding Queue & Vector Storage Repository
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

export interface EmbeddingJobRow {
    id: string
    project_id?: string | null
    source_table: string
    source_id: string
    status: "pending" | "processing" | "done" | "failed"
    error_message?: string | null
    created_at: string
}

export class EmbeddingRepo {
    constructor(private client: SupabaseClient) { }

    /**
     * Fetches pending embedding jobs.
     */
    async getPendingJobs(limit = 10): Promise<EmbeddingJobRow[]> {
        const { data, error } = await this.client
            .from("embedding_jobs")
            .select("*")
            .eq("status", "pending")
            .order("created_at", { ascending: true })
            .limit(limit)

        if (error) throw error
        return (data || []) as EmbeddingJobRow[]
    }

    /**
     * Updates job status.
     */
    async updateJob(id: string, payload: Partial<EmbeddingJobRow>): Promise<void> {
        const { error } = await this.client
            .from("embedding_jobs")
            .update({ ...payload, processed_at: new Date().toISOString() })
            .eq("id", id)

        if (error) throw error
    }

    /**
     * Upserts a document embedding.
     */
    async upsertEmbedding(payload: {
        project_id: string | null
        source_table: string
        source_id: string
        content_chunk: string
        embedding: number[]
    }): Promise<void> {
        const { error } = await this.client
            .from("document_embeddings")
            .upsert(payload, { onConflict: "source_table,source_id" })

        if (error) throw error
    }
}
