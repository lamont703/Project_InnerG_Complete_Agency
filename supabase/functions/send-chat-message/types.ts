/**
 * send-chat-message/types.ts
 * Inner G Complete Agency — Client Chat Function Types
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This is the data contract for this function.
 * If you need to add a field to the AI response, add it HERE
 * first. Then update prompt-engineer.ts and signal-processor.ts.
 * Never modify the AI prompt first and add types as an afterthought.
 * ─────────────────────────────────────────────────────────
 */

import { SignalPayload } from "../_shared/lib/types/index.ts"

// ─── Request ──────────────────────────────────────────────

export interface ChatRequest {
    project_id: string
    message: string
    model?: string
    session_id?: string | null
}

// ─── AI Response ──────────────────────────────────────────

export interface ParsedChatResponse {
    message: string
    signal: SignalPayload | null
}

// ─── Session & Messages ───────────────────────────────────

export interface ChatSession {
    id: string
    project_id: string
    user_id: string
    model: string
}

export interface ChatMessage {
    role: "user" | "assistant"
    content: string
    created_at?: string
}

// ─── Data Source Config ───────────────────────────────────

/** Maps agent_config boolean flags to RAG source_table values */
export const CONFIG_TO_SOURCE_TABLES: Record<string, string[]> = {
    campaign_metrics_enabled: ["campaign_metrics", "ghl_social_posts", "ghl_social_insights", "ghl_social_accounts", "social_content_plan"],
    ai_signals_enabled: ["ai_signals"],
    activity_log_enabled: ["activity_log", "activity_log_daily"],
    ghl_contacts_enabled: ["ghl_contacts", "ghl_contacts_daily", "ghl_pipelines", "ghl_pipeline_stages", "ghl_opportunities"],
    funnel_data_enabled: ["funnel_events", "funnel_events_daily"],
    integration_sync_enabled: ["integration_sync_log"],
    system_connections_enabled: ["system_connections"],
    chat_history_enabled: ["session_summaries"],
    youtube_data_enabled: ["youtube_channels", "youtube_videos"],
    linkedin_data_enabled: ["linkedin_pages", "linkedin_posts"],
    notion_data_enabled: ["notion_pages"],
    tiktok_data_enabled: ["tiktok_accounts", "tiktok_videos"],
    news_intelligence_enabled: ["news_intelligence"],
    project_knowledge_enabled: ["project_knowledge"],
}

// ─── Function Response ────────────────────────────────────

export interface ChatFunctionResponse {
    reply: string
    session_id: string | null
    signal_created: {
        id: string
        title: string
        severity: string
        signal_type: string
    } | null
}
