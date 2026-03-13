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
                
                console.log(`[LinkedInSync] Upserting post: ${post.id}`);
                const { error: postError } = await adminClient
                    .from("linkedin_posts")
                    .upsert(internalPost, { onConflict: "project_id, linkedin_post_id" });

                if (postError) {
                    console.error(`[LinkedInSync] Error upserting post ${post.id}:`, postError.message);
                    continue;
                }

                // Fetch the UUID for the post to use as foreign key for comments
                const { data: dbPost, error: fetchError } = await adminClient
                    .from("linkedin_posts")
                    .select("id")
                    .eq("project_id", projectId)
                    .eq("linkedin_post_id", post.id)
                    .single();

                if (!fetchError && dbPost) {
                    console.log(`[LinkedInSync] Syncing comments for post UUID: ${dbPost.id}`);
                    // 4. Sync Comments for this post
                    const comments = await client.getPostComments(post.id).catch((err: any) => {
                        console.error(`[LinkedInSync] Failed to fetch comments for post ${post.id}:`, err.message);
                        return [];
                    });

                    console.log(`[LinkedInSync] Found ${comments.length} comments for post ${post.id}`);

                    for (const comment of comments) {
                        const internalComment = LinkedInTransformer.toInternalComment(projectId, dbPost.id, comment);
                        const { data: dbComment, error: commentErr } = await adminClient
                            .from("linkedin_comments")
                            .upsert(internalComment, { onConflict: "project_id, linkedin_comment_id" })
                            .select()
                            .single();
                        
                        if (commentErr) {
                            console.error(`[LinkedInSync] Error upserting comment ${comment.id}:`, commentErr.message);
                        } else {
                            console.log(`[LinkedInSync] Successfully upserted comment ${comment.id}`);
                            
                            // 5. Deep Sync: Fetch replies for this comment
                            // LinkedIn uses the same socialActions endpoint for comment replies
                            const replies = await client.getPostComments(comment.$URN || comment.id).catch((err: any) => {
                                console.error(`[LinkedInSync] Failed to fetch replies for comment ${comment.id}:`, err.message);
                                return [];
                            });

                            if (replies.length > 0) {
                                console.log(`[LinkedInSync] Found ${replies.length} replies for comment ${comment.id}`);
                                for (const reply of replies) {
                                    const internalReply = LinkedInTransformer.toInternalComment(projectId, dbPost.id, reply);
                                    await adminClient
                                        .from("linkedin_comments")
                                        .upsert(internalReply, { onConflict: "project_id, linkedin_comment_id" });
                                }
                                recordsSynced += replies.length;
                            }
                        }
                    }
                    recordsSynced += comments.length;
                    if (comments.length > 0 && !tablesSynced.includes("linkedin_comments")) {
                        tablesSynced.push("linkedin_comments");
                    }
                } else {
                    console.error(`[LinkedInSync] Could not resolve post UUID for ${post.id}:`, fetchError?.message);
                }
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
