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

export function formatProjectKnowledge(row: any): string {
    const tags = Array.isArray(row.tags) ? row.tags.join(", ") : ""
    return `Project Knowledge — ${row.title ?? "Untitled"} [${tags}]: ${row.body ?? ""}`
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
    return `YouTube Video Performance & Agency Philosophy: "${row.title || "Untitled"}" [ID: ${row.video_id}]. Published on ${published}. URL: ${row.video_url || "N/A"}. Stats: ${views.toLocaleString()} views, ${likes.toLocaleString()} likes. Description: ${row.description || "No description"}. [AGENCY LINE OF THINKING & VALUES TRANSCRIPT]: ${row.transcript?.slice(0, 6000) || "No transcript available."}`
}

export function formatLinkedinPage(row: any): string {
    const followers = row.follower_count ?? 0
    const views = row.total_views ?? 0
    const clicks = row.total_clicks ?? 0
    const engagement = row.engagement_rate != null ? (row.engagement_rate * 100).toFixed(1) : "N/A"
    const date = row.last_synced_at ? new Date(row.last_synced_at).toISOString().split("T")[0] : "recently"
    return `LinkedIn Page Analysis [${row.linkedin_page_id}]: "${row.name || "Untitled"}". Stats as of ${date}: ${followers.toLocaleString()} followers, ${views.toLocaleString()} impressions, ${clicks.toLocaleString()} clicks, ${engagement}% engagement rate.`
}

export function formatLinkedinPost(row: any): string {
    const views = row.view_count ?? 0
    const likes = row.like_count ?? 0
    const comments = row.comment_count ?? 0
    const shares = row.share_count ?? 0
    const published = row.published_at ? new Date(row.published_at).toISOString().split("T")[0] : "unknown"
    return `LinkedIn Post Performance: "${row.content?.slice(0, 100) || "No content"}..." [ID: ${row.linkedin_post_id}]. Published on ${published}. Lifetime Stats: ${views.toLocaleString()} impressions, ${likes.toLocaleString()} likes, ${comments.toLocaleString()} comments, ${shares.toLocaleString()} shares.`
}

export function formatNotionPage(row: any): string {
    const title = row.title ?? "Untitled Notion Page"
    const date = row.last_edited_time ? new Date(row.last_edited_time).toISOString().split("T")[0] : "recently"
    const content = row.content || "No content."
    return `Notion Page [${date}]: "${title}". Content: ${content}`
}

export function formatTiktokAccount(row: any): string {
    const followers = row.follower_count ?? 0
    const hearts = row.heart_count ?? 0
    const videos = row.video_count ?? 0
    const date = row.last_synced_at ? new Date(row.last_synced_at).toISOString().split("T")[0] : "recently"
    return `TikTok Account Analysis [${row.tiktok_user_id}]: "${row.display_name || row.username}". Stats as of ${date}: ${followers.toLocaleString()} followers, ${hearts.toLocaleString()} hearts, ${videos.toLocaleString()} videos.`
}

export function formatTiktokVideo(row: any): string {
    const views = row.view_count ?? 0
    const likes = row.like_count ?? 0
    const comments = row.comment_count ?? 0
    const shares = row.share_count ?? 0
    const published = row.published_at ? new Date(row.published_at).toISOString().split("T")[0] : "unknown"
    return `TikTok Video Performance: "${row.title || "Untitled"}" [ID: ${row.tiktok_video_id}]. Published on ${published}. Lifetime Stats: ${views.toLocaleString()} views, ${likes.toLocaleString()} likes, ${comments.toLocaleString()} comments, ${shares.toLocaleString()} shares.`
}

export function formatNewsIntelligence(row: any): string {
    const bucket = row.bucket ? row.bucket.replace(/_/g, " ") : "general"
    const published = row.published_at ? new Date(row.published_at).toISOString().split("T")[0] : "unknown"
    return `Trending News [${bucket.toUpperCase()}] (${published}): "${row.title || "Untitled"}" via ${row.source_name || "Unknown Source"}. Summary: ${row.description || "No description available."} Link: ${row.url}`
}

export function formatLinkedinComment(row: any): string {
    const date = row.created_at ? new Date(row.created_at).toISOString().split("T")[0] : "recently"
    return `LinkedIn Comment [${date}]: "${row.content || "No content"}" (Actor: ${row.actor_urn || "Unknown"})${row.parent_comment_id ? ` [Reply to: ${row.parent_comment_id}]` : ""}`
}

export function formatGithubCommit(row: any): string {
    const date = row.committed_at ? new Date(row.committed_at).toISOString().split("T")[0] : "recently"
    return `GitHub Commit [${date}]: "${row.message || "No message"}" by ${row.author_name || "Unknown"} [SHA: ${row.sha?.slice(0, 7) || "N/A"}]`
}

export function formatGithubPullRequest(row: any): string {
    const state = row.state?.toUpperCase() || "OPEN"
    const date = row.created_at ? new Date(row.created_at).toISOString().split("T")[0] : "recently"
    return `GitHub PR #${row.number || "0"} [${state}] (${date}): "${row.title || "Untitled"}". ${row.body ? `Description: ${row.body.slice(0, 200)}...` : ""}`
}

export function formatTwitterAccount(row: any): string {
    const followers = row.followers_count ?? 0
    const following = row.following_count ?? 0
    const tweets = row.tweet_count ?? 0
    return `X (Twitter) Account [${row.username}]: "${row.name || "Untitled"}". Stats: ${followers.toLocaleString()} followers, ${following.toLocaleString()} following, ${tweets.toLocaleString()} total tweets.`
}

export function formatTwitterTweet(row: any): string {
    const likes = row.like_count ?? 0
    const retweets = row.retweet_count ?? 0
    const impressions = row.impression_count ?? 0
    const date = row.created_at ? new Date(row.created_at).toISOString().split("T")[0] : "recently"
    return `X (Twitter) Tweet [${date}]: "${row.text?.slice(0, 100) || "No text"}..." Stats: ${impressions.toLocaleString()} impressions, ${likes.toLocaleString()} likes, ${retweets.toLocaleString()} retweets.`
}

export function formatInstagramMedia(row: any): string {
    const type = row.media_type || "MEDIA"
    const likes = row.like_count ?? 0
    const comments = row.comments_count ?? 0
    const date = row.timestamp ? new Date(row.timestamp).toISOString().split("T")[0] : "recently"
    return `Instagram ${type} [${date}]: "${row.caption?.slice(0, 100) || "No caption"}..." Stats: ${likes.toLocaleString()} likes, ${comments.toLocaleString()} comments.`
}

export function formatInstagramComment(row: any): string {
    const date = row.timestamp ? new Date(row.timestamp).toISOString().split("T")[0] : "recently"
    return `Instagram Comment [${date}]: "${row.text || "No content"}" by ${row.username || "Unknown"}`
}

export function formatGithubRepo(row: any): string {
    return `GitHub Repository: "${row.full_name || row.name}" [Language: ${row.language || "Unknown"}]. Stars: ${row.stargazers_count ?? 0}, Forks: ${row.forks_count ?? 0}. Description: ${row.description || "No description"}.`
}

export function formatGrowthAuditLead(row: any): string {
    const status = row.status || "new"
    const score = row.audit_score != null ? `${row.audit_score}/100` : "N/A"
    return `Growth Audit Lead [${status}]: ${row.company_name || "Unknown Company"} (${row.contact_name || "Unknown Contact"}). Website: ${row.website_url || "N/A"}. AI Audit Score: ${score}.`
}

export function formatPixelEvent(row: any): string {
    const type = row.event_type || "view"
    const url = row.url || "unknown"
    const date = row.created_at ? new Date(row.created_at).toISOString().split("T")[0] : "recently"
    return `Pixel Event [${date}]: ${type.toUpperCase()} on ${url}. Session ID: ${row.session_id || "N/A"}.`
}

export function formatPixelVisitor(row: any): string {
    const country = row.country || "Unknown"
    const device = row.device_type || "unknown"
    return `Pixel Visitor: [${row.visitor_id}] from ${country}. Device: ${device}. Channels: ${row.last_source || "direct"}.`
}

export function formatSocialContentPlan(row: any): string {
    const platform = row.platform || "unknown"
    const status = row.status || "draft"
    const date = row.scheduled_at ? new Date(row.scheduled_at).toISOString().split("T")[0] : "unscheduled"
    return `Social Content Plan [${platform.toUpperCase()} — ${status}]: "${row.title || "Untitled"}". Scheduled for: ${date}. Content: ${row.content?.slice(0, 200) || "No content."}`
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
            case "project_knowledge": return formatProjectKnowledge(row)
            case "session_summaries": return formatSessionSummary(row)
            case "ghl_pipelines": return formatGhlPipeline(row)
            case "ghl_pipeline_stages": return formatGhlPipelineStage(row)
            case "ghl_opportunities": return formatGhlOpportunity(row)
            case "youtube_channels": return formatYoutubeChannel(row)
            case "youtube_videos": return formatYoutubeVideo(row)
            case "linkedin_pages": return formatLinkedinPage(row)
            case "linkedin_posts": return formatLinkedinPost(row)
            case "notion_pages": return formatNotionPage(row)
            case "tiktok_accounts": return formatTiktokAccount(row)
            case "tiktok_videos": return formatTiktokVideo(row)
            case "news_intelligence": return formatNewsIntelligence(row)
            case "linkedin_comments": return formatLinkedinComment(row)
            case "github_commits": return formatGithubCommit(row)
            case "github_pull_requests": return formatGithubPullRequest(row)
            case "twitter_accounts": return formatTwitterAccount(row)
            case "twitter_tweets": return formatTwitterTweet(row)
            case "instagram_media": return formatInstagramMedia(row)
            case "instagram_comments": return formatInstagramComment(row)
            case "github_repos": return formatGithubRepo(row)
            case "growth_audit_leads": return formatGrowthAuditLead(row)
            case "pixel_events": return formatPixelEvent(row)
            case "pixel_visitors": return formatPixelVisitor(row)
            case "social_content_plan": return formatSocialContentPlan(row)
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
