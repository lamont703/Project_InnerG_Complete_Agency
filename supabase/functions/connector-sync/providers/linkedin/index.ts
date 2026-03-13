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
            // client.getPage will normalize numeric IDs to URNs if needed
            const pageData = await client.getPage(pageUrn);
            const canonicalUrn = pageData.id;

            // Now use the canonical URN for metrics and posts
            const pageMetrics = await client.getPageMetrics(canonicalUrn).catch((err) => {
                console.error(`Failed to fetch metrics for ${canonicalUrn}:`, err.message);
                return undefined;
            });

            const internalPage = LinkedInTransformer.toInternalPage(projectId, pageData, pageMetrics);
            
            const { data: dbPage, error: pageError } = await adminClient
                .from("linkedin_pages")
                .upsert(internalPage, { onConflict: "project_id, linkedin_page_id" })
                .select()
                .single();

            if (pageError) throw pageError;
            recordsSynced++;
            if (!tablesSynced.includes("linkedin_pages")) tablesSynced.push("linkedin_pages");

            // 3. Sync Recent Posts with Statistics
            const posts = await client.listRecentPosts(canonicalUrn);
            const postUrns = posts.map(p => p.id);
            const postStats: Record<string, any> = await client.getPostStatistics(canonicalUrn, postUrns).catch((err: any) => {
                console.error(`Failed to fetch post statistics for ${canonicalUrn}:`, err.message);
                return {};
            });

            for (const post of posts) {
                const stats = postStats[post.id];
                const internalPost = LinkedInTransformer.toInternalPost(projectId, dbPage.id, post, stats);
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
