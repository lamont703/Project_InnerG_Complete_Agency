/**
 * process-embedding-jobs/service.ts
 * Inner G Complete Agency — Embedding Job Processor Service
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This file ONLY contains business logic.
 * It must NOT handle CORS, authentication, or HTTP responses.
 * To add a new source table formatter, edit formatters.ts.
 * All secrets are injected via the constructor from index.ts.
 * ─────────────────────────────────────────────────────────
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Repo, Logger, embedText } from "../_shared/lib/index.ts"
import { formatSourceRow, DAILY_SUMMARY_TABLES } from "./formatters.ts"

export class EmbeddingService {
    private repo: Repo.EmbeddingRepo

    constructor(private adminClient: SupabaseClient, private logger: Logger, private geminiApiKey: string) {
        this.repo = new Repo.EmbeddingRepo(adminClient)
    }

    async processBatch(limit = 10, force = false): Promise<{ processed: number; failed: number }> {
        const jobs = await this.repo.getPendingJobs(limit)

        let processed = 0
        let failed = 0

        for (const job of jobs) {
            try {
                this.logger.info(`Processing job ${job.id} for ${job.source_table}:${job.source_id}`)

                // 1. Fetch Source Data
                const { data: sourceData, error } = await this.adminClient
                    .from(job.source_table)
                    .select("*")
                    .eq("id", job.source_id)
                    .single()

                if (error || !sourceData) {
                    throw new Error(`Source row not found: ${job.source_table}:${job.source_id}`)
                }

                // 2. Format
                const contentChunk = formatSourceRow(job.source_table, sourceData)

                // 3. Embed
                const embedding = await embedText(contentChunk, this.geminiApiKey)
                if (!embedding) throw new Error("Failed to generate embedding")

                // 4. Store Vector
                await this.repo.upsertEmbedding({
                    project_id: job.project_id || null,
                    source_table: job.source_table,
                    source_id: job.source_id,
                    content_chunk: contentChunk,
                    embedding
                })

                // 5. Mark Done
                await this.repo.updateJob(job.id, { status: "done" })
                processed++

            } catch (err: any) {
                const errorMessage = err?.message || JSON.stringify(err)
                this.logger.error(`Embedding failed for job ${job.id}`, err)
                await this.repo.updateJob(job.id, {
                    status: "failed",
                    error_message: errorMessage
                })
                failed++
            }
        }

        return { processed, failed }
    }
}
