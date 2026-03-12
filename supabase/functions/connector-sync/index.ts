import { createHandler, z, Logger, okResponse } from "../_shared/lib/index.ts"
import { SyncService } from "./service.ts"

// 🛡️ Strict validation for the sync request
const SyncRequestSchema = z.object({
    connection_id: z.string().uuid()
})

/**
 * connector-sync
 * Optimized for production-hardened modular architecture.
 */
export default createHandler(async ({ adminClient, body }) => {
    const logger = new Logger("connector-sync")
    const service = new SyncService(
        adminClient,
        logger,
        Deno.env.get("GHL_API_KEY") ?? "",
        Deno.env.get("GHL_LOCATION_ID") ?? "",
        Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
        Deno.env.get("GOOGLE_CLIENT_SECRET") ?? ""
    )

    logger.info("Received sync request", { connection_id: body.connection_id })
    console.log(`[DEBUG] Orchestrating sync for connection: ${body.connection_id}`)

    const result = await service.sync(body.connection_id)

    return okResponse({
        connection_id: body.connection_id,
        ...result
    })
}, {
    schema: SyncRequestSchema,
    requiredEnv: [
        "SUPABASE_URL", 
        "SUPABASE_SERVICE_ROLE_KEY", 
        "GHL_API_KEY", 
        "GHL_LOCATION_ID",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET"
    ]
})

