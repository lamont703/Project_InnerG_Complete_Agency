/**
 * sync-ghl-pipeline/index.ts
 * Inner G Complete Agency — GHL Pipeline Sync Handler
 *
 * Auth:    Requires super_admin or developer (system-level sync)
 * Trigger: HTTP POST (manual trigger or scheduled cron)
 */

import { createHandler, Logger, okResponse } from "../_shared/lib/index.ts"
import { GhlPipelineSyncService } from "./service.ts"

export default createHandler(async ({ adminClient, user }) => {
    const logger = new Logger("sync-ghl-pipeline")

    const service = new GhlPipelineSyncService(
        adminClient,
        logger,
        Deno.env.get("GHL_API_KEY")!,
        Deno.env.get("GHL_LOCATION_ID")!
    )

    logger.info("Starting GHL pipeline sync")

    const result = await service.sync()

    logger.info("GHL pipeline sync complete", result)

    return okResponse(result)
}, {
    requireAuth: true,
    allowedRoles: ["super_admin", "developer"],
    requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GHL_API_KEY", "GHL_LOCATION_ID"]
})
