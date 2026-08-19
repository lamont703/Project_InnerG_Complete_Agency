#!/usr/bin/env node
/**
 * Put hashtags on every post: into the caption where we still can, and as a
 * first comment where we cannot.
 *
 *   node scripts/instagram/add_hashtags.js            # dry run
 *   node scripts/instagram/add_hashtags.js --apply
 *
 * PUBLISHED CAPTIONS ARE IMMUTABLE. POST /{ig-media-id} with a caption returns
 * {"success":true} and changes nothing - the endpoint exists for
 * comment_enabled and silently ignores the caption. Verified against a live
 * post rather than assumed, because a 200 that does nothing is the worst kind
 * of API response.
 *
 * SO A LIVE POST GETS A FIRST COMMENT INSTEAD. That is the standard workaround
 * and it is genuinely second best - a caption tag and a comment tag are not
 * obviously equivalent for discovery, and nobody outside Meta can say by how
 * much. Worth doing for two posts already out; not worth relying on, which is
 * why every future post gets its tags in the caption before it publishes.
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const { captionWithHashtags, hashtagsFor } = require("../../lib/instagram-hashtags.ts");

const APPLY = process.argv.includes("--apply");
const IG = "https://graph.instagram.com";

(async () => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: conn } = await admin.from("instagram_connection").select("*").eq("id", 1).maybeSingle();
  const { data: posts } = await admin.from("instagram_queue").select("*").order("scheduled_for");

  const unpublished = posts.filter((p) => p.status === "queued" || p.status === "draft");
  const published = posts.filter((p) => p.status === "published" && p.instagram_media_id);

  console.log(`${APPLY ? "APPLY" : "DRY RUN"}\n`);
  console.log(`caption edits (still unpublished): ${unpublished.length}`);
  for (const p of unpublished) {
    const tags = hashtagsFor(p.concept);
    console.log(`  ${p.post_key.slice(0, 34).padEnd(36)} ${p.concept || "-"}  ${tags.length} tags`);
  }
  console.log(`\nfirst comments (already live): ${published.length}`);
  for (const p of published) {
    console.log(`  ${p.post_key.slice(0, 34).padEnd(36)} ${p.permalink}`);
  }

  if (!APPLY) return console.log("\nNothing written. Re-run with --apply.");

  let edited = 0;
  for (const p of unpublished) {
    const next = captionWithHashtags(p.caption, p.concept);
    if (next === p.caption) continue;
    const { error } = await admin.from("instagram_queue")
      .update({ caption: next, updated_at: new Date().toISOString() }).eq("id", p.id);
    if (error) console.error(`  ${p.post_key}: ${error.message}`);
    else edited++;
  }
  console.log(`\ncaptions updated: ${edited}`);

  for (const p of published) {
    const already = (p.caption.match(/#\w+/g) || []).length > 0;
    if (already) { console.log(`  ${p.post_key}: caption already has tags, skipped`); continue; }
    const message = hashtagsFor(p.concept).join(" ");
    const res = await fetch(`${IG}/${p.instagram_media_id}/comments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, access_token: conn.access_token }),
    });
    const j = await res.json().catch(() => ({}));
    console.log(`  ${p.post_key}: ${j.id ? "commented " + j.id : "FAILED " + (j.error?.message || res.status)}`);
  }
})();
