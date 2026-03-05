/**
 * process-embedding-jobs
 * Inner G Complete Agency — Client Intelligence Portal
 *
 * Background worker to process the RAG embedding queue.
 *
 * Flow:
 *  1. Fetch pending jobs from embedding_jobs
 *  2. For each job, fetch original row from source_table
 *  3. Format content string (e.g., "Signal: title - body")
 *  4. Call Gemini text-embedding-004 to get 1536-dim vector
 *  5. Upsert into document_embeddings
 *  6. Mark job as 'done' or 'failed'
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"
const EMBED_MODEL = "text-embedding-004"

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        )

        // 1. Fetch pending jobs
        const { data: jobs, error: jobsError } = await supabase
            .from("embedding_jobs")
            .select("*")
            .eq("status", "pending")
            .limit(10) // Process in small batches

        if (jobsError) throw jobsError
        if (!jobs || jobs.length === 0) {
            return new Response(JSON.stringify({ message: "No pending jobs" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
        }

        const stats = { processed: 0, failed: 0 }
        const geminiApiKey = Deno.env.get("GEMINI_API_KEY")

        for (const job of jobs) {
            try {
                // 2. Fetch source content
                const { data: sourceData, error: sourceError } = await supabase
                    .from(job.source_table)
                    .select("*")
                    .eq("id", job.source_id)
                    .single()

                if (sourceError || !sourceData) {
                    throw new Error(`Source row not found in ${job.source_table}`)
                }

                // 3. Construct text chunk
                let contentChunk = ""
                if (job.source_table === "campaign_metrics") {
                    contentChunk = `Campaign KPI Snapshot [${sourceData.snapshot_date}]: Signups: ${sourceData.total_signups}, New Today: ${sourceData.new_signups_today}, App Installs: ${sourceData.app_installs}, Activation Rate: ${(sourceData.activation_rate * 100).toFixed(2)}%, Reach: ${sourceData.social_reach}.`
                } else if (job.source_table === "ai_signals") {
                    contentChunk = `AI Intelligence Signal [${sourceData.severity}]: ${sourceData.title}. Analysis: ${sourceData.body}. Action Recommended: ${sourceData.action_label}.`
                } else if (job.source_table === "activity_log") {
                    contentChunk = `System Activity [${sourceData.category}]: ${sourceData.action}. Triggered by: ${sourceData.actor}.`
                } else {
                    contentChunk = JSON.stringify(sourceData)
                }

                // 4. Call Gemini Embeddings
                const embedRes = await fetch(
                    `${GEMINI_API_BASE}/models/${EMBED_MODEL}:embedContent?key=${geminiApiKey}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            model: `models/${EMBED_MODEL}`,
                            content: { parts: [{ text: contentChunk }] }
                        }),
                    }
                )

                if (!embedRes.ok) {
                    const error = await embedRes.json()
                    throw new Error(`Gemini API Error: ${JSON.stringify(error)}`)
                }

                const embedData = await embedRes.json()
                const embedding = embedData.embedding?.values

                if (!embedding) throw new Error("No embedding values returned from Gemini")

                // 5. Upsert into document_embeddings
                const { error: upsertError } = await supabase
                    .from("document_embeddings")
                    .upsert({
                        project_id: job.project_id,
                        source_table: job.source_table,
                        source_id: job.source_id,
                        content_chunk: contentChunk,
                        embedding: embedding
                    }, { onConflict: 'source_table,source_id' })

                if (upsertError) throw upsertError

                // 6. Mark job as done
                await supabase
                    .from("embedding_jobs")
                    .update({ status: "done", processed_at: new Date().toISOString() })
                    .eq("id", job.id)

                stats.processed++

            } catch (jobErr) {
                console.error(`[Embedding Worker] Job ${job.id} failed:`, jobErr)
                await supabase
                    .from("embedding_jobs")
                    .update({ status: "failed", error_message: String(jobErr) })
                    .eq("id", job.id)
                stats.failed++
            }
        }

        return new Response(JSON.stringify({ data: stats, error: null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

    } catch (err) {
        console.error("[Embedding Worker] Fatal Error:", err)
        return new Response(JSON.stringify({ data: null, error: { code: "SERVER_ERROR", message: String(err) } }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }
})
