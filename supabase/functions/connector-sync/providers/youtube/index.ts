/**
 * youtube/index.ts
 * YouTube Sync Provider Entry Point
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { YouTubeClient } from "./client.ts";
import { YouTubeTransformer } from "./transformer.ts";
import { SyncResult } from "../../service.ts";

export async function syncYouTube(
    adminClient: SupabaseClient,
    projectId: string,
    config: {
        access_token: string;
        refresh_token?: string;
    },
    googleClientId: string,
    googleClientSecret: string,
    connectionId?: string
): Promise<SyncResult> {
    const client = new YouTubeClient(config.access_token);
    let recordsSynced = 0;
    const tablesSynced: string[] = [];

    try {
        // Step 0: Try to refresh the token immediately if we have a refresh token
        // This ensures the sync doesn't fail due to a stale access token.
        if (config.refresh_token && googleClientId && googleClientSecret) {
            try {
                const newAccessToken = await client.refreshAccessToken(googleClientId, googleClientSecret, config.refresh_token);
                
                // Update the connection config in the background so future syncs start with the fresh token
                if (connectionId) {
                    await adminClient
                        .from("client_db_connections")
                        .update({ 
                            sync_config: { 
                                ...config, 
                                access_token: newAccessToken 
                            } 
                        })
                        .eq("id", connectionId);
                }
            } catch (refreshErr: any) {
                console.error("[YouTube Sync] Failed to refresh token, attempting with existing token:", refreshErr.message);
            }
        }

        // 1. Sync Channels
        const channels = await client.getMyChannels();

        if (channels.length === 0) {
            return {
                success: true,
                records_synced: 0,
                tables_synced: [],
                error: "No YouTube channels found for this account."
            };
        }

        for (const channel of channels) {
            const internalChannel = YouTubeTransformer.toInternalChannel(projectId, channel);
            
            const { data: dbChannel, error: channelError } = await adminClient
                .from("youtube_channels")
                .upsert(internalChannel, { onConflict: "project_id, channel_id" })
                .select()
                .single();

            if (channelError) throw channelError;
            recordsSynced++;
            if (!tablesSynced.includes("youtube_channels")) tablesSynced.push("youtube_channels");

            // 2. Sync Recent Videos for each channel
            const videos = await client.listRecentVideos(channel.id);
            for (const video of videos) {
                const internalVideo = YouTubeTransformer.toInternalVideo(projectId, dbChannel.id, video);
                await adminClient
                    .from("youtube_videos")
                    .upsert(internalVideo, { onConflict: "project_id, video_id" });
            }
            recordsSynced += videos.length;
            if (!tablesSynced.includes("youtube_videos")) tablesSynced.push("youtube_videos");
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
