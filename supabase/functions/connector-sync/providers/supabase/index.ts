/**
 * supabase/index.ts
 * External Supabase Sync Provider
 */

import { SupabaseClient, createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Repo } from "../../../_shared/lib/index.ts";
import { SyncResult } from "../../service.ts";
import { SupabaseSyncConfig } from "./types.ts";
import { SupabaseTransformer } from "./transformer.ts";

export async function syncSupabaseProvider(
    adminClient: SupabaseClient,
    projectId: string,
    config: SupabaseSyncConfig
): Promise<SyncResult> {
    const { supabase_url, supabase_service_role_key, tables_to_sync = ["users", "orders"] } = config;

    if (!supabase_url || !supabase_service_role_key) {
        return { success: false, records_synced: 0, tables_synced: [], error: "Missing config keys" };
    }

    const activityRepo = new Repo.ActivityRepo(adminClient);
    const externalClient = createClient(supabase_url, supabase_service_role_key);
    let totalRecords = 0;
    const syncedTables: string[] = [];

    for (const table of tables_to_sync) {
        const { data: rawRows, error } = await externalClient.from(table).select("*").limit(100);
        if (error) continue;

        if (rawRows && rawRows.length > 0) {
            const rows = SupabaseTransformer.transformRows(table, rawRows);
            
            await activityRepo.log({
                project_id: projectId,
                category: "integration",
                action: `Synced ${rows.length} rows from external table: ${table}`,
                actor: "system"
            });
            totalRecords += rows.length;
            syncedTables.push(table);
        }
    }

    return { success: true, records_synced: totalRecords, tables_synced: syncedTables };
}
