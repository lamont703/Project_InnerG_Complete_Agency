/**
 * send-agency-chat-message/types.ts
 * Inner G Complete Agency — Agency Chat Function Types
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: Update types HERE FIRST before changing
 * any prompt schema or database writes.
 * ─────────────────────────────────────────────────────────
 */

import { SignalPayload } from "../_shared/lib/types/index.ts"

// ─── Request ──────────────────────────────────────────────

export interface AgencyChatRequest {
    message: string
    model?: string
    session_id?: string | null
}

// ─── AI Response ──────────────────────────────────────────

export interface ParsedAgencyChatResponse {
    message: string
    signal: (SignalPayload & { target_project_id?: string | null }) | null
}

// ─── RAG Context ──────────────────────────────────────────

export interface AgencyProject {
    id: string
    name: string
    slug: string
    status: string
    clients?: { name: string; industry: string }
}

// ─── Function Response ────────────────────────────────────

export interface AgencyChatFunctionResponse {
    reply: string
    session_id: string
    signal_created: {
        id: string
        title: string
        severity: string
        signal_type: string
        project_id: string
    } | null
}
