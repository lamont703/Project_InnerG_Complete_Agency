/**
 * process-embedding-jobs/formatters.ts
 * Inner G Complete Agency — Embedding Text Formatters
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This is the ONLY place to add or edit
 * how a database row gets converted to text for embedding.
 * If you add a new source_table, add a new formatter here
 * and register it in `formatSourceRow()`.
 * Do NOT add DB queries here. Only pure text transformation.
 * ─────────────────────────────────────────────────────────
 *
 * Each function takes a raw DB row and returns a
 * human-readable text chunk for the Gemini embedding model.
 */

export function formatCampaignMetrics(row: any): string {
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

export function formatAiSignal(row: any): string {
    const severity = row.severity ?? "info"
    const signalType = row.signal_type ?? "general"
    return `AI Intelligence Signal [${severity.toUpperCase()} — ${signalType}]: ${row.title ?? "Untitled"}. Analysis: ${row.body ?? "No details."}. ${row.action_label ? `Action Recommended: ${row.action_label}.` : ""} ${row.is_resolved ? "(Resolved)" : "(Active)"}`
}

export function formatActivityLog(row: any): string {
    const category = row.category ?? "system"
    const actor = row.triggered_by ? `User ${row.triggered_by}` : "System"
    const date = row.created_at ? new Date(row.created_at).toISOString().split("T")[0] : "Unknown Date"
    return `Activity [${category}] on ${date}: ${row.action ?? "Unknown action"}. Triggered by: ${actor}.`
}

export function formatGhlContact(row: any): string {
    const name = row.full_name ?? "Unknown"
    const email = row.email ?? "No email"
    const phone = row.phone ?? "No phone"
    const syncDate = row.synced_at ? new Date(row.synced_at).toISOString().split("T")[0] : "Unknown"
    return `GHL Contact [${syncDate}]: ${name} — Email: ${email}, Phone: ${phone}.`
}

export function formatFunnelEvent(row: any): string {
    const date = row.snapshot_date ?? "Unknown Date"
    const count = row.count ?? 0
    return `Funnel Event [${date}]: Stage ID ${row.funnel_stage_id} — ${count} entries.`
}

export function formatIntegrationSyncLog(row: any): string {
    const integration = row.integration ?? "Unknown"
    const status = row.status ?? "unknown"
    const records = row.records_synced ?? 0
    const date = row.synced_at ? new Date(row.synced_at).toISOString().split("T")[0] : "Unknown Date"
    return `Integration Sync [${date}]: ${integration} — Status: ${status}, Records Synced: ${records}. ${row.error_message ? `Error: ${row.error_message}` : ""}`
}

export function formatSystemConnection(row: any): string {
    const label = row.label ?? "Unknown"
    const platform = row.platform ?? "unknown"
    const status = row.status ?? "unknown"
    const latency = row.latency_ms != null ? `${row.latency_ms}ms` : "N/A"
    const date = row.checked_at ? new Date(row.checked_at).toISOString().split("T")[0] : "Unknown Date"
    return `System Connection [${date}]: ${label} (${platform}) — Status: ${status}, Latency: ${latency}.`
}

export function formatAgencyKnowledge(row: any): string {
    const tags = Array.isArray(row.tags) ? row.tags.join(", ") : ""
    return `Agency Knowledge — ${row.title ?? "Untitled"} [${tags}]: ${row.body ?? ""}`
}

export function formatSessionSummary(row: any): string {
    const date = row.generated_at ? new Date(row.generated_at).toISOString().split("T")[0] : "Unknown Date"
    const count = row.message_count ?? 0
    return `Session Summary [${date}, ${count} messages]: ${row.summary ?? ""}`
}

export function formatGhlPipeline(row: any): string {
    return `GHL Sales Pipeline: "${row.name || "Unnamed"}" [GHL ID: ${row.ghl_pipeline_id || "Unknown"}]`
}

export function formatGhlPipelineStage(row: any): string {
    return `GHL Pipeline Stage: "${row.name || "Unnamed"}" at Position ${row.position ?? 0} [GHL ID: ${row.ghl_stage_id || "Unknown"}]`
}

export function formatGhlOpportunity(row: any): string {
    const valueStr = row.monetary_value != null ? `$${Number(row.monetary_value).toLocaleString()}` : "$0"
    const status = row.status || "open"
    let dateStr = "recently"
    if (row.ghl_updated_at) {
        try { dateStr = new Date(row.ghl_updated_at).toISOString().split("T")[0] } catch (_) { }
    }
    const tags = Array.isArray(row.tags) ? row.tags.join(", ") : (row.tags ? String(row.tags) : "none")
    return `GHL Opportunity: "${row.title || "Untitled"}" — Value: ${valueStr}, Status: ${status}, Last Updated: ${dateStr}. Assigned To: ${row.assigned_to || "Unassigned"}. Tags: ${tags}.`
}

export function formatYoutubeChannel(row: any): string {
    const subs = row.subscriber_count ?? 0
    const views = row.view_count ?? 0
    const videos = row.video_count ?? 0
    const date = row.last_synced_at ? new Date(row.last_synced_at).toISOString().split("T")[0] : "recently"
    return `YouTube Channel Analysis [${row.channel_id}]: "${row.title || "Untitled"}". Stats as of ${date}: ${subs.toLocaleString()} subscribers, ${views.toLocaleString()} total views, ${videos.toLocaleString()} videos. Description: ${row.description || "No description"}.`
}

export function formatYoutubeVideo(row: any): string {
    const views = row.view_count ?? 0
    const likes = row.like_count ?? 0
    const comments = row.comment_count ?? 0
    const published = row.published_at ? new Date(row.published_at).toISOString().split("T")[0] : "unknown"
    return `YouTube Video Performance: "${row.title || "Untitled"}" [ID: ${row.video_id}]. Published on ${published}. Lifetime Stats: ${views.toLocaleString()} views, ${likes.toLocaleString()} likes, ${comments.toLocaleString()} comments. Description: ${row.description || "No description"}.`
}

/**
 * Master dispatcher — picks the right formatter for each source table.
 * ⚠️ Add new tables HERE. Do not add formatting logic anywhere else.
 */
export function formatSourceRow(sourceTable: string, row: any): string {
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
            case "youtube_channels": return formatYoutubeChannel(row)
            case "youtube_videos": return formatYoutubeVideo(row)
            default: return JSON.stringify(row)
        }
    } catch (err) {
        console.error(`[formatters] Failed to format row from ${sourceTable}:`, err)
        return JSON.stringify(row)
    }
}

/** Tables that use the daily-summary embedding strategy */
export const DAILY_SUMMARY_TABLES = new Set([
    "activity_log",
    "ghl_contacts",
    "funnel_events",
])
