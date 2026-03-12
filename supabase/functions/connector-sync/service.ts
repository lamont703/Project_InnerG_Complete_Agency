/**
 * connector-sync/service.ts
 * Inner G Complete Agency — Data Connector Sync Service
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This file ONLY contains business logic.
 * It must NOT handle CORS, authentication, or HTTP responses.
 * All secrets must be injected via the constructor from index.ts.
 * Do NOT call Deno.env.get() inside this file.
 * ─────────────────────────────────────────────────────────
 *
 * NOTE: The `createClient()` call inside syncSupabase() is intentional.
 * It creates a client for an EXTERNAL client database, not the agency's
 * own Supabase instance. This is the business purpose of this service.
 * ─────────────────────────────────────────────────────────
 */


import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Repo, Logger } from "../_shared/lib/index.ts"
import { syncGithub } from "./providers/github/index.ts"
import { syncGHL } from "./providers/ghl/index.ts"
import { syncSupabaseProvider } from "./providers/supabase/index.ts"
import { syncYouTube } from "./providers/youtube/index.ts"
import { syncLinkedIn } from "./providers/linkedin/index.ts"
import { syncNotion } from "./providers/notion/index.ts"
import { syncTikTok } from "./providers/tiktok/index.ts"

export interface SyncResult {
    success: boolean
    records_synced: number
    tables_synced: string[]
    error?: string
}

export class SyncService {
    private connectorRepo: Repo.ConnectorRepo
    private activityRepo: Repo.ActivityRepo

    constructor(
        private adminClient: SupabaseClient,
        private logger: Logger,
        private ghlApiKey: string = "",
        private ghlLocationId: string = "",
        private googleClientId: string = "",
        private googleClientSecret: string = ""
    ) {
        this.connectorRepo = new Repo.ConnectorRepo(adminClient)
        this.activityRepo = new Repo.ActivityRepo(adminClient)
    }

    /**
     * Main sync dispatcher.
     */
    async sync(connectionId: string): Promise<SyncResult> {
        const startTime = Date.now()
        const connection = await this.connectorRepo.getConnection(connectionId)

        if (!connection) {
            throw new Error(`Connection not found: ${connectionId}`)
        }

        const rawProvider = connection.connector_types?.provider || (connection as any).db_type || ""
        const provider = rawProvider.trim().toLowerCase()
        const syncConfig = connection.sync_config || {}
        const projectId = connection.project_id

        this.logger.info(`Starting sync for ${connectionId} (normalized provider: "${provider}")`)

        // 1. Mark as syncing
        await this.connectorRepo.updateStatus(connectionId, "syncing")

        // 2. Create log entry
        const syncLogId = await this.connectorRepo.createSyncLog({
            connection_id: connectionId,
            project_id: projectId,
            connector_type: provider,
            status: "running",
        })

        // 3. Dispatch
        let result: SyncResult
        try {
            switch (provider) {
                case "supabase":
                    result = await syncSupabaseProvider(this.adminClient, projectId, syncConfig as any)
                    break
                case "ghl":
                    result = await syncGHL(
                        this.adminClient,
                        this.logger,
                        projectId,
                        syncConfig as any,
                        this.ghlApiKey,
                        this.ghlLocationId
                    )
                    break
                case "github":
                    result = await syncGithub(this.adminClient, projectId, syncConfig as any)
                    break
                case "youtube":
                    result = await syncYouTube(
                        this.adminClient, 
                        projectId, 
                        syncConfig as any,
                        this.googleClientId,
                        this.googleClientSecret,
                        connectionId
                    )
                    break
                case "linkedin":
                    result = await syncLinkedIn(
                        this.adminClient,
                        projectId,
                        syncConfig as any
                    )
                    break
                case "notion":
                    result = await syncNotion(
                        this.adminClient,
                        projectId,
                        syncConfig as any
                    )
                    break
                case "tiktok":
                    result = await syncTikTok(
                        this.adminClient,
                        projectId,
                        syncConfig as any
                    )
                    break
                default:
                    result = {
                        success: false,
                        records_synced: 0,
                        tables_synced: [],
                        error: `Provider "${provider}" not implemented`
                    }
            }
        } catch (err) {
            this.logger.error(`Sync failed for ${connectionId}`, err)
            result = {
                success: false,
                records_synced: 0,
                tables_synced: [],
                error: String(err)
            }
        }

        // 4. Finalize
        const durationMs = Date.now() - startTime
        await this.connectorRepo.updateSyncLog(syncLogId, {
            status: result.success ? "success" : "error",
            records_synced: result.records_synced,
            tables_synced: result.tables_synced,
            duration_ms: durationMs,
            error_message: result.error || null,
        })

        await this.connectorRepo.updateStatus(
            connectionId,
            result.success ? "success" : "error",
            new Date().toISOString()
        )

        // Log to activity log
        if (projectId) {
            await this.activityRepo.log({
                project_id: projectId,
                category: "integration",
                action: result.success
                    ? `Successfully synced ${result.records_synced} records from ${provider}`
                    : `Sync failed for ${provider}: ${result.error}`,
            })
        }

        return result
    }

}
