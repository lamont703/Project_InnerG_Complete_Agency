
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { LinkedInClient } from "../supabase/functions/connector-sync/providers/linkedin/client.ts";
import { LinkedInTransformer } from "../supabase/functions/connector-sync/providers/linkedin/transformer.ts";
import "https://deno.land/x/dotenv@v3.2.2/load.ts";

/**
 * scripts/pull-linkedin-comments.ts
 * Manually trigger a comment sync for a project to verify database persistence.
 */
async function pullLinkedInComments() {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("NEXT_PUBLIC_SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const linkedinToken = Deno.env.get("LINKEDIN_ACCESS_TOKEN");
    const pageId = Deno.env.get("LINKEDIN_PAGE_ID");

    if (!supabaseUrl || !supabaseKey || !linkedinToken || !pageId) {
        console.error("❌ Missing environment variables:");
        if (!supabaseUrl) console.log("- SUPABASE_URL");
        if (!supabaseKey) console.log("- SUPABASE_SERVICE_ROLE_KEY (Ensure this is uncommented in .env.local)");
        if (!linkedinToken) console.log("- LINKEDIN_ACCESS_TOKEN");
        if (!pageId) console.log("- LINKEDIN_PAGE_ID");
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const client = new LinkedInClient(linkedinToken);
    const pageUrn = pageId.startsWith('urn:li:') ? pageId : `urn:li:organization:${pageId}`;

    console.log(`🚀 Starting manual comment sync for ${pageUrn}...`);

    try {
        // 1. Get the project and page from DB
        const { data: dbPage, error: pageError } = await supabase
            .from("linkedin_pages")
            .select("id, project_id, linkedin_page_id")
            .eq("linkedin_page_id", pageUrn)
            .single();

        if (pageError || !dbPage) {
            console.error("❌ Could not find page in database. Have you run a LinkedIn sync yet?", pageError?.message);
            return;
        }

        console.log(`✅ Found page in DB: ${dbPage.id} (Project: ${dbPage.project_id})`);

        // 2. Fetch recent posts from LinkedIn
        const posts = await client.listRecentPosts(pageUrn, 5);
        console.log(`Found ${posts.length} recent posts on LinkedIn.`);

        for (const post of posts) {
            console.log(`\nChecking post: ${post.id}`);
            
            // 3. Find/Upsert post in DB so we have a valid internal reference
            const internalPost = LinkedInTransformer.toInternalPost(dbPage.project_id, dbPage.id, post, {});
            const { data: dbPost, error: postError } = await supabase
                .from("linkedin_posts")
                .upsert(internalPost, { onConflict: "project_id, linkedin_post_id" })
                .select()
                .single();

            if (postError || !dbPost) {
                console.error(`  ❌ Error ensuring post in DB:`, postError?.message);
                continue;
            }

            // 4. Fetch and Sync Comments
            const comments = await client.getPostComments(post.id);
            console.log(`  Found ${comments.length} comments.`);

            for (const comment of comments) {
                const internalComment = LinkedInTransformer.toInternalComment(dbPage.project_id, dbPost.id, comment);
                const { error: commentError } = await supabase
                    .from("linkedin_comments")
                    .upsert(internalComment, { onConflict: "project_id, linkedin_comment_id" });

                if (commentError) {
                    console.error(`    ❌ Error saving comment ${comment.id}:`, commentError.message);
                } else {
                    console.log(`    ✅ Saved: "${comment.message.text.substring(0, 30)}..."`);
                }
            }
        }

        console.log("\n--- Verification ---");
        const { data: savedComments, error: verError } = await supabase
            .from("linkedin_comments")
            .select("content, actor_urn, created_at")
            .limit(5);

        if (verError) {
            console.error("Error verifying saved comments:", verError.message);
        } else {
            console.log(`Successfully verified ${savedComments.length} comments in the database:`);
            console.table(savedComments);
        }

        console.log("\n✅ Manual sync test complete!");

    } catch (err: any) {
        console.error("\n❌ Unexpected error:");
        console.error(err.message);
    }
}

pullLinkedInComments();
