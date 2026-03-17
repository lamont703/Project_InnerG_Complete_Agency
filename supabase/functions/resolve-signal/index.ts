/**
 * resolve-signal/index.ts
 * Inner G Complete Agency — Resolve Signal Orchestrator
 */

import { createHandler, FunctionContext } from "../_shared/lib/core/middleware.ts"
import { okResponse, validationErrorResponse } from "../_shared/lib/core/response.ts"
import { resolveSignal } from "./service.ts"

/**
 * Marks a signal as resolved and logs the activity.
 * 
 * Config:
 * - Requires authentication
 * - Environment: Requires Supabase system keys (checked by default in middleware)
 */
createHandler(async (context: FunctionContext) => {
    const { adminClient, user, body } = context
    const { signal_id, project_id } = body

    if (!signal_id || !project_id || !user) {
        return validationErrorResponse("signal_id, project_id, and user session are required.")
    }

    // 2. Execute Business Logic
    const result = await resolveSignal(adminClient, user.id, {
        signal_id,
        project_id
    })

    // 3. Standardized Success Response
    return okResponse(result)
}, {
    requireAuth: true
})
