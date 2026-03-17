/**
 * supabase/functions/validate-invite/service.test.ts
 * Inner G Complete Agency — Unit Tests: InviteRepo.validateToken()
 *
 * Run with:   deno test supabase/functions/validate-invite/service.test.ts
 *
 * Tests the core validation logic WITHOUT a real database.
 * The Supabase client is fully mocked via a factory function.
 */

import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts"
import { InviteRepo } from "../_shared/lib/db/iam/invites.ts"

// ─── Mock Factory ────────────────────────────────────────────────────────────
// Creates a fake SupabaseClient that returns whatever data we want
function makeMockClient(queryResult: Record<string, unknown> | null) {
    return {
        from: () => ({
            select: () => ({
                eq: () => ({
                    maybeSingle: async () => ({ data: queryResult, error: null })
                })
            }),
            update: () => ({
                eq: async () => ({ error: null })
            }),
            insert: async () => ({ error: null })
        })
    } as any
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeFutureDate(daysFromNow = 7): string {
    return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString()
}

function makePastDate(daysAgo = 1): string {
    return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
}

// ─── Tests ───────────────────────────────────────────────────────────────────

Deno.test("validateToken — valid token returns { valid: true, invite }", async () => {
    const fakeInvite = {
        id: "abc-123",
        token: "valid-token-abc",
        invited_email: "test@innergcomplete.com",
        intended_role: "client_viewer",
        invited_by: "admin-id",
        client_id: "client-id-1",
        expires_at: makeFutureDate(7),
        used_at: null,
        is_active: true,
        created_at: new Date().toISOString()
    }

    const repo = new InviteRepo(makeMockClient(fakeInvite))
    const result = await repo.validateToken("valid-token-abc")

    assertEquals(result.valid, true)
    assertEquals(result.invite?.invited_email, "test@innergcomplete.com")
    assertEquals(result.invite?.intended_role, "client_viewer")
    assertEquals(result.error, undefined)
})

Deno.test("validateToken — returns error when token not found (null from DB)", async () => {
    const repo = new InviteRepo(makeMockClient(null))
    const result = await repo.validateToken("ghost-token")

    assertEquals(result.valid, false)
    assertEquals(result.error, "Invite link not found.")
})

Deno.test("validateToken — returns error when invite already used (used_at set)", async () => {
    const usedInvite = {
        id: "used-123",
        token: "already-used-token",
        invited_email: "used@innergcomplete.com",
        intended_role: "client_viewer",
        invited_by: "admin-id",
        expires_at: makeFutureDate(3),
        used_at: makePastDate(1), // Already used!
        is_active: false,
        created_at: new Date().toISOString()
    }

    const repo = new InviteRepo(makeMockClient(usedInvite))
    const result = await repo.validateToken("already-used-token")

    assertEquals(result.valid, false)
    assertEquals(result.error, "Invite has already been used.")
})

Deno.test("validateToken — returns error when invite is inactive (is_active = false)", async () => {
    const inactiveInvite = {
        id: "inactive-123",
        token: "inactive-token",
        invited_email: "inactive@innergcomplete.com",
        intended_role: "client_viewer",
        invited_by: "admin-id",
        expires_at: makeFutureDate(3),
        used_at: null,
        is_active: false, // Manually deactivated!
        created_at: new Date().toISOString()
    }

    const repo = new InviteRepo(makeMockClient(inactiveInvite))
    const result = await repo.validateToken("inactive-token")

    assertEquals(result.valid, false)
    assertEquals(result.error, "Invite is no longer active.")
})

Deno.test("validateToken — returns error when invite has expired", async () => {
    const expiredInvite = {
        id: "expired-123",
        token: "expired-token",
        invited_email: "expired@innergcomplete.com",
        intended_role: "client_viewer",
        invited_by: "admin-id",
        expires_at: makePastDate(2), // Expired 2 days ago!
        used_at: null,
        is_active: true,
        created_at: new Date().toISOString()
    }

    const repo = new InviteRepo(makeMockClient(expiredInvite))
    const result = await repo.validateToken("expired-token")

    assertEquals(result.valid, false)
    assertEquals(result.error, "Invite has expired.")
})

Deno.test("generateInviteToken — returns 64-char hex string", async () => {
    // Test the token generator is cryptographically correct
    const { generateInviteToken } = await import("../_shared/lib/services/invite.ts")
    const token = await generateInviteToken()

    assertEquals(token.length, 64)
    assertEquals(/^[0-9a-f]+$/.test(token), true, "Token must be lowercase hex")
})

Deno.test("generateInviteToken — two tokens are always unique", async () => {
    const { generateInviteToken } = await import("../_shared/lib/services/invite.ts")
    const token1 = await generateInviteToken()
    const token2 = await generateInviteToken()

    assertEquals(token1 !== token2, true, "Tokens must be unique each call")
})
