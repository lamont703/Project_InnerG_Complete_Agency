/**
 * _shared/lib/db/access.ts
 * Inner G Complete Agency — Access Control Repository
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This file ONLY handles database operations.
 * It must NOT contain business logic, HTTP handling, or auth.
 * ─────────────────────────────────────────────────────────
 *
 * Manages role-based access assignment after user creation:
 *  - developer_client_access  (developer ↔ client mapping)
 *  - project_user_access      (client user ↔ project mapping)
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

export class AccessRepo {
    constructor(private client: SupabaseClient) { }

    /**
     * Fetches all project IDs belonging to a client.
     */
    async getProjectsByClient(clientId: string): Promise<{ id: string }[]> {
        const { data, error } = await this.client
            .from("projects")
            .select("id")
            .eq("client_id", clientId)

        if (error) throw error
        return data ?? []
    }

    /**
     * Grants a user access to all of a client's projects in one batch insert.
     */
    async grantProjectAccess(userId: string, clientId: string, grantedBy: string): Promise<void> {
        const projects = await this.getProjectsByClient(clientId)
        if (projects.length === 0) return

        const { error } = await this.client
            .from("project_user_access")
            .insert(
                projects.map(p => ({
                    project_id: p.id,
                    user_id: userId,
                    granted_by: grantedBy
                }))
            )

        if (error) throw error
    }
}
