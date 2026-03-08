/**
 * Centralized TypeScript Type Definitions
 * Inner G Complete Agency — Client Intelligence Portal
 *
 * All shared interfaces live here. Import from "@/types" throughout the app.
 * These types mirror the Phase 2 data model exactly.
 */

import type { LucideIcon } from "lucide-react"

// ─────────────────────────────────────────────
// ENUMS (match database enum values exactly)
// ─────────────────────────────────────────────

export type UserRole = "super_admin" | "developer" | "client_admin" | "client_viewer"

export type ClientStatus = "active" | "onboarding" | "paused" | "archived"

export type ClientIndustry =
    | "retail"
    | "ebook_publishing"
    | "social_community"
    | "dating"
    | "hospitality"
    | "ecommerce"
    | "technology"
    | "healthcare"
    | "other"

export type ProjectStatus = "active" | "building" | "paused" | "archived"

export type CampaignStatus = "draft" | "active" | "paused" | "completed" | "archived"

export type SignalType = "inventory" | "conversion" | "social" | "system" | "ai_insight" | "ai_action"

export type SignalSeverity = "info" | "warning" | "critical"

export type LeadStatus =
    | "new"
    | "contacted"
    | "qualified"
    | "proposal_sent"
    | "closed_won"
    | "closed_lost"

export type ActivityCategory = "retail_ops" | "growth" | "revenue" | "crm" | "social" | "system" | "ai"

export type SocialPlatform = "instagram" | "tiktok" | "youtube" | "twitter_x"

export type ConnectionStatus = "active" | "degraded" | "offline"

export type ChatRole = "user" | "assistant"

export type ExternalDbType = "supabase" | "vercel_postgres" | "postgres" | "mysql" | "other"

export type ConnectorProvider = "supabase" | "ghl" | "postgres" | "mysql"

export type ProjectTier = "starter" | "growth" | "enterprise"

export type EmbedJobStatus = "pending" | "processing" | "done" | "failed"

export type IntegrationSource = "ghl" | "instagram" | "tiktok" | "youtube" | "twitter_x" | "client_db"

// ─────────────────────────────────────────────
// IDENTITY DOMAIN
// ─────────────────────────────────────────────

export interface User {
    id: string // uuid — mirrors auth.users.id
    email: string
    full_name: string | null
    role: UserRole
    avatar_url: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface DeveloperClientAccess {
    id: string
    developer_id: string
    client_id: string
    assigned_at: string
    assigned_by: string
}

export interface ProjectUserAccess {
    id: string
    project_id: string
    user_id: string
    granted_at: string
    granted_by: string
}

export interface InviteLink {
    id: string
    token: string // sha256 random — used in URL
    invited_email: string
    intended_role: UserRole
    invited_by: string
    client_id: string | null // null for developer invites
    expires_at: string
    used_at: string | null
    is_active: boolean
    created_at: string
}

// ─────────────────────────────────────────────
// AGENCY DOMAIN
// ─────────────────────────────────────────────

export interface Client {
    id: string
    name: string
    industry: ClientIndustry
    status: ClientStatus
    primary_contact_name: string | null
    primary_contact_email: string | null
    ghl_location_id: string | null
    notes: string | null
    created_at: string
    updated_at: string
}

export interface Project {
    id: string
    client_id: string
    name: string
    slug: string // unique — used in URLs e.g. "kanes-bookstore"
    type: string
    status: ProjectStatus
    active_campaign_name: string | null
    created_at: string
    updated_at: string
    // Joined from clients table (optional)
    client?: Pick<Client, "name" | "industry" | "status">
}

// ─────────────────────────────────────────────
// CAMPAIGNS DOMAIN
// ─────────────────────────────────────────────

export interface Campaign {
    id: string
    project_id: string
    name: string
    goal: string | null
    status: CampaignStatus
    start_date: string | null
    end_date: string | null
    ghl_campaign_id: string | null
    ig_hashtag: string | null
    created_at: string
    updated_at: string
}

export interface CampaignMetric {
    id: string
    campaign_id: string
    snapshot_date: string // YYYY-MM-DD
    total_signups: number
    new_signups_today: number
    app_installs: number
    activation_rate: number // 0.0–1.0
    social_reach: number
    social_engagement: number
    sentiment_positive_pct: number // 0.0–1.0
    ad_impressions: number
    landing_page_visits: number
    created_at: string
}

export interface FunnelStage {
    id: string
    campaign_id: string
    name: string
    position: number // sort order
    created_at: string
}

export interface FunnelEvent {
    id: string
    funnel_stage_id: string
    snapshot_date: string
    count: number
    created_at: string
}

// ─────────────────────────────────────────────
// SIGNALS DOMAIN
// ─────────────────────────────────────────────

export interface AiSignal {
    id: string
    project_id: string
    signal_type: SignalType
    title: string
    body: string
    action_label: string | null
    action_url: string | null
    severity: SignalSeverity
    is_resolved: boolean
    resolved_by: string | null
    resolved_at: string | null
    created_at: string
}

// ─────────────────────────────────────────────
// LEADS DOMAIN
// ─────────────────────────────────────────────

export interface GrowthAuditLead {
    id: string
    full_name: string
    email: string
    company_name: string
    challenge: string | null
    status: LeadStatus
    ghl_contact_id: string | null
    assigned_to: string | null
    submitted_at: string
    updated_at: string
}

// ─────────────────────────────────────────────
// ACTIVITY DOMAIN
// ─────────────────────────────────────────────

export interface ActivityLogEntry {
    id: string
    project_id: string
    action: string
    category: ActivityCategory
    triggered_by: string | null // user_id or "system"
    created_at: string
}

// ─────────────────────────────────────────────
// INTEGRATIONS DOMAIN
// ─────────────────────────────────────────────

export interface GhlContact {
    id: string
    project_id: string
    ghl_contact_id: string
    email: string | null
    phone: string | null
    full_name: string | null
    synced_at: string
    created_at: string
}

export interface SocialAccount {
    id: string
    project_id: string
    platform: SocialPlatform
    handle: string
    access_token_encrypted: string
    token_expires_at: string | null
    connected_at: string
}

export interface IntegrationSyncLog {
    id: string
    project_id: string
    integration: IntegrationSource
    status: "success" | "partial" | "failed"
    records_synced: number
    error_message: string | null
    synced_at: string
}

export interface SystemConnection {
    id: string
    project_id: string
    label: string
    platform: string
    status: ConnectionStatus
    latency_ms: number | null
    checked_at: string
}

export interface ClientDbConnection {
    id: string
    project_id: string
    label: string
    db_type: ExternalDbType
    connection_url_encrypted: string // NEVER exposed to browser
    aggregation_config: Record<string, unknown> | null // JSON
    is_active: boolean
    created_at: string
    updated_at: string
    // Phase 5 additions
    connector_type_id: string | null
    client_id: string | null
    is_shared: boolean
}

// ─────────────────────────────────────────────
// AI ASSISTANT DOMAIN
// ─────────────────────────────────────────────

export interface ChatSession {
    id: string
    project_id: string
    user_id: string
    model_used: string // e.g. "gemini-1.5-flash"
    title: string | null
    total_input_tokens: number
    total_output_tokens: number
    created_at: string
    updated_at: string
}

export interface ChatMessage {
    id: string
    session_id: string
    role: ChatRole
    content: string
    input_tokens: number | null
    output_tokens: number | null
    created_at: string
}

// ─────────────────────────────────────────────
// AI KNOWLEDGE / RAG DOMAIN
// ─────────────────────────────────────────────

export interface DocumentEmbedding {
    id: string
    project_id: string
    source_table: string // e.g. "campaign_metrics", "ai_signals"
    source_id: string // uuid of originating row
    content_chunk: string // the text that was embedded
    // embedding: vector(1536) — handled server-side only, never exposed to browser
    created_at: string
}

export interface EmbeddingJob {
    id: string
    project_id: string
    source_table: string
    source_id: string
    status: EmbedJobStatus
    error_message: string | null
    created_at: string
    processed_at: string | null
}

// ─────────────────────────────────────────────
// AGENCY KNOWLEDGE DOMAIN (Phase 5)
// ─────────────────────────────────────────────

export interface AgencyKnowledge {
    id: string
    title: string
    body: string
    tags: string[]
    is_published: boolean
    created_by: string
    created_at: string
    updated_at: string
}

// ─────────────────────────────────────────────
// AI AGENT CONFIG DOMAIN (Phase 5)
// ─────────────────────────────────────────────

export interface ProjectAgentConfig {
    id: string
    project_id: string
    campaign_metrics_enabled: boolean
    ai_signals_enabled: boolean
    activity_log_enabled: boolean
    ghl_contacts_enabled: boolean
    funnel_data_enabled: boolean
    integration_sync_enabled: boolean
    system_connections_enabled: boolean
    chat_history_enabled: boolean
    created_at: string
    updated_at: string
}

// ─────────────────────────────────────────────
// TOKEN USAGE DOMAIN (Phase 5)
// ─────────────────────────────────────────────

export interface TokenUsageMonthly {
    id: string
    project_id: string
    user_id: string
    month: string // YYYY-MM-DD (first day of month)
    input_tokens: number
    output_tokens: number
    total_tokens: number // generated column
    updated_at: string
}

// ─────────────────────────────────────────────
// SESSION SUMMARY DOMAIN (Phase 5)
// ─────────────────────────────────────────────

export interface SessionSummary {
    id: string
    session_id: string
    project_id: string
    user_id: string
    summary: string
    message_count: number
    generated_at: string
}

// ─────────────────────────────────────────────
// CONNECTOR TYPES DOMAIN (Phase 5)
// ─────────────────────────────────────────────

export interface ConnectorType {
    id: string
    name: string
    provider: ConnectorProvider
    description: string | null
    config_schema: Record<string, unknown> | null
    is_active: boolean
    created_at: string
}

// ─────────────────────────────────────────────
// UI-ONLY TYPES (not persisted — frontend display helpers)
// ─────────────────────────────────────────────

/** Portal card shown on /select-portal — populated from projects table */
export interface PortalCard {
    id: string
    name: string
    client: string
    status: string
    type: string
    campaign: string
    lastActivity: string
    metrics: string
    icon: LucideIcon
    href: string
}

/** Status item shown in the Connection Status grid on /dashboard */
export interface StatusCard {
    id: string
    label: string
    icon: LucideIcon
    status: string
    details: string
    color: string
}

/** AI Signal card displayed on dashboard */
export interface SignalCard {
    id: string
    signalType: SignalType
    title: string
    body: string
    actionLabel: string
    severity: SignalSeverity
    color: string
    buttonColor: string
}

/** A single KPI metric tile on the dashboard */
export interface KpiMetric {
    label: string
    value: string
    growth: string
    icon: LucideIcon
    color: string
}

/** A single row in the Recent Activity feed */
export interface ActivityEntry {
    time: string
    action: string
    category: string
}

/** A single step in the campaign funnel visualization */
export interface FunnelRow {
    step: string
    count: string
    percent: number
    color: string
}

// ─────────────────────────────────────────────
// API RESPONSE WRAPPERS
// ─────────────────────────────────────────────

export interface ApiSuccess<T> {
    data: T
    error: null
}

export interface ApiError {
    data: null
    error: {
        code: string
        message: string
        details?: Record<string, unknown>
    }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ─────────────────────────────────────────────
// EDGE FUNCTION PAYLOAD TYPES
// ─────────────────────────────────────────────

export interface SubmitLeadPayload {
    full_name: string
    email: string
    company_name: string
    challenge?: string
}

export interface SendChatMessagePayload {
    session_id?: string // omit to start new session
    project_id: string
    message: string
    model?: string // defaults to gemini-1.5-flash
}

export interface SendChatMessageResponse {
    session_id: string
    message_id: string
    reply: string
    model_used: string
    input_tokens: number
    output_tokens: number
}

export interface ResolveSignalPayload {
    signal_id: string
    project_id: string
}

export interface GenerateInviteLinkPayload {
    invited_email: string
    intended_role: UserRole
    client_id?: string // required for client_admin / client_viewer roles
}

export interface GenerateInviteLinkResponse {
    invite_url: string
    expires_at: string
}

// Phase 5: Agency Chat
export interface SendAgencyChatPayload {
    message: string
    session_id?: string
    model?: string
}

export interface SendAgencyChatResponse {
    session_id: string
    message_id: string
    reply: string
    model_used: string
    input_tokens: number
    output_tokens: number
}

// Phase 5: Agency Knowledge CMS
export interface CreateAgencyKnowledgePayload {
    title: string
    body: string
    tags: string[]
    is_published?: boolean
}

export interface UpdateAgencyKnowledgePayload {
    title?: string
    body?: string
    tags?: string[]
    is_published?: boolean
}
