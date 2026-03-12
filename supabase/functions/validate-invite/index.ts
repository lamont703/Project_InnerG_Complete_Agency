/**
 * validate-invite/index.ts
 * Inner G Complete Agency — Validate Invite Token
 *
 * Auth:    Public (no JWT required — called before account creation)
 * Trigger: HTTP POST
 */

import { createHandler, z, Repo, okResponse, validationErrorResponse } from "../_shared/lib/index.ts"

const ValidateInviteSchema = z.object({
    token: z.string().min(1)
})

/**
 * Validates a one-time invite token before allowing account creation.
 * Returns the email and role associated with the invite.
 */
export default createHandler(async ({ adminClient, body }) => {
    const repo = new Repo.InviteRepo(adminClient)
    const validation = await repo.validateToken(body.token)

    if (!validation.valid) {
        return validationErrorResponse(validation.error ?? "Invalid invite link.")
    }

    return okResponse({
        email: validation.invite!.invited_email,
        role: validation.invite!.intended_role
    })
}, {
    schema: ValidateInviteSchema,
    requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
})
