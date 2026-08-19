#!/usr/bin/env node
/**
 * Publish one queued post immediately, by key.
 *
 *   node scripts/instagram/publish_now.js --key=top-rated-houston           # show it
 *   node scripts/instagram/publish_now.js --key=top-rated-houston --apply   # publish
 *
 * WHY NOT JUST RUN THE CRON. The cron takes the OLDEST due post, which is
 * correct for a schedule and wrong for "publish that specific one". Changing a
 * row's date to make the cron pick it is worse: it edits the schedule to work
 * around the tool, and leaves a post whose recorded date is not when it was
 * meant to run.
 *
 * IT PRINTS THE TAGS AND WAITS. Everything else in this pipeline can be undone
 * or edited; a tag notifies a real business and cannot be taken back. So the
 * dry run is the default and it shows exactly which accounts will be notified.
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const { publishToInstagram } = require("../../lib/instagram-publish.ts");
const { isExpired } = require("../../lib/instagram-token.ts");

const APPLY = process.argv.includes("--apply");
const KEY = (process.argv.find((a) => a.startsWith("--key=")) || "").split("=")[1];

(async () => {
  if (!KEY) return console.error("--key=<post_key> is required.");
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: conn } = await admin.from("instagram_connection").select("*").eq("id", 1).maybeSingle();
  if (!conn?.access_token) return console.error("No Instagram connection.");
  if (isExpired(conn.expires_at)) return console.error("Token expired — reconnect first.");

  const { data: post } = await admin.from("instagram_queue").select("*").eq("post_key", KEY).maybeSingle();
  if (!post) return console.error("No post with key " + KEY);
  if (post.status === "published") return console.error("Already published: " + post.permalink);
  if (post.status === "draft") return console.error("That post is a DRAFT. Promote it deliberately before publishing.");

  console.log((APPLY ? "PUBLISHING" : "DRY RUN") + " — " + post.title);
  console.log("  account   : @" + conn.username);
  console.log("  images    : " + post.image_urls.length);
  console.log("  WILL TAG  : " + (post.tag_handles.length ? post.tag_handles.map((h) => "@" + h).join(", ") : "nobody"));
  console.log("\n" + post.caption.split("\n").map((l) => "  " + l).join("\n"));

  if (!APPLY) return console.log("\nNothing published. Re-run with --apply.");

  const result = await publishToInstagram({
    igUserId: conn.ig_user_id,
    accessToken: conn.access_token,
    imageUrls: post.image_urls,
    caption: post.caption,
    tagHandles: post.tag_handles,
  });

  if (!result.ok) {
    await admin.from("instagram_queue").update({
      status: "failed", error: result.stage + ": " + result.error, updated_at: new Date().toISOString(),
    }).eq("id", post.id);
    return console.error("\nFAILED at " + result.stage + ": " + result.error);
  }

  await admin.from("instagram_queue").update({
    status: "published", instagram_media_id: result.mediaId, permalink: result.permalink || null,
    published_at: new Date().toISOString(), error: null, updated_at: new Date().toISOString(),
  }).eq("id", post.id);

  console.log("\nPUBLISHED. media id " + result.mediaId);
  console.log(result.permalink || "(no permalink returned)");
})();
