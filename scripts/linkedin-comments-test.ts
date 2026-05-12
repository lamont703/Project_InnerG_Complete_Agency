
import { LinkedInClient } from "../supabase/functions/connector-sync/providers/linkedin/client.ts";
import "https://deno.land/x/dotenv@v3.2.2/load.ts";

/**
 * scripts/linkedin-comments-test.ts
 * Diagnostic for LinkedIn Comments API.
 */
async function testLinkedInComments() {
    const accessToken = Deno.env.get("LINKEDIN_ACCESS_TOKEN");
    const pageId = Deno.env.get("LINKEDIN_PAGE_ID");

    if (!accessToken || !pageId) {
        console.error("❌ LINKEDIN_ACCESS_TOKEN or LINKEDIN_PAGE_ID missing in .env.local");
        return;
    }

    console.log(`🚀 Testing LinkedIn Comments retrieval for Page: ${pageId}...`);

    const client = new LinkedInClient(accessToken);
    const pageUrn = pageId.startsWith('urn:li:') ? pageId : `urn:li:organization:${pageId}`;

    try {
        // 1. Fetch Recent Posts to find something to check comments for
        console.log("\n--- Fetching Recent Posts ---");
        const posts = await client.listRecentPosts(pageUrn, 3);
        
        if (posts.length === 0) {
            console.log("No recent posts found to check for comments.");
            return;
        }

        for (const post of posts) {
            console.log(`\nPost ID: ${post.id}`);
            const text = post.commentary || post.specificContent?.["com.linkedin.ugc.ShareContent"]?.shareCommentary?.text || "No text content";
            console.log(`Content Preview: ${text.substring(0, 50)}...`);

            // 2. Fetch Comments
            console.log("Fetching comments...");
            const comments = await client.getPostComments(post.id);
            
            console.log(`Found ${comments.length} comments.`);
            
            for (const comment of comments) {
                console.log(`  - [${comment.actor}] says: "${comment.message.text}"`);
                console.log(`    Full ID/Obj: ${JSON.stringify(comment)}`);
            }
        }

        console.log("\n✅ Test completed successfully!");

    } catch (err: any) {
        console.error("\n❌ Comment Test Failed:");
        console.error(err.message);
    }
}

testLinkedInComments();
