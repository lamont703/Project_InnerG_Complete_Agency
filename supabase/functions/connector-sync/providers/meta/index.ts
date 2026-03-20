import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Logger } from "../../../_shared/lib/index.ts"
import { SyncResult } from "../../service.ts"
import { MetaTransformer } from "./transformer.ts"
import { MetaSyncConfig, InstagramComment } from "./types.ts"
import { MetaClient } from "./client.ts"
import { MetaEngagementService } from "./engagement.ts"
import { getEnv } from "../../../_shared/lib/core/env.ts"

const API_VERSION = "v19.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

export async function syncMeta(
    adminClient: SupabaseClient,
    logger: Logger,
    projectId: string,
    config: MetaSyncConfig,
    providerType: string // "facebook" or "instagram"
): Promise<SyncResult> {
    logger.info(`🔄 Syncing Meta/${providerType} for project ${projectId}`);

    try {
        const token = config.access_token;
        const pageToken = config.page_access_token;
        const metaClient = new MetaClient(token);

        if (providerType === "facebook") {
            // FB sync logic
            const pageId = config.page_id;
            const res = await fetch(`${BASE_URL}/${pageId}?fields=fan_count,name,followers_count&access_token=${pageToken}`);
            const pageData = await res.json();
            
            // FB Insights
            const insRes = await fetch(`${BASE_URL}/${pageId}/insights?metric=page_posts_impressions_unique,page_post_engagements&period=day&access_token=${pageToken}`);
            const insData = await insRes.json();
            
            const metrics = MetaTransformer.transformFacebookMetrics(pageData, insData.data || []);
            
            // 1. Snapshot Aggregates
            await upsertProjectMetrics(adminClient, projectId, metrics);
            
            // 2. Update Specific Page Record
            await adminClient
                .from("facebook_pages")
                .upsert({
                    project_id: projectId,
                    facebook_page_id: pageId,
                    name: pageData.name,
                    fan_count: pageData.fan_count || 0,
                    followers_count: pageData.followers_count || 0,
                    last_synced_at: new Date().toISOString()
                }, { onConflict: "project_id, facebook_page_id" });

            return {
                success: true,
                records_synced: Object.keys(metrics).length,
                tables_synced: ["facebook_metrics", "facebook_pages"]
            };
        } else {
            // Instagram sync logic
            const igId = config.instagram_business_account_id || config.page_id;
            if (!igId) throw new Error("Missing IG Business Account ID");
            
            // Profile Info
            const profileRes = await fetch(`${BASE_URL}/${igId}?fields=username,followers_count,media_count&access_token=${token}`);
            const profileData = await profileRes.json();
            
            // Insights (Aggregated)
            const insRes = await fetch(`${BASE_URL}/${igId}/insights?metric=reach,impressions,profile_views,website_clicks&period=day&access_token=${token}`);
            const insData = await insRes.json();
            
            // Media for engagement and recent performance
            const mediaRes = await fetch(`${BASE_URL}/${igId}/media?fields=id,like_count,comments_count,timestamp,media_type,media_url,caption,permalink&limit=10&access_token=${token}`);
            const mediaData = await mediaRes.json();
            
            const metrics = MetaTransformer.transformInstagramMetrics(
                profileData, 
                insData.data || [], 
                mediaData.data || []
            );
            
            // 1. Snapshot Aggregates
            await upsertProjectMetrics(adminClient, projectId, metrics);

            // 2. Update Account Record
            const { data: igAccount, error: igAccError } = await adminClient
                .from("instagram_accounts")
                .upsert({
                    project_id: projectId,
                    instagram_business_id: igId,
                    username: profileData.username,
                    follower_count: profileData.followers_count || 0,
                    media_count: profileData.media_count || 0,
                    last_synced_at: new Date().toISOString()
                }, { onConflict: "project_id, instagram_business_id" })
                .select()
                .single();

            if (igAccError) throw igAccError;

            // 3. Update Recent Media and Comments
            let totalCommentsSynced = 0;
            if (mediaData.data && mediaData.data.length > 0) {
                const mediaUpserts = mediaData.data.map((m: any) => ({
                    project_id: projectId,
                    instagram_media_id: m.id,
                    media_type: m.media_type,
                    media_url: m.media_url,
                    caption: m.caption,
                    permalink: m.permalink,
                    like_count: m.like_count || 0,
                    comments_count: m.comments_count || 0,
                    timestamp: m.timestamp
                }));

                const { data: syncedMedia, error: mediaUpsertError } = await adminClient
                    .from("instagram_media")
                    .upsert(mediaUpserts, {
                        onConflict: "project_id, instagram_media_id"
                    })
                    .select();
                
                if (mediaUpsertError) throw mediaUpsertError;

                // 4. Fetch Comments and Insights for recently active media
                for (const media of syncedMedia) {
                    try {
                        // 4a. Comments
                        const commentsRes = await fetch(`${BASE_URL}/${media.instagram_media_id}/comments?fields=id,text,timestamp,from,parent_id&access_token=${token}`);
                        const commentsData = await commentsRes.json();
                        
                        if (commentsData.data && commentsData.data.length > 0) {
                            const commentUpserts = commentsData.data.map((c: InstagramComment) => ({
                                project_id: projectId,
                                media_id: media.id,
                                instagram_comment_id: c.id,
                                from_id: c.from?.id || "unknown",
                                from_username: c.from?.username || "unknown",
                                content: c.text,
                                created_at: c.timestamp,
                                parent_comment_id: c.parent_id || null,
                                last_synced_at: new Date().toISOString()
                            }));

                            await adminClient.from("instagram_comments").upsert(commentUpserts, {
                                onConflict: "project_id, instagram_comment_id"
                            });
                            totalCommentsSynced += commentUpserts.length;
                        }

                        // 4b. Media Insights (Reach, Impressions, Saved, Video Views)
                        // Note: video_views (play_count) is only for VIDEO/REELS
                        const metricsToFetch = ['reach', 'impressions', 'saved'];
                        if (media.media_type === 'VIDEO') metricsToFetch.push('play_count');
                        
                        const insightsRes = await fetch(`${BASE_URL}/${media.instagram_media_id}/insights?metric=${metricsToFetch.join(',')}&access_token=${token}`);
                        const insightsData = await insightsRes.json();
                        
                        if (insightsData.data) {
                            const findInsight = (name: string) => insightsData.data.find((i: any) => i.name === name)?.values[0]?.value || 0;
                            
                            await adminClient.from("instagram_media").update({
                                reach: findInsight('reach'),
                                impressions: findInsight('impressions'),
                                saves: findInsight('saved'),
                                video_views: findInsight('play_count'),
                                last_synced_at: new Date().toISOString()
                            }).eq("id", media.id);
                        }
                    } catch (err: any) {
                        logger.error(`Failed to fetch extra data for media ${media.instagram_media_id}: ${err.message}`);
                    }
                }
            }

            // 5. Trigger AI Engagement (Scan for turns and meeting interest)
            try {
                const geminiApiKey = getEnv("GEMINI_API_KEY");
                if (geminiApiKey) {
                    const engagementService = new MetaEngagementService(adminClient, projectId, geminiApiKey);
                    const responsesSent = await engagementService.processNewComments(metaClient, igId);
                    logger.info(`Instagram AI Engagement: Processed sync, sent ${responsesSent} automatic replies.`);
                }
            } catch (engErr: any) {
                logger.error(`Instagram AI Engagement failed: ${engErr.message}`);
            }
            
            return {
                success: true,
                records_synced: Object.keys(metrics).length + totalCommentsSynced,
                tables_synced: ["instagram_metrics", "instagram_accounts", "instagram_media", "instagram_comments"]
            };
        }
    } catch (err: any) {
        logger.error(`❌ Meta Sync Failed: ${err.message}`);
        return {
            success: false,
            records_synced: 0,
            tables_synced: [],
            error: err.message
        };
    }
}

/**
 * Helper to upsert metrics into the project_metrics_snapshots
 */
async function upsertProjectMetrics(
    adminClient: SupabaseClient, 
    projectId: string, 
    metrics: Record<string, any>
) {
    const today = new Date().toISOString().split('T')[0];
    
    const { error } = await adminClient
        .from("project_metrics_snapshots")
        .upsert({
            project_id: projectId,
            snapshot_date: today,
            metrics_payload: metrics,
            updated_at: new Date().toISOString()
        }, {
            onConflict: "project_id, snapshot_date"
        });
        
    if (error) {
        console.error("Upsert Metrics Error:", error);
        throw error;
    }
}
