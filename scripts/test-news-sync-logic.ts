
import "https://deno.land/x/dotenv@v3.2.2/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { syncNews } from "../supabase/functions/connector-sync/providers/newsapi/index.ts";

/**
 * scripts/test-news-sync-logic.ts
 * Tests the formal sync provider logic for NewsAPI.
 */
async function testNewsSyncLogic() {
    const apiKey = Deno.env.get("NEWS_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!apiKey || !supabaseUrl || !supabaseKey) {
        console.error("❌ Missing required env vars (NEWS_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
        return;
    }

    const adminClient = createClient(supabaseUrl, supabaseKey);
    
    // 1. Get a project ID to use for testing
    const { data: projects } = await adminClient.from("projects").select("id").limit(1);
    if (!projects || projects.length === 0) {
        console.error("❌ No projects found in database to test with.");
        return;
    }
    const projectId = projects[0].id;

    console.log(`🚀 Testing Lean News Sync for Project: ${projectId}`);

    // 2. Execute Sync Logic
    const result = await syncNews(adminClient, projectId, { apiKey });

    if (result.success) {
        console.log("\n✅ News Sync Execution Successful!");
        console.log(`📊 Records Synced: ${result.records_synced}`);
        console.log(`🗂 Tables Updated: ${result.tables_synced.join(", ")}`);

        // 3. Verify in DB
        const { data: count } = await adminClient
            .from("news_intelligence")
            .select("id, bucket, title")
            .eq("project_id", projectId)
            .limit(10);

        console.log("\n--- Sample Articles in DB ---");
        count?.forEach((a, i) => console.log(`${i+1}. [${a.bucket}] ${a.title}`));

    } else {
        console.error("\n❌ News Sync Failed:");
        console.error(result.error);
    }
}

testNewsSyncLogic();
