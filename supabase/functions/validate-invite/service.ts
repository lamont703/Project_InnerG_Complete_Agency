/**
 * validate-invite/service.ts
 * Inner G Complete Agency
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: Business logic for this function lives in
 * the SHARED repository:
 *
 *   _shared/lib/db/invites.ts → InviteRepo.validateToken()
 *
 * Token validation is a pure data-layer operation and
 * belongs exclusively in the repository. Do NOT add logic
 * here or in index.ts.
 * ─────────────────────────────────────────────────────────
 */

// Re-export for discoverability
export { InviteRepo } from "../_shared/lib/db/invites.ts"
