/**
 * broadcast-to-community/index.ts
 * Inner G Complete Agency — Community Intelligence Broadcast Neural Relay
 * 
 * Auth:     Requires any authenticated user (project permissions checked in logic)
 * Trigger:  HTTP POST from the Community Hub
 */

import { createHandler, z, Logger, okResponse, validationErrorResponse } from "../_shared/lib/index.ts"
import { BroadcastService } from "./service.ts"

// ── Request Schema ────────────────────────────────────────
const BroadcastSchema = z.object({
    agent_id: z.string().uuid(),
    deployment_id: z.string().uuid(),
    message: z.string().min(1),
    use_ai: z.boolean().default(true),
    project_id: z.string().uuid()
})

// ── Handler ───────────────────────────────────────────────
export default createHandler(async ({ adminClient, user, body }) => {
    const logger = new Logger("broadcast-to-community")
    const service = new BroadcastService(adminClient, logger)

    logger.info("Initiating broadcast neural relay", { 
        agent_id: body.agent_id, 
        deployment_id: body.deployment_id,
        project_id: body.project_id
    })

    const result = await service.run(body)

    return okResponse(result)
}, {
    schema: BroadcastSchema,
    requireAuth: true,
    // Only require the mandatory infra vars — AI/Discord keys are handled gracefully
    // inside the service so missing secrets degrade feature-by-feature, not with a 400.
    requiredEnv: [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
    ]
})
