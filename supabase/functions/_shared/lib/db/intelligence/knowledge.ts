/**
 * _shared/lib/db/intelligence/knowledge.ts
 * Inner G Complete Agency — Project Knowledge Repository
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

export interface KnowledgePayload {
    project_id: string
    title: string
    body: string
    tags?: string[]
    is_published?: boolean
    created_by: string
}

export class KnowledgeRepo {
    constructor(private client: SupabaseClient) { }

    /**
     * Upserts knowledge to avoid duplicates during syncs.
     * We use title + project_id as a heuristic or a specific metadata tag.
     */
    async upsertKnowledge(payload: KnowledgePayload): Promise<void> {
        // We look for existing knowledge with the same title and project
        const { data: existing } = await this.client
            .from("project_knowledge")
            .select("id")
            .eq("project_id", payload.project_id)
            .eq("title", payload.title)
            .maybeSingle()

        if (existing) {
            const { error } = await this.client
                .from("project_knowledge")
                .update({
                    body: payload.body,
                    tags: payload.tags || [],
                    updated_at: new Date().toISOString()
                })
                .eq("id", existing.id)
            if (error) throw error
        } else {
            const { error } = await this.client
                .from("project_knowledge")
                .insert(payload)
            if (error) throw error
        }
    }

    /**
     * Bulk inserts knowledge (useful for high-volume syncs).
     */
    async bulkUpsertKnowledge(items: KnowledgePayload[]): Promise<void> {
        for (const item of items) {
            await this.upsertKnowledge(item)
        }
    }
}
