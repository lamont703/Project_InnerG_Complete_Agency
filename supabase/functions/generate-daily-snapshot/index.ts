import { createHandler, Logger, okResponse } from "../_shared/lib/index.ts"
import { SnapshotService } from "./service.ts"

/**
 * generate-daily-snapshot
 * Optimized nightly job for KPI aggregation.
 */
export default createHandler(async ({ adminClient }) => {
    const logger = new Logger("generate-daily-snapshot")
    const service = new SnapshotService(adminClient, logger)

    logger.info("Starting nightly KPI snapshot generation")

    const result = await service.aggregateAll()

    return okResponse(result)
}, {
    requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
})
