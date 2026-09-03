#!/usr/bin/env node
/**
 * Re-render an ALREADY QUEUED card and update its row in place.
 *
 * WHY THIS IS NOT "delete the row and re-queue". queue_entity_cards.js appends
 * to the back of the line by design — deleting and re-adding a card sitting at
 * position 6 would silently move it to position 30 and push it back eight days.
 * The copy is what changed, not the plan, so position and item_key are held and
 * only the rendered assets and the text columns are replaced.
 *
 * WHY IT WRITES TO A NEW STORAGE PATH rather than upserting over the old one.
 * The row's video_url is fetched by YouTube and Instagram at PUBLISH time, not
 * now. Overwriting the same public path leaves a window where a CDN edge still
 * holds the previous bytes, and the failure would be invisible: the row says
 * fixed, the platform pulls stale. A new path cannot be stale.
 *
 * IT NEVER PUBLISHES, and it never touches a row whose status is not `queued` —
 * a published video has already been fetched by two platforms and re-cutting it
 * here would change nothing there while making the queue disagree with reality.
 *
 * Usage:
 *   node scripts/shorts/recut_card.js --dry-run <item_key>...
 *   node scripts/shorts/recut_card.js <item_key>...
 */
require("dotenv").config({ path: ".env.local", override: true });
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");
const ffmpeg = require("@ffmpeg-installer/ffmpeg").path;

const ROOT = path.join(__dirname, "..", "..");
const OUT_DIR = path.join(ROOT, "reference", "Podcast Visuals", "Shorts");
const DRY = process.argv.includes("--dry-run");
const KEYS = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const SOURCES = ["./entity-cards", "./licence-cards", "./curated-source", "./derived-source"];
const safe = (k) => k.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
const stamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, "");

/** Every card the generators can currently produce, keyed for lookup. */
async function allCards() {
  const out = new Map();
  for (const mod of SOURCES) {
    let cards = [];
    try { cards = await require(mod).build(); } catch (e) { console.log(`  ${mod}: ${e.message}`); }
    for (const c of cards) out.set(c.key, c);
  }
  return out;
}

async function main() {
  if (!KEYS.length) { console.error("Pass at least one item_key."); process.exit(1); }
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const cards = await allCards();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "recut-"));

  for (const key of KEYS) {
    const c = cards.get(key);
    if (!c) { console.log(`  ${key}: no generator produces this card — skipped`); continue; }

    const { data: row, error } = await s.from("publisher_queue")
      .select("id,item_key,status,position,title,label").eq("item_key", key).single();
    if (error || !row) { console.log(`  ${key}: no queue row — skipped`); continue; }
    if (row.status !== "queued") { console.log(`  ${key}: status is "${row.status}", not "queued" — refusing`); continue; }

    const title = (c.seoTitle || `${c.stat} — ${c.label}`).slice(0, 100);
    console.log(`  ${key}  pos ${row.position}`);
    console.log(`      was: ${row.title}`);
    console.log(`      now: ${title}`);
    if (DRY) continue;

    // Render fresh. The old MP4 is left on disk under its own name.
    const video = path.join(OUT_DIR, `${safe(key)}-${stamp()}.mp4`);
    const args = [path.join(ROOT, "scripts", "render_short_video.js"), "--name", `${safe(key)}-${stamp()}`,
      "--seconds", "9", "--audio", path.join(OUT_DIR, "_bed-9s.m4a")];
    for (const f of ["chip", "date", "stat", "label", "punch", "source", "question", "tone"]) {
      if (c[f]) args.push(`--${f}`, String(c[f]));
    }
    execFileSync("node", args, { stdio: ["ignore", "ignore", "pipe"], cwd: ROOT });

    const vPath = `shorts/${safe(key)}-${stamp()}.mp4`;
    const vUp = await s.storage.from("social-assets").upload(vPath, fs.readFileSync(video), { contentType: "video/mp4", upsert: true });
    if (vUp.error) { console.log(`      video upload failed: ${vUp.error.message}`); continue; }
    const videoUrl = s.storage.from("social-assets").getPublicUrl(vPath).data.publicUrl;

    const jpg = path.join(tmp, "c.jpg");
    execFileSync(ffmpeg, ["-y", "-ss", "7.65", "-i", video, "-frames:v", "1", "-q:v", "3", jpg], { stdio: ["ignore", "ignore", "pipe"] });
    const cPath = `instagram/cover-${safe(key)}-${stamp()}.jpg`;
    const tUp = await s.storage.from("entity-photos").upload(cPath, fs.readFileSync(jpg), { contentType: "image/jpeg", upsert: true });
    const thumbUrl = tUp.error ? null : s.storage.from("entity-photos").getPublicUrl(cPath).data.publicUrl;

    const upd = await s.from("publisher_queue").update({
      title, stat: String(c.stat), label: c.label, question: c.question,
      video_url: videoUrl, ...(thumbUrl ? { thumbnail_url: thumbUrl } : {}),
      caption: `${c.stat} ${c.label}\n\n${c.punch}\n\n${c.question}\n\n${c.source}`,
      updated_at: new Date().toISOString(),
    }).eq("id", row.id);
    console.log(upd.error ? `      update failed: ${upd.error.message}` : `      updated in place`);
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\n  ${DRY ? "Dry run — nothing rendered or written." : "Done."}\n`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
