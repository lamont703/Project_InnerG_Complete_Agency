/**
 * _shared/lib/db/signals.ts
 * Inner G Complete Agency — AI Signals Repository
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This is the ONLY place where raw Supabase 
 * calls for the 'ai_signals' table should live.
 * 
 * If an AI needs to create, update, or fetch signals, it 
 * MUST use the SignalRepo class. Do NOT write raw 
 * .from('ai_signals') queries in edge functions.
 * ─────────────────────────────────────────────────────────
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SignalPayload, SignalSeverity, SignalType } from "../types.ts"

export interface SignalRow extends SignalPayload {
    id: string
    project_id: string
    created_at: string
    is_resolved: boolean
    resolved_by?: string | null
    resolved_at?: string | null
}

export class SignalRepo {
    constructor(private client: SupabaseClient) { }

    /**
     * Creates a new AI signal and returns the record.
     */
    async create(projectId: string, payload: SignalPayload): Promise<SignalRow> {
        const { data, error } = await this.client
            .from("ai_signals")
            .insert({
                project_id: projectId,
                signal_type: payload.signal_type,
                title: payload.title,
                body: payload.body,
                severity: payload.severity,
                action_label: payload.action_label || null,
                action_url: payload.action_url || null,
                is_agency_only: payload.is_agency_only || false,
                repro_steps: payload.repro_steps || null,
                expected_behavior: payload.expected_behavior || null,
                actual_behavior: payload.actual_behavior || null,
                metadata: payload.metadata || {},
            })
            .select("*")
            .single()

        if (error) throw error
        return data as SignalRow
    }

    /**
     * Fetches a single signal by ID and Project ID.
     */
    async getById(signalId: string, projectId: string): Promise<SignalRow | null> {
        const { data, error } = await this.client
            .from("ai_signals")
            .select("*")
            .eq("id", signalId)
            .eq("project_id", projectId)
            .maybeSingle()

        if (error) throw error
        return data as SignalRow | null
    }

    /**
     * Marks a signal as resolved.
     */
    async resolve(signalId: string, projectId: string, userId: string): Promise<void> {
        const { error } = await this.client
            .from("ai_signals")
            .update({
                is_resolved: true,
                resolved_by: userId,
                resolved_at: new Date().toISOString(),
            })
            .eq("id", signalId)
            .eq("project_id", projectId)

        if (error) throw error
    }

    /**
     * Fetches active signals for a project.
     */
    async getActiveByProject(projectId: string, limit = 10): Promise<SignalRow[]> {
        const { data, error } = await this.client
            .from("ai_signals")
            .select("*")
            .eq("project_id", projectId)
            .eq("is_resolved", false)
            .order("created_at", { ascending: false })
            .limit(limit)

        if (error) throw error
        return (data || []) as SignalRow[]
    }
}
