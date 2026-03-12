/**
 * linkedin/index.ts
 * LinkedIn Sync Provider Entry Point
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { LinkedInClient } from "./client.ts";
import { LinkedInTransformer } from "./transformer.ts";
import { SyncResult } from "../../service.ts";

export async function syncLinkedIn(
    adminClient: SupabaseClient,
    projectId: string,
    config: {
        access_token: string;
        page_id?: string;
    }
): Promise<SyncResult> {
    const client = new LinkedInClient(config.access_token);
    let recordsSynced = 0;
    const tablesSynced: string[] = [];

    try {
        // 1. Resolve which page(s) to sync
        let pageUrns: string[] = [];
        if (config.page_id) {
            pageUrns = [config.page_id];
        } else {
            // If no specific page ID, try to find pages the user manages
            const adminPages = await client.getAdminPages();
            pageUrns = adminPages.map(p => p.id);
        }

        if (pageUrns.length === 0) {
            return {
                success: true,
                records_synced: 0,
                tables_synced: [],
                error: "No LinkedIn pages found to sync. Please provide a page_id or check your account permissions."
            };
        }

        for (const pageUrn of pageUrns) {
            // 2. Fetch Page Details & Metrics
            const [pageData, pageMetrics] = await Promise.all([
                client.getPage(pageUrn),
                client.getPageMetrics(pageUrn).catch(() => undefined)
            ]);

            const internalPage = LinkedInTransformer.toInternalPage(projectId, pageData, pageMetrics);
            
            const { data: dbPage, error: pageError } = await adminClient
                .from("linkedin_pages")
                .upsert(internalPage, { onConflict: "project_id, linkedin_page_id" })
                .select()
                .single();

            if (pageError) throw pageError;
            recordsSynced++;
            if (!tablesSynced.includes("linkedin_pages")) tablesSynced.push("linkedin_pages");

            // 3. Sync Recent Posts
            const posts = await client.listRecentPosts(pageUrn);
            for (const post of posts) {
                const internalPost = LinkedInTransformer.toInternalPost(projectId, dbPage.id, post);
                // Note: We might want to fetch more metrics per post in the future,
                // but for now we sync the base post data.
                await adminClient
                    .from("linkedin_posts")
                    .upsert(internalPost, { onConflict: "project_id, linkedin_post_id" });
            }
            
            recordsSynced += posts.length;
            if (posts.length > 0 && !tablesSynced.includes("linkedin_posts")) {
                tablesSynced.push("linkedin_posts");
            }
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
