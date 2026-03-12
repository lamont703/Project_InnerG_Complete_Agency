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
    }
): Promise<SyncResult> {
    if (!config.access_token) {
        return { success: false, records_synced: 0, tables_synced: [], error: "Missing TikTok Access Token" };
    }

    const client = new TikTokClient(config.access_token);
    let recordsSynced = 0;
    const tablesSynced: string[] = [];

    try {
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
                recordsSynced++;
                tablesSynced.push("tiktok_accounts");
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
                    recordsSynced += videos.length;
                    if (!tablesSynced.includes("tiktok_videos")) {
                        tablesSynced.push("tiktok_videos");
                    }
                }
            }

            hasMore = videoResponse.data?.has_more || false;
            cursor = videoResponse.data?.cursor;

            // Safety break to prevent infinite loops (TikTok max count is usually high)
            if (recordsSynced > 500) break; 
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
