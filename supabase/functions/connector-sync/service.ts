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


import { SupabaseClient, createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Repo, GhlProvider, Logger } from "../_shared/lib/index.ts"

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
        private ghlLocationId: string = ""
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

        const provider = connection.connector_types?.provider || (connection as any).db_type
        const syncConfig = connection.sync_config || {}
        const projectId = connection.project_id

        this.logger.info(`Starting sync for ${connectionId} (${provider})`)

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
                    result = await this.syncSupabase(connection, syncConfig, projectId)
                    break
                case "ghl":
                    result = await this.syncGHL(connection, syncConfig, projectId)
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

    /**
     * Supabase Rest API Sync.
     */
    private async syncSupabase(_connection: any, syncConfig: any, projectId: string): Promise<SyncResult> {
        const { supabase_url, supabase_service_role_key, tables_to_sync = ["users", "orders"] } = syncConfig

        if (!supabase_url || !supabase_service_role_key) {
            return { success: false, records_synced: 0, tables_synced: [], error: "Missing config keys" }
        }

        const externalClient = createClient(supabase_url, supabase_service_role_key)
        let totalRecords = 0
        const syncedTables: string[] = []

        for (const table of tables_to_sync) {
            const { data: rows, error } = await externalClient.from(table).select("*").limit(100)
            if (error) continue

            if (rows && rows.length > 0) {
                // Log activity per table (simplified)
                await this.activityRepo.log({
                    project_id: projectId,
                    category: "integration",
                    action: `Synced ${rows.length} rows from external table: ${table}`,
                    actor: "system"
                })
                totalRecords += rows.length
                syncedTables.push(table)
            }
        }

        return { success: true, records_synced: totalRecords, tables_synced: syncedTables }
    }

    /**
     * GHL Sync via GhlProvider.
     */
    private async syncGHL(_connection: any, syncConfig: any, projectId: string): Promise<SyncResult> {
        // Credentials are injected from the constructor (passed from index.ts env read).
        // Fallback to syncConfig for per-connector overrides.
        const apiKey = syncConfig.api_key || this.ghlApiKey
        const locationId = syncConfig.location_id || this.ghlLocationId

        if (!apiKey || !locationId) {
            return { success: false, records_synced: 0, tables_synced: [], error: "Missing API credentials" }
        }

        const ghl = new GhlProvider(apiKey)
        let total = 0
        const tables = []

        // Sync Contacts
        try {
            const contacts = await ghl.listContacts(locationId, 100)
            if (contacts.length > 0) {
                // Upsert logic... (moved from index.ts)
                for (const c of contacts) {
                    await this.adminClient.from("ghl_contacts").upsert({
                        project_id: projectId,
                        ghl_contact_id: c.id,
                        email: c.email || null,
                        phone: c.phone || null,
                        full_name: [c.firstName, c.lastName].filter(Boolean).join(" ") || null,
                        synced_at: new Date().toISOString()
                    }, { onConflict: "ghl_contact_id" })
                }
                total += contacts.length
                tables.push("contacts")
            }
        } catch (e) {
            this.logger.warn("GHL Contact sync failed", { error: String(e) })
        }

        return { success: true, records_synced: total, tables_synced: tables }
    }
}
