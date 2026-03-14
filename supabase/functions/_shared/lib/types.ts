/**
 * _shared/lib/types.ts
 * Inner G Complete Agency — Shared Type Definitions
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: ONLY add types here that are shared by 2+
 * Edge Functions. Types used by a single function belong in
 * that function's own `types.ts` file.
 * ─────────────────────────────────────────────────────────
 */

// ─── Signal System ────────────────────────────────────────

export type SignalType =
    | "inventory"
    | "conversion"
    | "social"
    | "system"
    | "ai_insight"
    | "ai_action"
    | "bug_report"

export type SignalSeverity = "info" | "warning" | "critical"

export interface SignalPayload {
    title: string
    body: string
    signal_type: SignalType
    severity: SignalSeverity
    action_label?: string | null
    action_url?: string | null
    is_agency_only?: boolean
    // Bug ticket specific fields
    repro_steps?: string | null
    expected_behavior?: string | null
    actual_behavior?: string | null
    // Agency agent specific
    target_project_id?: string | null
    metadata?: Record<string, any> | null
}

export const VALID_SIGNAL_TYPES: SignalType[] = [
    "inventory", "conversion", "social", "system", "ai_insight", "ai_action", "bug_report"
]
export const VALID_SEVERITIES: SignalSeverity[] = ["info", "warning", "critical"]

// ─── Parsed AI Response ───────────────────────────────────

export interface ParsedAiResponse {
    message: string
    signal: SignalPayload | null
}

// ─── Activity Log ─────────────────────────────────────────

export type ActivityCategory = "revenue" | "ai" | "system" | "integration" | "user"

export interface ActivityLogEntry {
    project_id: string
    action: string
    category: ActivityCategory
    triggered_by?: string | null
    actor?: string | null
}

// ─── Software Tickets ─────────────────────────────────────

export type TicketStatus = "open" | "in_progress" | "testing" | "fixed" | "closed"

export interface SoftwareTicketPayload {
    project_id: string
    created_by: string
    title: string
    description: string
    repro_steps?: string | null
    expected_behavior?: string | null
    actual_behavior?: string | null
    severity: SignalSeverity
    status?: TicketStatus
}

// ─── User Roles ───────────────────────────────────────────

export type UserRole = "super_admin" | "developer" | "client_admin" | "client_viewer"
export const AGENCY_ROLES: UserRole[] = ["super_admin", "developer"]
export const CLIENT_ROLES: UserRole[] = ["client_admin", "client_viewer"]
