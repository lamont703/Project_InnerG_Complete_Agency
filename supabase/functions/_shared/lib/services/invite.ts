/**
 * _shared/lib/services/invite.ts
 * Inner G Complete Agency — Invite Management Service
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This file ONLY contains business logic for
 * the invite lifecycle. It must NOT handle CORS, HTTP
 * responses, or authentication directly.
 * ─────────────────────────────────────────────────────────
 *
 * Used by:
 *  - generate-invite-link   (creates invite tokens)
 *  - complete-invite        (finalizes user onboarding)
 *  - validate-invite        (token validation — via InviteRepo directly)
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Repo } from "../index.ts"
import { UserRole } from "../types/index.ts"

// ── Token Generation ──────────────────────────────────────

/**
 * Generates a cryptographically secure hex invite token.
 * Uses SHA-256 of a UUID — 64 hex chars, URL-safe, collision-resistant.
 */
export async function generateInviteToken(): Promise<string> {
    const uuid = crypto.randomUUID()
    const encoder = new TextEncoder()
    const data = encoder.encode(uuid)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("")
}

// ── Invite Creation ───────────────────────────────────────

export interface CreateInviteInput {
    invited_email: string
    intended_role: UserRole
    invited_by: string
    client_id?: string | null
    siteUrl: string
}

export interface CreateInviteResult {
    invite_url: string
    expires_at: string
    token: string
}

/**
 * Creates a new invite token and stores it. Returns the invite URL.
 * Token is valid for 7 days from creation.
 */
export async function createInvite(
    adminClient: SupabaseClient,
    input: CreateInviteInput
): Promise<CreateInviteResult> {
    const repo = new Repo.InviteRepo(adminClient)
    const token = await generateInviteToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await repo.create({
        token,
        invited_email: input.invited_email,
        intended_role: input.intended_role,
        invited_by: input.invited_by,
        client_id: input.client_id ?? null,
        expires_at: expiresAt,
        is_active: true
    })

    return {
        invite_url: `${input.siteUrl}/accept-invite?token=${token}`,
        expires_at: expiresAt,
        token
    }
}

// ── Invite Completion ─────────────────────────────────────

export interface CompleteInviteInput {
    token: string
    password: string
    full_name: string
}

export interface CompleteInviteResult {
    user_id: string
}

/**
 * Finalizes user onboarding from an invite token:
 * 1. Validates the token
 * 2. Creates the user in Supabase Auth
 * 3. Marks the invite as used
 * 4. Grants role-based access (developer or client user)
 */
export async function completeInvite(
    adminClient: SupabaseClient,
    input: CompleteInviteInput
): Promise<CompleteInviteResult> {
    const { token, password, full_name } = input

    // 1. Validate token — throws or returns valid invite
    const inviteRepo = new Repo.InviteRepo(adminClient)
    const validation = await inviteRepo.validateToken(token)

    if (!validation.valid) {
        throw new Error(`INVALID_INVITE:${validation.error ?? "Invalid invite."}`)
    }

    const invite = validation.invite!

    // 2. Create user in Supabase Auth
    let userId: string
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: invite.invited_email,
        password,
        email_confirm: true,
        user_metadata: {
            role: invite.intended_role,
            full_name
        }
    })

    if (authError) {
        // If user already exists, we find their ID and proceed to grant access
        const isAlreadyRegistered = authError.message.includes("already has been registered") || 
                                   (authError as any).status === 422 || 
                                   (authError as any).code === "email_exists"

        if (isAlreadyRegistered) {
            const { data: existing, error: getError } = await adminClient.auth.admin.listUsers()
            if (getError) throw getError
            
            const user = existing.users.find((u: any) => u.email === invite.invited_email)
            if (!user) throw new Error("USER_NOT_FOUND: User reported as existing but not found in list.")
            userId = user.id
        } else {
            throw authError
        }
    } else {
        userId = authData.user.id
    }

    // 3. Mark invite as used
    await inviteRepo.markUsed(token)

    // 4. Grant role-based access
    if (invite.client_id) {
        const accessRepo = new Repo.AccessRepo(adminClient)
        // All non-admin invited users get access to all of the client's projects
        await accessRepo.grantProjectAccess(userId, invite.client_id, invite.invited_by)
    }

    return { user_id: userId }
}
