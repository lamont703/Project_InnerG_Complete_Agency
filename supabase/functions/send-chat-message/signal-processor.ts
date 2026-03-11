/**
 * send-chat-message/signal-processor.ts
 * Inner G Complete Agency — Signal & Ticket Persistence Layer
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This file ONLY writes AI-generated signals
 * and software tickets to the database.
 * Do NOT add prompt logic here.
 * Do NOT add auth logic here.
 * Do NOT add RAG logic here.
 * ─────────────────────────────────────────────────────────
 *
 * Exported functions:
 *  - parseAiResponse():   Parses and validates Gemini's raw JSON string
 *  - persistSignal():     Inserts a signal into ai_signals and queues embedding
 *  - persistTicket():     Inserts a software_ticket linked to a signal
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import {
    ParsedAiResponse,
    SignalPayload,
    VALID_SIGNAL_TYPES,
    VALID_SEVERITIES,
} from "../_shared/lib/types.ts"
import { SoftwareTicketPayload } from "./types.ts"

// ─── Parser ───────────────────────────────────────────────

/**
 * Parses the raw JSON string returned by Gemini.
 * Falls back gracefully if the JSON is malformed.
 */
export function parseAiResponse(rawText: string): ParsedAiResponse {
    const fallback: ParsedAiResponse = { message: rawText, signal: null }

    try {
        // Strip markdown code fences if present
        const cleaned = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim()
        const parsed = JSON.parse(cleaned)

        if (!parsed.message || typeof parsed.message !== "string") {
            return fallback
        }

        let signal: SignalPayload | null = null
        if (parsed.signal && typeof parsed.signal === "object") {
            const s = parsed.signal
            const isValidType = VALID_SIGNAL_TYPES.includes(s.signal_type)
            const isValidSeverity = VALID_SEVERITIES.includes(s.severity)

            if (s.title && s.body && isValidType && isValidSeverity) {
                signal = {
                    title: String(s.title).slice(0, 80),
                    body: String(s.body),
                    signal_type: s.signal_type,
                    severity: s.severity,
                    action_label: s.action_label || null,
                    action_url: s.action_url || null,
                    is_agency_only: s.is_agency_only === true,
                    repro_steps: s.repro_steps || null,
                    expected_behavior: s.expected_behavior || null,
                    actual_behavior: s.actual_behavior || null,
                }
            }
        }

        return { message: parsed.message, signal }
    } catch {
        return fallback
    }
}

// ─── Signal Persistence ───────────────────────────────────

export interface PersistedSignal {
    id: string
    title: string
    severity: string
    signal_type: string
}

/**
 * Inserts the AI signal into the ai_signals table and queues
 * an embedding job for the RAG system.
 */
export async function persistSignal(
    adminClient: SupabaseClient,
    projectId: string,
    signal: SignalPayload
): Promise<PersistedSignal | null> {
    const { data: inserted, error } = await adminClient
        .from("ai_signals")
        .insert({
            project_id: projectId,
            signal_type: signal.signal_type,
            title: signal.title,
            body: signal.body,
            severity: signal.severity,
            action_label: signal.action_label || null,
            action_url: signal.action_url || null,
            is_agency_only: signal.is_agency_only || false,
            repro_steps: signal.repro_steps || null,
            expected_behavior: signal.expected_behavior || null,
            actual_behavior: signal.actual_behavior || null,
        })
        .select("id, title, severity, signal_type")
        .single()

    if (error) {
        console.error("[signal-processor] Signal insert error:", error)
        return null
    }

    // Queue embedding job for RAG indexing
    await adminClient.from("embedding_jobs").insert({
        source_table: "ai_signals",
        source_id: inserted.id,
        project_id: projectId,
        status: "pending",
    })

    return inserted
}

// ─── Activity Log ─────────────────────────────────────────

/**
 * Logs a signal creation event to the activity log.
 */
export async function logSignalActivity(
    adminClient: SupabaseClient,
    projectId: string,
    signalTitle: string,
    userId: string
): Promise<void> {
    await adminClient.from("activity_log").insert({
        project_id: projectId,
        action: `AI Signal created: ${signalTitle}`,
        category: "ai",
        triggered_by: userId,
    })
}

// ─── Ticket Persistence ───────────────────────────────────

/**
 * Inserts a software_ticket record linked to a signal.
 * Called only when signal_type === 'bug_report'.
 */
export async function persistTicket(
    adminClient: SupabaseClient,
    payload: SoftwareTicketPayload
): Promise<string | null> {
    const { data, error } = await adminClient
        .from("software_tickets")
        .insert({
            project_id: payload.project_id,
            created_by: payload.created_by,
            title: payload.title,
            description: payload.description,
            repro_steps: payload.repro_steps || null,
            expected_behavior: payload.expected_behavior || null,
            actual_behavior: payload.actual_behavior || null,
            severity: payload.severity,
            status: payload.status || "open",
        })
        .select("id")
        .single()

    if (error) {
        console.error("[signal-processor] Ticket insert error:", error)
        return null
    }

    return data?.id ?? null
}
