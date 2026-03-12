/**
 * process-kpi-aggregation/index.ts
 * Inner G Complete Agency — KPI Aggregation Handler
 *
 * Auth:    No direct user auth (called by generate-daily-snapshot)
 * Trigger: HTTP POST from generate-daily-snapshot with { connection_id }
 */

import { createHandler, z, Logger, okResponse } from "../_shared/lib/index.ts"
import { KpiAggregationService } from "./service.ts"

const KpiAggregationSchema = z.object({
    connection_id: z.string().uuid()
})

export default createHandler(async ({ adminClient, body }) => {
    const logger = new Logger("process-kpi-aggregation")
    const service = new KpiAggregationService(adminClient, logger)

    logger.info("Starting KPI aggregation", { connection_id: body.connection_id })

    const result = await service.aggregate(body.connection_id)

    return okResponse({ result })
}, {
    schema: KpiAggregationSchema,
    requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
})
