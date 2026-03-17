/**
 * _shared/lib/db/connectors.ts
 * Inner G Complete Agency — DB Connectors & Sync Log Repository
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

export interface DbConnectionRow {
    id: string
    project_id: string
    client_id: string
    db_type: string
    sync_status: "idle" | "syncing" | "success" | "error"
    sync_config: Record<string, any>
    last_synced_at?: string | null
    connector_types?: {
        provider: string
        config_schema: any
    }
}

export interface SyncLogPayload {
    connection_id: string
    project_id: string
    connector_type: string
    status: "running" | "success" | "error"
    records_synced?: number
    tables_synced?: string[]
    duration_ms?: number
    error_message?: string | null
}

export class ConnectorRepo {
    constructor(private client: SupabaseClient) { }

    /**
     * Fetches connection details including the provider from the type.
     */
    async getConnection(id: string): Promise<DbConnectionRow | null> {
        const { data, error } = await this.client
            .from("client_db_connections")
            .select(`
                *,
                connector_types(provider, config_schema)
            `)
            .eq("id", id)
            .maybeSingle()

        if (error) throw error
        return data as DbConnectionRow | null
    }

    /**
     * Updates the status of a connection.
     */
    async updateStatus(id: string, status: DbConnectionRow["sync_status"], lastSyncedAt?: string): Promise<void> {
        const update: any = { sync_status: status }
        if (lastSyncedAt) update.last_synced_at = lastSyncedAt

        const { error } = await this.client
            .from("client_db_connections")
            .update(update)
            .eq("id", id)

        if (error) throw error
    }

    /**
     * Creates a new sync log entry.
     */
    async createSyncLog(payload: SyncLogPayload): Promise<string> {
        const { data, error } = await this.client
            .from("connector_sync_log")
            .insert(payload)
            .select("id")
            .single()

        if (error) throw error
        return data.id
    }

    /**
     * Updates an existing sync log entry.
     */
    async updateSyncLog(id: string, payload: Partial<SyncLogPayload>): Promise<void> {
        const { error } = await this.client
            .from("connector_sync_log")
            .update({
                ...payload,
                completed_at: new Date().toISOString()
            })
            .eq("id", id)

        if (error) throw error
    }
}
