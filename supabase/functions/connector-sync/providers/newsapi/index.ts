
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { NewsAPIClient } from "./client.ts";
import { NewsAPITransformer } from "./transformer.ts";
import { NewsBucketCategory } from "./types.ts";

export interface NewsSyncConfig {
    apiKey: string;
}

/**
 * syncNews
 * Orchestrates the "Lean Intelligence" news sync.
 */
export async function syncNews(
    adminClient: SupabaseClient,
    projectId: string,
    config: NewsSyncConfig
) {
    console.log(`[NewsSync] Starting lean sync for project: ${projectId}`);
    
    const client = new NewsAPIClient(config.apiKey);
    let recordsSynced = 0;
    const tablesSynced: string[] = [];

    const engagementMatrix = [
        {
            bucket: 'big_tech_rivalry' as NewsBucketCategory,
            query: '"OpenAI" OR "Google Gemini" OR "Anthropic" OR "Microsoft AI"'
        },
        {
            bucket: 'future_of_work' as NewsBucketCategory,
            query: 'AI AND (Enterprise OR Productivity OR Workforce OR Automation)'
        },
        {
            bucket: 'ethics_regulation' as NewsBucketCategory,
            query: 'AI AND (Ethics OR Regulation OR Policy OR Bias OR Copyright)'
        },
        {
            bucket: 'institutional_web3' as NewsBucketCategory,
            query: 'Blockchain AND (Institutional OR "Real World Assets" OR Finance)'
        },
        {
            bucket: 'general_tech' as NewsBucketCategory,
            query: '', // We'll use getTopHeadlines for this
            isTopHeadlines: true
        }
    ];

    try {
        for (const strategy of engagementMatrix) {
            console.log(`[NewsSync] Fetching articles for bucket: ${strategy.bucket}`);
            
            let articles = [];
            if (strategy.isTopHeadlines) {
                articles = await client.getTopHeadlines('technology');
            } else {
                articles = await client.searchEverything(strategy.query, 5);
            }

            // Sync top 5 to database
            const topArticles = articles.slice(0, 5);
            console.log(`[NewsSync] Found ${topArticles.length} articles for ${strategy.bucket}`);

            for (const article of topArticles) {
                const internal = NewsAPITransformer.toInternalArticle(projectId, strategy.bucket, article);
                
                const { error } = await adminClient
                    .from("news_intelligence")
                    .upsert(internal, { onConflict: "project_id, url" });

                if (error) {
                    // Unique constraint violation is expected if we already have the article
                    if (error.code !== "23505") {
                        console.error(`[NewsSync] Error upserting article: ${error.message}`);
                    }
                } else {
                    recordsSynced++;
                }
            }
        }

        if (recordsSynced > 0) {
            tablesSynced.push("news_intelligence");
        }

        // Cleanup old news (older than 7 days) if not processed
        const { error: cleanupErr } = await adminClient.rpc("cleanup_old_news_intelligence");
        if (cleanupErr) {
            console.error(`[NewsSync] Cleanup failed: ${cleanupErr.message}`);
        }

        return {
            success: true,
            records_synced: recordsSynced,
            tables_synced: tablesSynced
        };

    } catch (err: any) {
        console.error(`[NewsSync] Fatal error: ${err.message}`);
        return {
            success: false,
            records_synced: recordsSynced,
            tables_synced: tablesSynced,
            error: err.message
        };
    }
}
