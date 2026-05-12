/**
 * complete-invite/index.ts
 * Inner G Complete Agency — Complete Invite / User Onboarding Handler
 *
 * Auth:    Public (called before account exists — invite token IS the auth)
 * Trigger: HTTP POST from the /accept-invite page
 */

import { createHandler, z, okResponse, validationErrorResponse } from "../_shared/lib/index.ts"
import { completeInvite } from "../_shared/lib/services/invite.ts"

const CompleteInviteSchema = z.object({
    token: z.string().min(1, "Token is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    full_name: z.string().min(2, "Full name is required")
})

export default createHandler(async ({ adminClient, body }) => {
    try {
        const result = await completeInvite(adminClient, body)
        return okResponse({ user_id: result.user_id })
    } catch (err) {
        const message = String(err)

        // Surface structured errors thrown by the service back to the client
        if (message.startsWith("INVALID_INVITE:")) {
            return validationErrorResponse(message.replace("INVALID_INVITE:", ""))
        }
        if (message.startsWith("ALREADY_REGISTERED:")) {
            return validationErrorResponse(message.replace("ALREADY_REGISTERED:", ""))
        }

        // All other errors bubble up to createHandler's top-level catch
        throw err
    }
}, {
    schema: CompleteInviteSchema,
    requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
})
