/**
 * _shared/lib/db/invites.ts
 * Inner G Complete Agency — Invitation System Repository
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { UserRole } from "../../types/index.ts"

export interface InviteLinkRow {
    id: string
    token: string
    invited_email: string
    intended_role: UserRole
    invited_by: string
    client_id?: string | null
    expires_at: string
    used_at?: string | null
    is_active: boolean
    created_at: string
}

export class InviteRepo {
    constructor(private client: SupabaseClient) { }

    /**
     * Creates a new invite link.
     */
    async create(payload: Omit<InviteLinkRow, "id" | "created_at" | "used_at">): Promise<void> {
        const { error } = await this.client
            .from("invite_links")
            .insert(payload)

        if (error) throw error
    }

    /**
     * Gets an invite by token.
     */
    async getByToken(token: string): Promise<InviteLinkRow | null> {
        const { data, error } = await this.client
            .from("invite_links")
            .select("*")
            .eq("token", token)
            .maybeSingle()

        if (error) throw error
        return data as InviteLinkRow | null
    }

    /**
     * Marks an invite as used.
     */
    async markUsed(token: string): Promise<void> {
        const { error } = await this.client
            .from("invite_links")
            .update({
                used_at: new Date().toISOString(),
                is_active: false
            })
            .eq("token", token)

        if (error) throw error
    }

    /**
     * Verifies if a token is valid, active, and not expired.
     */
    async validateToken(token: string): Promise<{ valid: boolean; invite?: InviteLinkRow; error?: string }> {
        const invite = await this.getByToken(token)

        if (!invite) return { valid: false, error: "Invite link not found." }
        if (invite.used_at) return { valid: false, error: "Invite has already been used." }
        if (!invite.is_active) return { valid: false, error: "Invite is no longer active." }
        if (new Date(invite.expires_at) < new Date()) return { valid: false, error: "Invite has expired." }

        return { valid: true, invite }
    }
}
