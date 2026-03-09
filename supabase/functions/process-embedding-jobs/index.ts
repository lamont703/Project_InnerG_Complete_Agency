/**
 * process-embedding-jobs (Phase B — Enhanced)
 * Inner G Complete Agency — Client Intelligence Portal
 *
 * Background worker to process the RAG embedding queue.
 * Supports two embedding strategies:
 *
 *  • per_row   — one embedding per source row (campaign_metrics, ai_signals,
 *                integration_sync_log, system_connections, agency_knowledge,
 *                session_summaries)
 *  • daily_summary — aggregate a day's events into one text chunk
 *                    (activity_log, ghl_contacts, funnel_events)
 *
 * Flow:
 *  1. Fetch pending jobs from embedding_jobs
 *  2. Group daily_summary jobs by (project_id, source_table, date)
 *  3. For per_row jobs: fetch source row → format → embed → upsert
 *  4. For daily_summary groups: fetch day's rows → summarise → embed → upsert
 *  5. Mark jobs as 'done' or 'failed'
 *
 * Manual trigger: POST with optional { "force": true } to re-process
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"
const EMBED_MODEL = "text-embedding-004"
const BATCH_LIMIT = 1 // max jobs per invocation

// ─────────────────────────────────────────────
// TEXT FORMATTING TEMPLATES
// ─────────────────────────────────────────────
// Each function receives the raw source row and returns a
// human-readable text chunk for the embedding model.

function formatCampaignMetrics(row: any): string {
    const date = row.snapshot_date ?? "Unknown Date"
    const signups = row.total_signups ?? 0
    const newToday = row.new_signups_today ?? 0
    const installs = row.app_installs ?? 0
    const activation = row.activation_rate != null ? (row.activation_rate * 100).toFixed(1) : "N/A"
    const reach = row.social_reach ?? 0
    const engagement = row.social_engagement ?? 0
    const sentiment = row.sentiment_positive_pct != null ? (row.sentiment_positive_pct * 100).toFixed(1) : "N/A"
    const impressions = row.ad_impressions ?? 0
    const visits = row.landing_page_visits ?? 0
    return `Campaign KPI Snapshot [${date}]: Total Signups: ${signups}, New Today: ${newToday}, App Installs: ${installs}, Activation Rate: ${activation}%, Social Reach: ${reach}, Social Engagement: ${engagement}, Positive Sentiment: ${sentiment}%, Ad Impressions: ${impressions}, Landing Page Visits: ${visits}.`
}

function formatAiSignal(row: any): string {
    const severity = row.severity ?? "info"
    const signalType = row.signal_type ?? "general"
    return `AI Intelligence Signal [${severity.toUpperCase()} — ${signalType}]: ${row.title ?? "Untitled"}. Analysis: ${row.body ?? "No details."}. ${row.action_label ? `Action Recommended: ${row.action_label}.` : ""} ${row.is_resolved ? "(Resolved)" : "(Active)"}`
}

function formatActivityLog(row: any): string {
    const category = row.category ?? "system"
    const actor = row.triggered_by ? `User ${row.triggered_by}` : "System"
    const date = row.created_at ? new Date(row.created_at).toISOString().split("T")[0] : "Unknown Date"
    return `Activity [${category}] on ${date}: ${row.action ?? "Unknown action"}. Triggered by: ${actor}.`
}

function formatGhlContact(row: any): string {
    const name = row.full_name ?? "Unknown"
    const email = row.email ?? "No email"
    const phone = row.phone ?? "No phone"
    const syncDate = row.synced_at ? new Date(row.synced_at).toISOString().split("T")[0] : "Unknown"
    return `GHL Contact [${syncDate}]: ${name} — Email: ${email}, Phone: ${phone}.`
}

function formatFunnelEvent(row: any): string {
    const date = row.snapshot_date ?? "Unknown Date"
    const count = row.count ?? 0
    return `Funnel Event [${date}]: Stage ID ${row.funnel_stage_id} — ${count} entries.`
}

function formatIntegrationSyncLog(row: any): string {
    const integration = row.integration ?? "Unknown"
    const status = row.status ?? "unknown"
    const records = row.records_synced ?? 0
    const date = row.synced_at ? new Date(row.synced_at).toISOString().split("T")[0] : "Unknown Date"
    return `Integration Sync [${date}]: ${integration} — Status: ${status}, Records Synced: ${records}. ${row.error_message ? `Error: ${row.error_message}` : ""}`
}

function formatSystemConnection(row: any): string {
    const label = row.label ?? "Unknown"
    const platform = row.platform ?? "unknown"
    const status = row.status ?? "unknown"
    const latency = row.latency_ms != null ? `${row.latency_ms}ms` : "N/A"
    const date = row.checked_at ? new Date(row.checked_at).toISOString().split("T")[0] : "Unknown Date"
    return `System Connection [${date}]: ${label} (${platform}) — Status: ${status}, Latency: ${latency}.`
}

function formatAgencyKnowledge(row: any): string {
    const tags = Array.isArray(row.tags) ? row.tags.join(", ") : ""
    return `Agency Knowledge — ${row.title ?? "Untitled"} [${tags}]: ${row.body ?? ""}`
}

function formatSessionSummary(row: any): string {
    const date = row.generated_at ? new Date(row.generated_at).toISOString().split("T")[0] : "Unknown Date"
    const count = row.message_count ?? 0
    return `Session Summary [${date}, ${count} messages]: ${row.summary ?? ""}`
}

function formatGhlPipeline(row: any): string {
    return `GHL Sales Pipeline: "${row.name || 'Unnamed'}" [GHL ID: ${row.ghl_pipeline_id || 'Unknown'}]`
}

function formatGhlPipelineStage(row: any): string {
    return `GHL Pipeline Stage: "${row.name || 'Unnamed'}" at Position ${row.position ?? 0} [GHL ID: ${row.ghl_stage_id || 'Unknown'}]`
}

function formatGhlOpportunity(row: any): string {
    const valueStr = row.monetary_value != null ? `$${Number(row.monetary_value).toLocaleString()}` : "$0"
    const status = row.status || "open"
    let dateStr = "recently"
    if (row.ghl_updated_at) {
        try {
            dateStr = new Date(row.ghl_updated_at).toISOString().split("T")[0]
        } catch (_) { }
    }
    const tags = Array.isArray(row.tags) ? row.tags.join(", ") : (row.tags ? String(row.tags) : "none")
    return `GHL Opportunity: "${row.title || 'Untitled'}" — Value: ${valueStr}, Status: ${status}, Last Updated: ${dateStr}. Assigned To: ${row.assigned_to || "Unassigned"}. Tags: ${tags}.`
}

// Master formatter: pick the right template for each source table
function formatSourceRow(sourceTable: string, row: any): string {
    try {
        switch (sourceTable) {
            case "campaign_metrics": return formatCampaignMetrics(row)
            case "ai_signals": return formatAiSignal(row)
            case "activity_log": return formatActivityLog(row)
            case "ghl_contacts": return formatGhlContact(row)
            case "funnel_events": return formatFunnelEvent(row)
            case "integration_sync_log": return formatIntegrationSyncLog(row)
            case "system_connections": return formatSystemConnection(row)
            case "agency_knowledge": return formatAgencyKnowledge(row)
            case "session_summaries": return formatSessionSummary(row)
            case "ghl_pipelines": return formatGhlPipeline(row)
            case "ghl_pipeline_stages": return formatGhlPipelineStage(row)
            case "ghl_opportunities": return formatGhlOpportunity(row)
            default: return JSON.stringify(row)
        }
    } catch (err) {
        console.error(`[Embedding Worker] Formatter failed for ${sourceTable}:`, err)
        return JSON.stringify(row)
    }
}

// Tables that use daily summary strategy
const DAILY_SUMMARY_TABLES = new Set(["activity_log", "ghl_contacts", "funnel_events"])

// ─────────────────────────────────────────────
// EMBED HELPER
// ─────────────────────────────────────────────

async function embedText(text: string, geminiApiKey: string): Promise<number[] | null> {
    console.log(`[embedText] Embedding ${text.length} chars...`)
    const res = await fetch(
        `${GEMINI_API_BASE}/models/${EMBED_MODEL}:embedContent?key=${encodeURIComponent(geminiApiKey)}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: `models/${EMBED_MODEL}`,
                content: { parts: [{ text }] },
            }),
        }
    )

    if (!res.ok) {
        const error = await res.json()
        throw new Error(`Gemini Embedding API Error: ${JSON.stringify(error)}`)
    }

    const data = await res.json()
    return data.embedding?.values ?? null
}

// ─────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        console.log("[Embedding Worker] Invoked.")
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        )
        const geminiApiKey = Deno.env.get("GEMINI_API_KEY")!

        // Optional body params for manual triggers
        let forceReprocess = false
        try {
            const body = await req.json()
            forceReprocess = body?.force === true
        } catch {
            // No body — that's fine for cron triggers
        }

        // 1. Fetch pending jobs (or all jobs if force=true)
        let query = supabase
            .from("embedding_jobs")
            .select("*")
            .order("created_at", { ascending: true })
            .limit(BATCH_LIMIT)

        if (!forceReprocess) {
            query = query.eq("status", "pending")
        }

        const { data: jobs, error: jobsError } = await query
        if (jobsError) throw jobsError
        if (!jobs || jobs.length === 0) {
            return new Response(
                JSON.stringify({ message: "No pending jobs", stats: { processed: 0, failed: 0, summaries: 0 } }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        const stats = { processed: 0, failed: 0, summaries: 0 }

        // 2. Separate per-row and daily-summary jobs
        const perRowJobs = jobs.filter((j: any) => !DAILY_SUMMARY_TABLES.has(j.source_table))
        const dailySummaryJobs = jobs.filter((j: any) => DAILY_SUMMARY_TABLES.has(j.source_table))

        // ── PER-ROW PROCESSING ──────────────────────────────────

        for (const job of perRowJobs) {
            try {
                console.log(`[Worker] Starting job: ${job.source_table} ID: ${job.source_id}`)
                // Fetch source row
                const { data: sourceData, error: sourceError } = await supabase
                    .from(job.source_table)
                    .select("*")
                    .eq("id", job.source_id)
                    .single()

                if (sourceError || !sourceData) {
                    throw new Error(`Source row not found in ${job.source_table}: ${job.source_id}`)
                }

                // Format text chunk
                const contentChunk = formatSourceRow(job.source_table, sourceData)

                // Embed
                const embedding = await embedText(contentChunk, geminiApiKey)
                if (!embedding) throw new Error("No embedding values returned from Gemini")

                // Upsert into document_embeddings
                const { error: upsertError } = await supabase
                    .from("document_embeddings")
                    .upsert({
                        project_id: job.project_id || null,
                        source_table: job.source_table,
                        source_id: job.source_id,
                        content_chunk: contentChunk,
                        embedding,
                    }, { onConflict: "source_table,source_id" })

                if (upsertError) throw upsertError

                // Mark done
                await supabase
                    .from("embedding_jobs")
                    .update({ status: "done", processed_at: new Date().toISOString() })
                    .eq("id", job.id)

                stats.processed++

            } catch (err) {
                console.error(`[Embedding Worker] Per-row job ${job.id} failed:`, err)
                await supabase
                    .from("embedding_jobs")
                    .update({ status: "failed", error_message: String(err) })
                    .eq("id", job.id)
                stats.failed++
            }
        }

        // ── DAILY SUMMARY PROCESSING ────────────────────────────
        // Group daily-summary jobs by (project_id, source_table, date).
        // For each group, build one aggregated text chunk describing
        // the full day's events, embed it, and store a single vector.

        // Build groups
        const summaryGroups = new Map<string, { projectId: string | null; sourceTable: string; date: string; jobIds: string[] }>()

        for (const job of dailySummaryJobs) {
            const jobDate = new Date(job.created_at).toISOString().split("T")[0]
            const key = `${job.project_id ?? "agency"}::${job.source_table}::${jobDate}`

            if (!summaryGroups.has(key)) {
                summaryGroups.set(key, {
                    projectId: job.project_id,
                    sourceTable: job.source_table,
                    date: jobDate,
                    jobIds: [],
                })
            }
            summaryGroups.get(key)!.jobIds.push(job.id)
        }

        for (const [_key, group] of summaryGroups) {
            try {
                // Fetch all source rows for this group
                const sourceIds = dailySummaryJobs
                    .filter((j: any) =>
                        (j.project_id ?? "agency") === (group.projectId ?? "agency") &&
                        j.source_table === group.sourceTable &&
                        new Date(j.created_at).toISOString().split("T")[0] === group.date
                    )
                    .map((j: any) => j.source_id)

                const { data: sourceRows } = await supabase
                    .from(group.sourceTable)
                    .select("*")
                    .in("id", sourceIds)

                if (!sourceRows || sourceRows.length === 0) {
                    throw new Error(`No source rows found for ${group.sourceTable} summary`)
                }

                // Build daily summary text based on table type
                let summaryText = ""

                if (group.sourceTable === "activity_log") {
                    const categories = new Map<string, number>()
                    for (const row of sourceRows) {
                        const cat = row.category ?? "system"
                        categories.set(cat, (categories.get(cat) || 0) + 1)
                    }
                    const catBreakdown = Array.from(categories.entries())
                        .map(([cat, count]) => `${cat}: ${count}`)
                        .join(", ")
                    const sampleActions = sourceRows.slice(0, 5).map((r: any) => r.action).join("; ")
                    summaryText = `Activity Log Daily Summary [${group.date}]: ${sourceRows.length} events across categories — ${catBreakdown}. Sample actions: ${sampleActions}.`

                } else if (group.sourceTable === "ghl_contacts") {
                    const names = sourceRows.map((r: any) => r.full_name ?? "Unknown").slice(0, 10)
                    summaryText = `GHL Contacts Daily Summary [${group.date}]: ${sourceRows.length} new contacts synced. Names include: ${names.join(", ")}.`

                } else if (group.sourceTable === "funnel_events") {
                    const totalCount = sourceRows.reduce((sum: number, r: any) => sum + (r.count || 0), 0)
                    const stageBreakdown = sourceRows.map((r: any) =>
                        `Stage ${r.funnel_stage_id}: ${r.count ?? 0}`
                    ).join(", ")
                    summaryText = `Funnel Events Daily Summary [${group.date}]: ${totalCount} total entries across ${sourceRows.length} stages. Breakdown: ${stageBreakdown}.`

                } else {
                    // Fallback: concatenate individual formatted rows
                    summaryText = sourceRows.map((r: any) => formatSourceRow(group.sourceTable, r)).join(" ")
                }

                // Create a deterministic source_id for daily summaries
                // We use a namespace UUID based on the group key
                const summarySourceId = group.jobIds[0] // Use first job ID as the source reference

                // Embed the summary
                const embedding = await embedText(summaryText, geminiApiKey)
                if (!embedding) throw new Error("No embedding values returned for daily summary")

                // Upsert — using a composite key for daily summaries
                const { error: upsertError } = await supabase
                    .from("document_embeddings")
                    .upsert({
                        project_id: group.projectId || null,
                        source_table: `${group.sourceTable}_daily`,
                        source_id: summarySourceId,
                        content_chunk: summaryText,
                        embedding,
                    }, { onConflict: "source_table,source_id" })

                if (upsertError) throw upsertError

                // Mark all jobs in this group as done
                await supabase
                    .from("embedding_jobs")
                    .update({ status: "done", processed_at: new Date().toISOString() })
                    .in("id", group.jobIds)

                stats.summaries++
                stats.processed += group.jobIds.length

            } catch (err) {
                console.error(`[Embedding Worker] Daily summary failed for ${group.sourceTable} [${group.date}]:`, err)
                await supabase
                    .from("embedding_jobs")
                    .update({ status: "failed", error_message: String(err) })
                    .in("id", group.jobIds)
                stats.failed += group.jobIds.length
            }
        }

        return new Response(
            JSON.stringify({ data: stats, error: null }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )

    } catch (err) {
        console.error("[Embedding Worker] Fatal Error:", err)
        return new Response(
            JSON.stringify({ data: null, error: { code: "SERVER_ERROR", message: String(err) } }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }
})
