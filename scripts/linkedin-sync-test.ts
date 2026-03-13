
import { LinkedInClient } from "../supabase/functions/connector-sync/providers/linkedin/client.ts";
import { LinkedInTransformer } from "../supabase/functions/connector-sync/providers/linkedin/transformer.ts";
import "https://deno.land/x/dotenv@v3.2.2/load.ts";

/**
 * scripts/linkedin-sync-test.ts
 * Cloud-First diagnostic for LinkedIn API integration.
 */
async function testLinkedInIntegration() {
    const accessToken = Deno.env.get("LINKEDIN_ACCESS_TOKEN");
    const pageId = Deno.env.get("LINKEDIN_PAGE_ID");

    if (!accessToken || !pageId) {
        console.error("❌ LINKEDIN_ACCESS_TOKEN or LINKEDIN_PAGE_ID missing in .env.local");
        return;
    }

    console.log(`🚀 Testing LinkedIn integration for Page: ${pageId}...`);

    const client = new LinkedInClient(accessToken);

    try {
        // 1. Fetch Page Details
        console.log("\n--- Page Details ---");
        const pageData = await client.getPage(pageId);
        console.log(`Name: ${pageData.localizedName}`);
        console.log(`URN: ${pageData.id}`);

        // 2. Fetch Metrics
        console.log("\n--- Page Metrics ---");
        const metrics = await client.getPageMetrics(pageData.id);
        console.log(`Followers: ${metrics.follower_count}`);
        console.log(`Views: ${metrics.view_count}`);
        console.log(`Clicks: ${metrics.click_count}`);

        // 3. Fetch Recent Posts & Stats
        console.log("\n--- Recent Posts & Stats ---");
        const posts = await client.listRecentPosts(pageData.id, 5);
        console.log(`Found ${posts.length} recent posts.`);

        const postUrns = posts.map(p => p.id);
        const postStats = await client.getPostStatistics(pageData.id, postUrns);

        for (const post of posts) {
            const stats = postStats[post.id];
            const internal = LinkedInTransformer.toInternalPost("test-project", "test-page", post, stats);
            
            console.log(`\nPost ID: ${post.id}`);
            console.log(`Published At: ${internal.published_at}`);
            console.log(`Content: ${internal.content?.substring(0, 100)}...`);
            console.log(`Engagement: ${internal.like_count} Likes, ${internal.comment_count} Comments, ${internal.view_count} Views`);
        }

        console.log("\n✅ Test completed successfully!");

    } catch (err: any) {
        console.error("\n❌ Integration Test Failed:");
        console.error(err.message);
    }
}

testLinkedInIntegration();
