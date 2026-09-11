#!/usr/bin/env node
/**
 * Post an already-published row to YouTube, when only YouTube failed.
 *
 *   node --experimental-strip-types --import ./scripts/_alias-loader.mjs \
 *     scripts/retry_youtube.mjs --key=<item_key> [--dry]
 *
 * WHY THIS EXISTS. The publisher sends to six destinations and records each
 * outcome separately, precisely because they fail independently — a row can be
 * live on Instagram and Google Business while YouTube got nothing. Re-running
 * the whole slot to fix one platform would DOUBLE-POST the five that worked,
 * so the recovery has to be per-platform. That is the whole reason `results`
 * is a jsonb map instead of a single status.
 *
 * THE FAILURE THIS WAS WRITTEN FOR is `could not fetch video: HTTP 429`. The
 * cron downloads the MP4 once and hands the bytes to YouTube; Instagram and
 * Google are given the URL and fetch it themselves. So a rate limit on OUR
 * storage takes out YouTube alone and leaves the others untouched. It is
 * transient, and nothing retries it on its own.
 *
 * IT REFUSES IF youtube_id IS ALREADY SET. That is the guard against turning a
 * missing post into a duplicate one, which is worse and cannot be undone
 * quietly.
 *
 * It does not touch instagram_*, published_at, position or status. The row was
 * already published; this fills in the hole.
 */
/*
 * .env.local EXPLICITLY, and NOT `import "dotenv/config"`. That import loads
 * plain `.env`, which here holds an older Supabase key, and dotenv does not
 * override a variable that is already set — so the stale key wins and every
 * query fails with "Legacy API keys are disabled", which looks like a Supabase
 * account problem rather than a file-precedence one.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { publishToYouTube } from "@/lib/youtube-publish";

const arg = (n, d) => {
  const m = process.argv.find((a) => a.startsWith(`--${n}=`));
  return m ? m.split("=").slice(1).join("=") : d;
};
const KEY = arg("key");
const DRY = process.argv.includes("--dry");

if (!KEY) {
  console.error("--key=<item_key> is required");
  process.exit(1);
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: row, error } = await db
  .from("publisher_queue")
  .select("*")
  .eq("item_key", KEY)
  .single();
if (error) { console.error(`could not read the row: ${error.message}`); process.exit(1); }

console.log(`  ${row.item_key}`);
console.log(`  title      ${String(row.title).slice(0, 80)}`);
console.log(`  status     ${row.status}`);
console.log(`  youtube    ${row.youtube_id ?? "none"}`);
console.log(`  instagram  ${row.instagram_media_id ?? "none"}`);
console.log(`  prior      ${JSON.stringify(row.results?.youtube ?? {})}`);

if (row.youtube_id) {
  console.error(`\nrefusing: this row already has youtube_id ${row.youtube_id}.`);
  console.error("Posting again would duplicate the Short, which cannot be undone quietly.");
  process.exit(1);
}
if (!row.video_url) { console.error("\nrefusing: the row has no video_url"); process.exit(1); }

process.stdout.write("\n  fetching the video ... ");
const res = await fetch(row.video_url);
if (!res.ok) { console.error(`failed HTTP ${res.status} — the storage rate limit may still be on`); process.exit(1); }
const bytes = Buffer.from(await res.arrayBuffer());
console.log(`${(bytes.length / 1e6).toFixed(1)}MB, HTTP ${res.status}`);

if (DRY) {
  console.log("\n--dry: video fetched fine, nothing uploaded.");
  process.exit(0);
}

process.stdout.write("  uploading to YouTube ... ");
const yt = await publishToYouTube(row, bytes);
if (!yt.ok) { console.error(`\nfailed: ${yt.error}`); process.exit(1); }
const url = `https://youtube.com/shorts/${yt.id}`;
console.log(`${yt.id}`);

/* Merge, never replace — the other five outcomes stay exactly as they were. */
const results = { ...(row.results ?? {}), youtube: { ok: true, id: yt.id, url } };
const { error: upErr } = await db
  .from("publisher_queue")
  .update({
    youtube_id: yt.id,
    youtube_published_at: new Date().toISOString(),
    youtube_error: null,
    results,
    updated_at: new Date().toISOString(),
  })
  .eq("id", row.id);
if (upErr) {
  console.error(`\nthe Short is live at ${url} but the row did not update: ${upErr.message}`);
  console.error("Record youtube_id by hand so a later retry does not post it twice.");
  process.exit(1);
}

console.log(`\n  live: ${url}`);
