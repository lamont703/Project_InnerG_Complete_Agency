/**
 * connector-sync/providers/meta/index.ts
 * Inner G Complete Agency — Meta (FB/IG) Data Connector Provider
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Logger } from "../../../_shared/lib/index.ts"
import { SyncResult } from "../../service.ts"
import { MetaTransformer } from "./transformer.ts"
import { MetaSyncConfig, MetaInsight } from "./types.ts"

const API_VERSION = "v22.0";
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
            const igId = (config as any).instagram_business_account_id || config.page_id;
            
            // Profile Info
            const profileRes = await fetch(`${BASE_URL}/${igId}?fields=username,followers_count,media_count&access_token=${token}`);
            const profileData = await profileRes.json();
            
            // Insights (Aggregated)
            const insRes = await fetch(`${BASE_URL}/${igId}/insights?metric=reach,impressions,profile_views,website_clicks&period=day&access_token=${token}`);
            const insData = await insRes.json();
            
            // Media for engagement and recent performance
            const mediaRes = await fetch(`${BASE_URL}/${igId}/media?fields=id,like_count,comments_count,timestamp,media_type,media_url,caption&limit=10&access_token=${token}`);
            const mediaData = await mediaRes.json();
            
            const metrics = MetaTransformer.transformInstagramMetrics(
                profileData, 
                insData.data || [], 
                mediaData.data || []
            );
            
            // 1. Snapshot Aggregates
            await upsertProjectMetrics(adminClient, projectId, metrics);

            // 2. Update Account Record
            await adminClient
                .from("instagram_accounts")
                .upsert({
                    project_id: projectId,
                    instagram_business_id: igId,
                    username: profileData.username,
                    follower_count: profileData.followers_count || 0,
                    media_count: profileData.media_count || 0,
                    last_synced_at: new Date().toISOString()
                }, { onConflict: "project_id, instagram_business_id" });

            // 3. Update Recent Media Records
            if (mediaData.data && mediaData.data.length > 0) {
                const mediaUpserts = mediaData.data.map((m: any) => ({
                    project_id: projectId,
                    instagram_media_id: m.id,
                    media_type: m.media_type,
                    media_url: m.media_url,
                    caption: m.caption,
                    like_count: m.like_count || 0,
                    comments_count: m.comments_count || 0,
                    timestamp: m.timestamp
                }));

                await adminClient.from("instagram_media").upsert(mediaUpserts, {
                    onConflict: "project_id, instagram_media_id"
                });
            }
            
            return {
                success: true,
                records_synced: Object.keys(metrics).length,
                tables_synced: ["instagram_metrics", "instagram_accounts", "instagram_media"]
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
