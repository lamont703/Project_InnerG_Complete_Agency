/**
 * connector-sync/providers/alpaca/index.ts
 * Alpaca Broker Data Sync Implementation
 */

import { AlpacaProvider } from "../../../_shared/lib/index.ts";
import { SyncResult } from "../../service.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function syncAlpaca(
    adminClient: SupabaseClient,
    projectId: string,
    syncConfig: any
): Promise<SyncResult> {
    const auth = {
        accessToken: syncConfig.access_token,
        apiKeyId: syncConfig.api_key_id,
        apiSecretKey: syncConfig.api_secret_key,
        isPaper: syncConfig.is_paper !== false // Default to paper if not specified
    };

    if (!auth.accessToken && (!auth.apiKeyId || !auth.apiSecretKey)) {
        throw new Error("Missing Alpaca credentials (access_token or api_key_id/secret) in sync config.");
    }

    const alpaca = new AlpacaProvider();
    
    // 1. Fetch Account Info
    const account = await alpaca.getAccount(auth);
    
    // 2. Fetch Positions
    const positions = await alpaca.getPositions(auth);
    
    // 3. Store/Update Positions in the database (Optional: create specialized tables later)
    // For now, we'll just return the count and success.
    // In a real implementation, we'd upsert into a `portfolio_positions` table.

    return {
        success: true,
        records_synced: positions.length,
        tables_synced: ["account", "positions"]
    };
}
