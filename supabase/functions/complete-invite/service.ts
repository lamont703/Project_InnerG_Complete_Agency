/**
 * complete-invite/service.ts
 * Inner G Complete Agency
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: Business logic for this function lives in
 * the SHARED service:
 *
 *   _shared/lib/services/invite.ts → completeInvite()
 *
 * Do NOT add logic here. If you need to modify invite
 * completion behavior, edit the shared service file above.
 * This document exists ONLY to direct developers to the
 * correct location.
 * ─────────────────────────────────────────────────────────
 */

// Re-export from the shared service for discoverability
export { completeInvite } from "../_shared/lib/services/invite.ts"
