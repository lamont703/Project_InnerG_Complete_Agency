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
        // 1. Sync Contacts
        const contacts = await ghl.listContacts(locationId, 100);
        if (contacts.length > 0) {
            for (const c of contacts) {
                const internal = GhlTransformer.toInternalContact(projectId, c);
                await adminClient.from("ghl_contacts").upsert(internal, { onConflict: "ghl_contact_id" });
            }
            total += contacts.length;
            tables.push("contacts");
        }

        // 2. Sync Social Accounts
        const socialAccounts = await ghl.listSocialAccounts(locationId);
        if (socialAccounts.length > 0) {
            const internalAccounts = socialAccounts.map((a: any) => GhlTransformer.toInternalSocialAccount(projectId, a));
            const { data: insertedAccounts, error: accError } = await adminClient
                .from("ghl_social_accounts")
                .upsert(internalAccounts, { onConflict: "project_id, ghl_account_id" })
                .select();
            
            if (accError) throw accError;
            
            total += socialAccounts.length;
            tables.push("social_accounts");

            // 3. Sync Social Posts (for each active account)
            const accountMap = new Map<string, string>(insertedAccounts?.map((a: any) => [a.ghl_account_id, a.id]));
            const postOptions = { limit: 50, status: 'posted' }; // Sync recently posted context
            const posts = await ghl.listSocialPosts(locationId, postOptions);
            
            if (posts.length > 0) {
                const internalPosts = posts.map((p: any) => {
                    const internalAccountId = accountMap.get(p.accountId);
                    if (!internalAccountId) return null;
                    return GhlTransformer.toInternalSocialPost(projectId, internalAccountId, p);
                }).filter(Boolean);

                if (internalPosts.length > 0) {
                    const { error: postError } = await adminClient
                        .from("ghl_social_posts")
                        .upsert(internalPosts, { onConflict: "ghl_post_id" });
                    
                    if (postError) throw postError;
                    
                    total += internalPosts.length;
                    tables.push("social_posts");
                }
            }
        }
        
        return { success: true, records_synced: total, tables_synced: tables };
    } catch (e: any) {
        logger.error("GHL sync encountered an error", { error: String(e), stack: e.stack });
        return { success: false, records_synced: total, tables_synced: tables, error: e.message };
    }
}
