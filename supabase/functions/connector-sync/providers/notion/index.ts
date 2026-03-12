/**
 * notion/index.ts
 * Notion Sync Provider Entry Point
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { NotionClient } from "./client.ts";
import { NotionTransformer } from "./transformer.ts";
import { SyncResult } from "../../service.ts";

export async function syncNotion(
    adminClient: SupabaseClient,
    projectId: string,
    config: {
        notion_api_key: string;
        page_id?: string;
        depth?: number;
    }
): Promise<SyncResult> {
    if (!config.notion_api_key) {
        return { success: false, records_synced: 0, tables_synced: [], error: "Missing Notion API Key" };
    }

    const client = new NotionClient(config.notion_api_key);
    let recordsSynced = 0;
    const tablesSynced: string[] = [];

    try {
        let pagesToSync: any[] = [];

        if (config.page_id) {
            // Sync specific page or database
            const rootPage = await client.getPage(config.page_id);
            pagesToSync.push(rootPage);
            
            // If depth > 0, we should ideally crawl children, 
            // but for MVP let's just sync the page and its immediate children if it's a database
            // Search is more efficient for "getting everything"
        } else {
            // Sync all accessible pages
            const searchResult = await client.search("", { property: "object", value: "page" });
            pagesToSync = searchResult.results;
        }

        for (const page of pagesToSync) {
            const title = client.getPageTitle(page);
            const content = await client.getPageContent(page.id);
            
            const internalPage = NotionTransformer.toInternalPage(projectId, page, title, content);
            
            const { error } = await adminClient
                .from("notion_pages")
                .upsert(internalPage, { onConflict: "project_id, notion_page_id" });

            if (error) {
                console.error(`Error syncing notion page ${page.id}:`, error);
                continue;
            }
            
            recordsSynced++;
        }

        if (recordsSynced > 0) {
            tablesSynced.push("notion_pages");
        }

        return {
            success: true,
            records_synced: recordsSynced,
            tables_synced: tablesSynced
        };

    } catch (err: any) {
        return {
            success: false,
            records_synced: recordsSynced,
            tables_synced: tablesSynced,
            error: err.message
        };
    }
}
