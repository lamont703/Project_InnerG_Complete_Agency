/**
 * send-chat-message/index.ts
 * Inner G Complete Agency — Client Growth Assistant Chat Handler
 *
 * Auth:    Requires authenticated user (any role)
 * Trigger: HTTP POST from the client-facing Growth Assistant chat UI
 */

import { createHandler, z, Logger, okResponse } from "../_shared/lib/index.ts"
import { ChatService } from "./service.ts"

const ChatMessageSchema = z.object({
    project_id: z.string().uuid(),
    message: z.string().min(1, "Message cannot be empty"),
    session_id: z.string().uuid().nullable().optional(),
    model: z.string().optional()
})

export default createHandler(async ({ adminClient, user, body, req }) => {
    const logger = new Logger("send-chat-message")

    const service = new ChatService(
        adminClient,
        logger,
        Deno.env.get("GEMINI_API_KEY")!
    )

    logger.info("Chat message received", { project_id: body.project_id })

    const result = await service.chat({
        ...body,
        userId: user!.id,
        authHeader: req.headers.get("Authorization")!
    })

    return okResponse(result.data)
}, {
    schema: ChatMessageSchema,
    requireAuth: true,
    requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GEMINI_API_KEY"]
})
