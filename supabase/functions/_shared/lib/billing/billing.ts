/**
 * _shared/lib/billing.ts
 * Inner G Complete Agency — AI Circuit Breaker
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This module tracks AI usage frequency. 
 * If an AI enters a "feedback loop," this will trip and 
 * stop the function before your bill spikes.
 * ─────────────────────────────────────────────────────────
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

export class CircuitBreaker {
    constructor(private client: SupabaseClient) { }

    /**
     * Checks if a project has exceeded its "Safe AI Limit" 
     * in the last 60 seconds (prevents runaway loops).
     */
    async check(projectId: string, limitPerMinute = 5): Promise<void> {
        const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();

        const { count, error } = await this.client
            .from("activity_log")
            .select("*", { count: "exact", head: true })
            .eq("project_id", projectId)
            .eq("category", "ai")
            .gt("created_at", oneMinuteAgo);

        if (error) return; // Fail open if we can't check, to avoid blocking users

        if (count && count >= limitPerMinute) {
            throw new Error(`CIRCUIT_BREAKER_TRIPPED: Excessive AI activity detected for project ${projectId}. Cooling down for 60 seconds.`);
        }
    }
}
