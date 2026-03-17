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
export default createHandler(async ({ adminClient, body, user }) => {
    const logger = new Logger("connector-sync")
    
    // 1. Data Isolation Check
    if (!user) {
        throw new Error("UNAUTHORIZED: Authentication required to trigger sync.")
    }

    if (user.role === 'client') {
        const { data: conn, error: connErr } = await adminClient
            .from('client_db_connections')
            .select('project_id')
            .eq('id', body.connection_id)
            .single()

        if (connErr || !conn) {
            logger.error("Connection not found for permission check", { id: body.connection_id })
            throw new Error("Connection not found")
        }

        // Check project access
        const { data: access, error: accessErr } = await adminClient
            .from('project_user_access')
            .select('project_id')
            .eq('project_id', conn.project_id)
            .eq('user_id', user.id)
            .maybeSingle()

        if (accessErr || !access) {
            logger.warn("Unauthorized sync attempt", { userId: user.id, connectionId: body.connection_id, projectId: conn.project_id })
            throw new Error("UNAUTHORIZED: You do not have permission to sync this connection.")
        }
    } else if (user.role !== 'super_admin' && user.role !== 'developer') {
        // Fallback for other roles if they somehow call this
        throw new Error(`FORBIDDEN: Role ${user.role} is not permitted to trigger sync.`)
    }

    // 2. Orchestrate Sync
    const service = new SyncService(
        adminClient,
        logger,
        Deno.env.get("GHL_API_KEY") ?? "",
        Deno.env.get("GHL_LOCATION_ID") ?? "",
        Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
        Deno.env.get("GOOGLE_CLIENT_SECRET") ?? ""
    )

    logger.info("Received authorized sync request", { connection_id: body.connection_id, userId: user.id })
    const result = await service.sync(body.connection_id)

    return okResponse({
        connection_id: body.connection_id,
        ...result
    })
}, {
    schema: SyncRequestSchema,
    requireAuth: true,
    requiredEnv: [
        "SUPABASE_URL", 
        "SUPABASE_SERVICE_ROLE_KEY", 
        "GHL_API_KEY", 
        "GHL_LOCATION_ID",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET"
    ]
})

