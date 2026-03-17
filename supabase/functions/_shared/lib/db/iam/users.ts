/**
 * _shared/lib/db/users.ts
 * Inner G Complete Agency — User Profiles Repository
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This is the ONLY place where raw Supabase 
 * calls for the 'users' (public profile) table should live.
 * ─────────────────────────────────────────────────────────
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { UserRole } from "../../types/index.ts"

export interface UserProfile {
    id: string
    email: string
    full_name?: string | null
    role: UserRole
    created_at: string
}

export class UserRepo {
    constructor(private client: SupabaseClient) { }

    /**
     * Fetches a user profile by ID.
     */
    async getProfile(userId: string): Promise<UserProfile | null> {
        const { data, error } = await this.client
            .from("users")
            .select("*")
            .eq("id", userId)
            .maybeSingle()

        if (error) throw error
        return data as UserProfile | null
    }

    /**
     * Fetches a user role.
     */
    async getRole(userId: string): Promise<UserRole | null> {
        const { data, error } = await this.client
            .from("users")
            .select("role")
            .eq("id", userId)
            .maybeSingle()

        if (error) throw error
        return data?.role as UserRole | null
    }

    /**
     * Updates a user's role.
     */
    async updateRole(userId: string, role: UserRole): Promise<void> {
        const { error } = await this.client
            .from("users")
            .update({ role })
            .eq("id", userId)

        if (error) throw error
    }
}
