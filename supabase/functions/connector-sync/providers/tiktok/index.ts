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
    let recordsSynced = 0;
    const tablesSynced: string[] = [];

    const performSync = async (token: string): Promise<SyncResult> => {
        const client = new TikTokClient(token);
        let innerRecordsSynced = 0;
        const innerTablesSynced: string[] = [];

        // 1. Sync User Info (Account)
        const userResponse = await client.getUserInfo();
        const user = userResponse.data?.user;

        if (user) {
            const internalAccount = TikTokTransformer.toInternalAccount(projectId, user);
            const { error: accountErr } = await adminClient
                .from("tiktok_accounts")
                .upsert(internalAccount, { onConflict: "project_id, tiktok_user_id" });

            if (accountErr) {
                console.error(`Error syncing TikTok account ${user.open_id}:`, accountErr);
            } else {
                innerRecordsSynced++;
                innerTablesSynced.push("tiktok_accounts");
            }
        }

        // 2. Sync Videos
        let hasMore = true;
        let cursor: number | undefined;

        while (hasMore) {
            const videoResponse = await client.getUserVideos(cursor);
            const videos = videoResponse.data?.videos || [];
            
            if (videos.length > 0) {
                const internalVideos = videos.map((v: any) => 
                    TikTokTransformer.toInternalVideo(projectId, v)
                );

                const { error: videoErr } = await adminClient
                    .from("tiktok_videos")
                    .upsert(internalVideos, { onConflict: "project_id, tiktok_video_id" });

                if (videoErr) {
                    console.error(`Error syncing TikTok videos:`, videoErr);
                } else {
                    innerRecordsSynced += videos.length;
                    if (!innerTablesSynced.includes("tiktok_videos")) {
                        innerTablesSynced.push("tiktok_videos");
                    }
                }
            }

            hasMore = videoResponse.data?.has_more || false;
            cursor = videoResponse.data?.cursor;

            if (innerRecordsSynced > 500) break; 
        }

        return {
            success: true,
            records_synced: innerRecordsSynced,
            tables_synced: innerTablesSynced
        };
    };

    try {
        try {
            return await performSync(currentAccessToken);
        } catch (err: any) {
            // Check if it's a token error
            const isTokenError = 
                err.message.includes("access_token_invalid") || 
                err.message.includes("Access token is invalid") ||
                err.message.includes("401");

            if (isTokenError && config.refresh_token && clientId && clientSecret) {
                console.log(`TikTok Access Token expired for connection ${connectionId}. Attempting refresh...`);
                
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
                        
                        // Update the connection config with the new token
                        const newConfig = {
                            ...config,
                            access_token: refreshData.access_token,
                            refresh_token: refreshData.refresh_token || config.refresh_token,
                        };

                        await adminClient
                            .from("client_db_connections")
                            .update({ sync_config: newConfig })
                            .eq("id", connectionId);

                        console.log(`TikTok token successfully refreshed for ${connectionId}. Retrying sync...`);
                        return await performSync(currentAccessToken);
                    }
                } else {
                    const errData = await refreshRes.json().catch(() => ({}));
                    console.error("TikTok token refresh failed:", errData);
                }
            }
            throw err; // Re-throw if not a token error or refresh failed
        }
    } catch (err: any) {
        return {
            success: false,
            records_synced: recordsSynced,
            tables_synced: tablesSynced,
            error: err.message
        };
    }
}
