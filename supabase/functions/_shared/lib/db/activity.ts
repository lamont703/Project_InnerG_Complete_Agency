/**
 * _shared/lib/db/activity.ts
 * Inner G Complete Agency — Activity Log Repository
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This is the ONLY place where raw Supabase 
 * calls for the 'activity_log' table should live.
 * ─────────────────────────────────────────────────────────
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { ActivityLogEntry } from "../types.ts"

export interface ActivityLogRow extends ActivityLogEntry {
    id: string
    created_at: string
}

export class ActivityRepo {
    constructor(private client: SupabaseClient) { }

    /**
     * Inserts a new activity log entry.
     */
    async log(entry: ActivityLogEntry): Promise<ActivityLogRow> {
        const { data, error } = await this.client
            .from("activity_log")
            .insert({
                project_id: entry.project_id,
                action: entry.action,
                category: entry.category,
                triggered_by: entry.triggered_by || null,
                actor: entry.actor || "system",
            })
            .select("*")
            .single()

        if (error) throw error
        return data as ActivityLogRow
    }

    /**
     * Fetches recent activity for a project.
     */
    async getRecentByProject(projectId: string, limit = 20): Promise<ActivityLogRow[]> {
        const { data, error } = await this.client
            .from("activity_log")
            .select("*")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false })
            .limit(limit)

        if (error) throw error
        return (data || []) as ActivityLogRow[]
    }
}
