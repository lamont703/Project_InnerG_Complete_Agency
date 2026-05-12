/**
 * generate-invite-link/service.ts
 * Inner G Complete Agency
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: Business logic for this function lives in
 * the SHARED service:
 *
 *   _shared/lib/services/invite.ts → createInvite()
 *
 * Do NOT add logic here. If you need to modify invite
 * generation behavior (token format, expiry window, URL
 * structure), edit the shared service file above.
 * This document exists ONLY to direct developers to the
 * correct location.
 * ─────────────────────────────────────────────────────────
 */

// Re-export from the shared service for discoverability
export { createInvite, generateInviteToken } from "../_shared/lib/services/invite.ts"
