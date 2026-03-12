/**
 * ghl/index.ts
 * GHL Sync Provider
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GhlProvider, Logger } from "../../../_shared/lib/index.ts";
import { GhlTransformer } from "./transformer.ts";
import { SyncResult } from "../../service.ts";

export async function syncGHL(
    adminClient: SupabaseClient,
    logger: Logger,
    projectId: string,
    config: {
        api_key?: string;
        location_id?: string;
    },
    defaultApiKey: string,
    defaultLocationId: string
): Promise<SyncResult> {
    const apiKey = config.api_key || defaultApiKey;
    const locationId = config.location_id || defaultLocationId;

    if (!apiKey || !locationId) {
        return { success: false, records_synced: 0, tables_synced: [], error: "Missing API credentials" };
    }

    const ghl = new GhlProvider(apiKey);
    let total = 0;
    const tables = [];

    try {
        const contacts = await ghl.listContacts(locationId, 100);
        if (contacts.length > 0) {
            for (const c of contacts) {
                const internal = GhlTransformer.toInternalContact(projectId, c);
                await adminClient.from("ghl_contacts").upsert(internal, { onConflict: "ghl_contact_id" });
            }
            total += contacts.length;
            tables.push("contacts");
        }
        
        return { success: true, records_synced: total, tables_synced: tables };
    } catch (e: any) {
        logger.warn("GHL Contact sync failed", { error: String(e) });
        return { success: false, records_synced: total, tables_synced: tables, error: e.message };
    }
}
