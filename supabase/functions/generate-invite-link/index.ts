/**
 * generate-invite-link/index.ts
 * Inner G Complete Agency — Generate Invite Link Handler
 *
 * Auth:    Requires super_admin or developer
 * Trigger: HTTP POST
 */

import { createHandler, z, okResponse, forbiddenResponse } from "../_shared/lib/index.ts"
import { createInvite } from "../_shared/lib/services/invite.ts"

const InviteRequestSchema = z.object({
    invited_email: z.string().email(),
    intended_role: z.enum(["super_admin", "developer", "client_admin", "client_viewer"]),
    client_id: z.string().uuid().optional()
})

export default createHandler(async ({ adminClient, user, body }) => {
    const { invited_email, intended_role, client_id } = body

    // Business rule B-19: developers cannot invite super_admins or other developers
    if (user!.role === "developer" && ["super_admin", "developer"].includes(intended_role)) {
        return forbiddenResponse("Developers can only invite client users.")
    }

    const result = await createInvite(adminClient, {
        invited_email,
        intended_role,
        invited_by: user!.id,
        client_id: client_id ?? null,
        siteUrl: Deno.env.get("NEXT_PUBLIC_SITE_URL") ?? "https://agency.innergcomplete.com"
    })

    return okResponse({ invite_url: result.invite_url, expires_at: result.expires_at })
}, {
    schema: InviteRequestSchema,
    requireAuth: true,
    allowedRoles: ["super_admin", "developer"],
    requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
})
