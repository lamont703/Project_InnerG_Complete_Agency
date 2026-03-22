/**
 * send-agency-chat-message/index.ts
 * Inner G Complete Agency — Agency Intelligence Agent Handler
 *
 * Auth:    Requires super_admin role (agency-only access)
 * Trigger: HTTP POST from the Agency Agent chat UI
 */

import { createHandler, z, Logger, okResponse, AgencyChatService } from "../_shared/lib/index.ts"

const AgencyChatSchema = z.object({
    message: z.string().min(1, "Message cannot be empty"),
    session_id: z.string().uuid().nullable().optional(),
    model: z.string().optional(),
    target_project_id: z.string().uuid().nullable().optional()
})

export default createHandler(async ({ adminClient, user, body }) => {
    const logger = new Logger("send-agency-chat-message")

    const service = new AgencyChatService(
        adminClient,
        logger,
        Deno.env.get("GEMINI_API_KEY")!
    )

    logger.info("Agency chat message received", { user_id: user!.id })

    const result = await service.chat({
        ...body,
        userId: user!.id
    })

    return okResponse(result)
}, {
    schema: AgencyChatSchema,
    requireAuth: true,
    allowedRoles: ["super_admin"],
    requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GEMINI_API_KEY"]
})
