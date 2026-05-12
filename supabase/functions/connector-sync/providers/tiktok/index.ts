/**
 * tiktok/index.ts
 * TikTok Sync Provider Entry Point
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TikTokClient } from "./client.ts";
import { TikTokTransformer } from "./transformer.ts";
import { SyncResult } from "../../service.ts";

export async function syncTikTok(
    adminClient: SupabaseClient,
    projectId: string,
    config: {
        access_token: string;
        refresh_token?: string;
        tiktok_user_id?: string;
    },
    clientId: string,
    clientSecret: string,
    connectionId: string
): Promise<SyncResult> {
    if (!config.access_token) {
        return { success: false, records_synced: 0, tables_synced: [], error: "Missing TikTok Access Token" };
    }

    let currentAccessToken = config.access_token;
    let finalRecordsSynced = 0;
    const finalTablesSynced: string[] = [];

    console.log(`[TikTokSync] Starting sync for project ${projectId}, connection ${connectionId}`);

    const performSync = async (token: string): Promise<SyncResult> => {
        const client = new TikTokClient(token);
        let innerRecordsSynced = 0;
        const innerTablesSynced: string[] = [];

        // 1. Sync User Info (Account)
        console.log(`[TikTokSync] Fetching user info...`);
        const userResponse = await client.getUserInfo();
        const user = userResponse.data?.user;

        if (user) {
            console.log(`[TikTokSync] Found user: ${user.display_name} (${user.open_id}). Upserting account...`);
            const internalAccount = TikTokTransformer.toInternalAccount(projectId, user);
            const { error: accountErr } = await adminClient
                .from("tiktok_accounts")
                .upsert(internalAccount, { onConflict: "project_id, tiktok_user_id" });

            if (accountErr) {
                console.error(`[TikTokSync] Error upserting TikTok account:`, JSON.stringify(accountErr));
            } else {
                innerRecordsSynced++;
                innerTablesSynced.push("tiktok_accounts");
                console.log(`[TikTokSync] Account upserted successfully.`);
            }
        } else {
            console.warn(`[TikTokSync] No user data found in TikTok response:`, JSON.stringify(userResponse));
        }

        // 2. Sync Videos
        console.log(`[TikTokSync] Fetching creator videos...`);
        let hasMore = true;
        let cursor: number | undefined;

        while (hasMore) {
            console.log(`[TikTokSync] Video loop - Fetching videos with cursor: ${cursor ?? 'start'}`);
            const videoResponse = await client.getUserVideos(cursor);
            const videos = videoResponse.data?.videos || [];
            
            if (videos.length > 0) {
                console.log(`[TikTokSync] Found ${videos.length} videos. Upserting...`);
                const internalVideos = videos.map((v: any) => 
                    TikTokTransformer.toInternalVideo(projectId, v)
                );

                const { error: videoErr } = await adminClient
                    .from("tiktok_videos")
                    .upsert(internalVideos, { onConflict: "project_id, tiktok_video_id" });

                if (videoErr) {
                    console.error(`[TikTokSync] Error upserting TikTok videos:`, JSON.stringify(videoErr));
                } else {
                    innerRecordsSynced += videos.length;
                    if (!innerTablesSynced.includes("tiktok_videos")) {
                        innerTablesSynced.push("tiktok_videos");
                    }
                    console.log(`[TikTokSync] ${videos.length} videos upserted.`);
                }
            }

            hasMore = videoResponse.data?.has_more || false;
            cursor = videoResponse.data?.cursor;

            if (innerRecordsSynced > 500) {
                console.log(`[TikTokSync] Safety limit reached (500 records). Stopping video sync.`);
                break;
            }
        }

        return {
            success: true,
            records_synced: innerRecordsSynced,
            tables_synced: innerTablesSynced
        };
    };

    try {
        try {
            const result = await performSync(currentAccessToken);
            finalRecordsSynced = result.records_synced;
            result.tables_synced.forEach(t => finalTablesSynced.push(t));
            return result;
        } catch (err: any) {
            console.error(`[TikTokSync] Sync attempt failed: ${err.message}`);
            
            // Check if it's a token error
            const isTokenError = 
                err.message.includes("access_token_invalid") || 
                err.message.includes("Access token is invalid") ||
                err.message.includes("401") ||
                err.message.includes("invalid_grant");

            if (isTokenError && config.refresh_token && clientId && clientSecret) {
                console.log(`[TikTokSync] Access Token expired. Attempting refresh for ${connectionId}...`);
                
                const refreshRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        client_key: clientId,
                        client_secret: clientSecret,
                        grant_type: "refresh_token",
                        refresh_token: config.refresh_token,
                    }),
                });

                if (refreshRes.ok) {
                    const refreshData = await refreshRes.json();
                    if (refreshData.access_token) {
                        currentAccessToken = refreshData.access_token;
                        
                        console.log(`[TikTokSync] Token refresh successful. Updating database...`);
                        
                        // Update the connection config with the new token
                        const newConfig = {
                            ...config,
                            access_token: refreshData.access_token,
                            refresh_token: refreshData.refresh_token || config.refresh_token,
                        };

                        const { error: updateErr } = await adminClient
                            .from("client_db_connections")
                            .update({ sync_config: newConfig })
                            .eq("id", connectionId);

                        if (updateErr) {
                            console.error(`[TikTokSync] Failed to update connection with refreshed token:`, JSON.stringify(updateErr));
                        } else {
                            console.log(`[TikTokSync] Connection config updated. Retrying sync...`);
                            const result = await performSync(currentAccessToken);
                            finalRecordsSynced = result.records_synced;
                            result.tables_synced.forEach(t => finalTablesSynced.push(t));
                            return result;
                        }
                    }
                } else {
                    const errData = await refreshRes.json().catch(() => ({}));
                    console.error("[TikTokSync] Token refresh failed:", JSON.stringify(errData));
                    throw new Error(`TikTok Token Refresh Failed: ${errData.error_description || errData.error || "Unknown Error"}`);
                }
            }
            throw err; 
        }
    } catch (err: any) {
        console.error(`[TikTokSync] Fatal error: ${err.message}`);
        return {
            success: false,
            records_synced: finalRecordsSynced,
            tables_synced: finalTablesSynced,
            error: err.message
        };
    }
}
