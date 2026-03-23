/**
 * twitter/index.ts
 * X (Twitter) Sync Provider Entry Point
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TwitterProvider } from "../../../_shared/lib/providers/twitter.ts";
import { TwitterTransformer } from "./transformer.ts";
import { SyncResult } from "../../service.ts";

export async function syncTwitter(
    adminClient: SupabaseClient,
    projectId: string,
    config: {
        access_token: string;
        refresh_token?: string;
        twitter_user_id?: string;
    },
    connectionId: string
): Promise<SyncResult> {
    if (!config.access_token) {
        return { success: false, records_synced: 0, tables_synced: [], error: "Missing X (Twitter) Access Token" };
    }

    const provider = new TwitterProvider();
    let currentAccessToken = config.access_token;
    let finalRecordsSynced = 0;
    const finalTablesSynced: string[] = [];

    console.log(`[TwitterSync] Starting sync for project ${projectId}, connection ${connectionId}`);

    const performSync = async (token: string): Promise<SyncResult> => {
        let innerRecordsSynced = 0;
        const innerTablesSynced: string[] = [];

        // 1. Sync User Profile
        console.log(`[TwitterSync] Fetching user profile...`);
        const user = await provider.getUserMe(token);

        if (user) {
            console.log(`[TwitterSync] Found user: ${user.username} (${user.id}). Upserting account...`);
            const internalAccount = TwitterTransformer.toInternalAccount(projectId, user);
            const { error: accountErr } = await adminClient
                .from("twitter_accounts")
                .upsert(internalAccount, { onConflict: "project_id, twitter_user_id" });

            if (accountErr) {
                console.error(`[TwitterSync] Error upserting Twitter account:`, JSON.stringify(accountErr));
            } else {
                innerRecordsSynced++;
                innerTablesSynced.push("twitter_accounts");
                console.log(`[TwitterSync] Account upserted successfully.`);
            }

            // 2. Sync Recent Tweets
            console.log(`[TwitterSync] Fetching recent tweets...`);
            const tweetResponse = await provider.listUserTweets(user.id, token, 10);
            const tweets = tweetResponse.data || [];

            if (tweets.length > 0) {
                console.log(`[TwitterSync] Found ${tweets.length} tweets. Upserting...`);
                const internalTweets = tweets.map((t: any) => TwitterTransformer.toInternalTweet(projectId, t));
                const { error: tweetErr } = await adminClient
                    .from("twitter_tweets")
                    .upsert(internalTweets, { onConflict: "project_id, tweet_id" });

                if (tweetErr) {
                    console.error(`[TwitterSync] Error upserting Twitter tweets:`, JSON.stringify(tweetErr));
                } else {
                    innerRecordsSynced += tweets.length;
                    innerTablesSynced.push("twitter_tweets");
                    console.log(`[TwitterSync] ${tweets.length} tweets upserted.`);
                }
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
            return await performSync(currentAccessToken);
        } catch (err: any) {
            console.warn(`[TwitterSync] Sync attempt failed: ${err.message}`);
            
            // Check if it's a 401/token error and try refresh
            if ((err.message.includes("401") || err.message.includes("token")) && config.refresh_token) {
                console.log(`[TwitterSync] Access Token presumably expired. Attempting refresh...`);
                
                try {
                    const refreshData = await provider.refreshToken(config.refresh_token);
                    if (refreshData.access_token) {
                        currentAccessToken = refreshData.access_token;
                        
                        console.log(`[TwitterSync] Token refresh successful. Updating database...`);
                        
                        // Update the connection config with new tokens
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
                            console.error(`[TwitterSync] Failed to update connection with refreshed token:`, JSON.stringify(updateErr));
                        } else {
                            console.log(`[TwitterSync] Connection config updated. Retrying sync...`);
                            return await performSync(currentAccessToken);
                        }
                    }
                } catch (refreshErr: any) {
                    console.error(`[TwitterSync] Token refresh failed: ${refreshErr.message}`);
                    throw refreshErr;
                }
            }
            throw err;
        }
    } catch (err: any) {
        console.error(`[TwitterSync] Fatal error: ${err.message}`);
        return {
            success: false,
            records_synced: 0,
            tables_synced: [],
            error: err.message
        };
    }
}
