/**
 * linkedin/index.ts
 * LinkedIn Sync Provider Entry Point
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { LinkedInClient } from "./client.ts";
import { LinkedInTransformer } from "./transformer.ts";
import { LinkedInEngagementService } from "./engagement.ts";
import { SyncResult } from "../../service.ts";
import { getEnv } from "../../../_shared/lib/core/env.ts";

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
                    
                    // Recursive function to fetch and store comments and their nested replies
                    const syncCommentBranch = async (parentUrn?: string, depth = 0): Promise<number> => {
                        if (depth > 5) return 0; // Max depth to avoid runaway recursion

                        const targetUrn = parentUrn || post.id;
                        const comments = await client.getPostComments(post.id, parentUrn).catch((err: any) => {
                            console.error(`[LinkedInSync] Failed to fetch comments for ${targetUrn}:`, err.message);
                            return [];
                        });

                        let branchCount = 0;
                        for (const comment of comments) {
                            const internalComment = LinkedInTransformer.toInternalComment(projectId, dbPost.id, post.id, comment);
                            const { data: dbComment, error: commentErr } = await adminClient
                                .from("linkedin_comments")
                                .upsert(internalComment, { onConflict: "project_id, linkedin_comment_id" })
                                .select()
                                .single();

                            if (commentErr) {
                                console.error(`[LinkedInSync] Error upserting comment ${comment.id}:`, commentErr.message);
                            } else if (dbComment) {
                                branchCount++;
                                
                                // Construct the URN for the current comment to fetch its replies
                                const atomicId = dbComment.linkedin_comment_id;
                                const currentUrn = atomicId.startsWith("urn:li:") 
                                    ? atomicId 
                                    : `urn:li:comment:(${post.id},${atomicId})`;

                                // RECURSIVELY fetch nested replies
                                branchCount += await syncCommentBranch(currentUrn, depth + 1);
                            }
                        }
                        return branchCount;
                    };

                    // Execute recursive sync starting from top-level comments
                    const totalComments = await syncCommentBranch();
                    recordsSynced += totalComments;

                    console.log(`[LinkedInSync] Synced ${totalComments} comments/replies for post ${post.id}`);

                    if (totalComments > 0 && !tablesSynced.includes("linkedin_comments")) {
                        tablesSynced.push("linkedin_comments");
                    }
                }
            }
            
            if (posts.length > 0 && !tablesSynced.includes("linkedin_posts")) {
                tablesSynced.push("linkedin_posts");
            }

            // 4. Prune Deleted Posts (Synchronize Deletions)
            // Fetch the last 50 synced posts to verify existence
            const { data: recentDBPosts } = await adminClient
                .from("linkedin_posts")
                .select("id, linkedin_post_id")
                .eq("project_id", projectId)
                .is("deleted_at", null) // If we have a soft delete system
                .order("created_at", { ascending: false })
                .limit(50);

            if (recentDBPosts && recentDBPosts.length > 0) {
                const dbPostUrns = recentDBPosts.map((p: any) => p.linkedin_post_id);
                const liveUrns = await client.checkPostsExist(dbPostUrns);
                
                const deletedUrns = dbPostUrns.filter((urn: any) => !liveUrns.includes(urn));
                if (deletedUrns.length > 0) {
                    console.info(`[LinkedInSync] Pruning ${deletedUrns.length} deleted posts:`, deletedUrns);
                    
                    // a) Remove from linkedin_posts (clean up the dashboard)
                    await adminClient
                        .from("linkedin_posts")
                        .delete()
                        .in("linkedin_post_id", deletedUrns)
                        .eq("project_id", projectId);

                    // b) Update social_content_plan if they originated here 
                    // (Optional: we might want to keep them as 'published' but mark as distant/missing)
                    // For now, let's just delete the planner entry too if the user wants "removed"
                    await adminClient
                        .from("social_content_plan")
                        .delete()
                        .in("external_post_id", deletedUrns)
                        .eq("project_id", projectId);
                }
            }

            // 6. Engagement Intelligence: AI-driven comment replies
            const engagementAgent = new LinkedInEngagementService(
                adminClient,
                projectId,
                getEnv("GEMINI_API_KEY")
            );

            const commentsReplied = (await engagementAgent.processNewComments(client, canonicalUrn).catch(err => {
                console.error(`[LinkedInEngagement] Process failed:`, err.message);
                return 0;
            })) || 0;

            if (commentsReplied > 0) {
                console.log(`[LinkedInEngagement] Sent ${commentsReplied} AI engagement responses.`);
                recordsSynced += commentsReplied;
            }

            // 7. Cross-Table Alignment Guard (Strict Sources Table Sync)
            // If a 'published' LinkedIn record in the social_content_plan is NOT present in our synced linkedin_posts table,
            // then it should be removed from the social_content_plan to maintain a single source of truth.
            const { data: contentPlanItems } = await adminClient
                .from("social_content_plan")
                .select("id, external_post_id")
                .eq("project_id", projectId)
                .eq("platform", "linkedin")
                .eq("status", "published");

            if (contentPlanItems && contentPlanItems.length > 0) {
                // Get all valid linkedin post IDs we have for this project
                const { data: validPosts } = await adminClient
                    .from("linkedin_posts")
                    .select("linkedin_post_id")
                    .eq("project_id", projectId);
                
                const validPostUrns = new Set(validPosts?.map((p: any) => p.linkedin_post_id) || []);
                const staleIds = contentPlanItems
                    .filter((item: any) => !item.external_post_id || !validPostUrns.has(item.external_post_id))
                    .map((item: any) => item.id);

                if (staleIds.length > 0) {
                    console.info(`[LinkedInSync] Purging ${staleIds.length} stale social_content_plan records NOT found in linkedin_posts.`);
                    await adminClient
                        .from("social_content_plan")
                        .delete()
                        .in("id", staleIds);
                }
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
