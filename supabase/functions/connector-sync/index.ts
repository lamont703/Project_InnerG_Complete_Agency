import { createHandler, z, Logger, okResponse } from "../_shared/lib/index.ts"
import { SyncService } from "./service.ts"

// 🛡️ Strict validation for the sync request
const SyncRequestSchema = z.object({
    connection_id: z.string().uuid().optional()
})

/**
 * connector-sync
 * Optimized for production-hardened modular architecture.
 */
export default createHandler(async ({ adminClient, body, user, req }) => {
    const logger = new Logger("connector-sync")
    logger.info("Received sync request", { connection_id: body.connection_id || "GLOBAL_CRON_SYNC" })

    // 1. Authorization check
    const authHeader = req.headers.get("Authorization")
    const envServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const isServiceRole = authHeader && envServiceKey && authHeader.includes(envServiceKey)

    logger.info("Auth Check", { 
        hasUser: !!user, 
        hasAuthHeader: !!authHeader, 
        isServiceRole 
    })

    if (!user && !isServiceRole) {
        throw new Error("UNAUTHORIZED: Authentication required to trigger sync.")
    }

    if (user && user.role === 'client') {
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
    }

    if (!body.connection_id && !isServiceRole) {
        throw new Error("UNAUTHORIZED: Global sync requires Service Role authentication.")
    }

    // 2. Orchestrate Sync
    const service = new SyncService(
        adminClient,
        logger,
        Deno.env.get("GHL_API_KEY") ?? "",
        Deno.env.get("GHL_LOCATION_ID") ?? "",
        Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
        Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
        Deno.env.get("TIKTOK_PRODUCTION_CLIENT_KEY") ?? "",
        Deno.env.get("TIKTOK_PRODUCTION_CLIENT_SECRET") ?? ""
    )

    if (body.connection_id) {
        // Single Connection Sync
        const result = await service.sync(body.connection_id)
        return okResponse({
            connection_id: body.connection_id,
            ...result
        })
    } else {
        // Global Cron Sync: fetch all active connections and sync them
        const { data: connections, error: connErr } = await adminClient
            .from('client_db_connections')
            .select('id, platform')
            .eq('status', 'active')

        if (connErr || !connections) {
            throw new Error(`Failed to load connections for global sync: ${connErr?.message}`)
        }

        logger.info(`Starting global sync for ${connections.length} active connectors`)

        // Run concurrently to avoid timeout constraints across many connectors
        const syncPromises = connections.map(async (conn) => {
            try {
                const res = await service.sync(conn.id)
                return { id: conn.id, platform: conn.platform, success: true, ...res }
            } catch (err: any) {
                logger.error(`Global sync failed for connector ${conn.id}`, err)
                return { id: conn.id, platform: conn.platform, success: false, error: err.message }
            }
        })

        const results = await Promise.all(syncPromises)
        
        return okResponse({
            processed: connections.length,
            results
        })
    }
}, {
    schema: SyncRequestSchema,
    requireAuth: false,
    requiredEnv: [
        "SUPABASE_URL", 
        "SUPABASE_SERVICE_ROLE_KEY", 
        "GHL_API_KEY", 
        "GHL_LOCATION_ID",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "TIKTOK_PRODUCTION_CLIENT_KEY",
        "TIKTOK_PRODUCTION_CLIENT_SECRET"
    ]
})

