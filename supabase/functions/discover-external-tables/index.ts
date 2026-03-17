/**
 * discover-external-tables/index.ts
 * Inner G Complete Agency — Table Discovery for External Connectors
 *
 * Auth:     Requires super_admin
 * Trigger:  HTTP POST
 */

import { createHandler, z, Logger, okResponse } from "../_shared/lib/index.ts"
import { DiscoverService } from "./service.ts"

// ── Request Schema ────────────────────────────────────────
const DiscoverSchema = z.object({
    provider: z.enum(["supabase", "postgres", "github", "ghl"]),
    config: z.record(z.any()),
})

// ── Handler ───────────────────────────────────────────────
export default createHandler(async ({ adminClient, user, body }) => {
    const logger = new Logger("discover-external-tables")
    const service = new DiscoverService(adminClient, logger)

    logger.info("Starting table discovery", { provider: body.provider })

    const result = await service.discover(body.provider, body.config)

    return okResponse(result)
}, {
    schema: DiscoverSchema,
    requireAuth: true,
    allowedRoles: ["super_admin"],
    requiredEnv: [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
    ]
})
