#!/usr/bin/env node
/**
 * Renders the shop/salon cards and loads them onto the END of the publisher
 * queue.
 *
 * BACK OF THE LINE, ALWAYS. Position is taken from the current maximum and
 * counted up, so nothing already scheduled is displaced. Inserting in the
 * middle would silently reorder somebody else's plan.
 *
 * SKIPS WHAT IS ALREADY THERE, keyed on item_key, so re-running adds only what
 * is new rather than duplicating the batch.
 *
 * IT RENDERS, UPLOADS, THUMBNAILS AND QUEUES — but never publishes. The
 * irreversible step stays in the cron, as everywhere else in this pipeline.
 *
 * Usage:
 *   node scripts/shorts/queue_entity_cards.js --dry-run
 *   node scripts/shorts/queue_entity_cards.js
 *   node scripts/shorts/queue_entity_cards.js --source licence
 */
require("dotenv").config({ path: ".env.local", override: true });
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");
const ffmpeg = require("@ffmpeg-installer/ffmpeg").path;
/**
 * WHICH CARD MODULE TO LOAD, chosen by flag. The render/upload/queue mechanics
 * are identical for every source — only where the figures come from differs —
 * so a second copy of this file would be a second place to fix the next bug.
 */
const SOURCES = {
  entity: "./entity-cards",
  licence: "./licence-cards",
  curated: "./curated-source",
  derived: "./derived-source",
};
const which = (() => {
  const i = process.argv.indexOf("--source");
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : "entity";
})();
if (!SOURCES[which]) { console.error(`Unknown --source "${which}". One of: ${Object.keys(SOURCES).join(", ")}`); process.exit(1); }
const { build } = require(SOURCES[which]);

const ROOT = path.join(__dirname, "..", "..");
const OUT_DIR = path.join(ROOT, "reference", "Podcast Visuals", "Shorts");
const DRY = process.argv.includes("--dry-run");

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const safe = (k) => k.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

/** Same ceilings the renderer's frame can hold. Refuse rather than overflow. */
const LIMITS = { stat: 12, label: 92, punch: 74, question: 58, source: 62 };

function check(c) {
  for (const [f, max] of Object.entries(LIMITS)) {
    if (c[f] && String(c[f]).length > max) {
      throw new Error(`${c.key}: "${f}" is ${String(c[f]).length} chars, over ${max}`);
    }
  }
  for (const f of ["stat", "label", "punch", "source", "question"]) {
    if (!c[f]) throw new Error(`${c.key}: missing ${f}`);
  }
}

async function main() {
  const s = db();
  const cards = await build();
  cards.forEach(check);

  const { data: existing, error } = await s.from("publisher_queue").select("item_key, position");
  if (error) { console.error(error.message); process.exit(1); }
  const have = new Set((existing || []).map((r) => r.item_key));
  let position = Math.max(0, ...(existing || []).map((r) => Number(r.position) || 0));

  const todo = cards.filter((c) => !have.has(c.key));
  console.log(`\n  ${cards.length} cards · ${todo.length} new · appending after position ${position}\n`);
  if (!todo.length) { console.log("  Nothing to add.\n"); return; }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "entity-cards-"));

  for (const c of todo) {
    position += 1;
    console.log(`  ${String(position).padStart(3)}  ${c.key.padEnd(24)} ${String(c.stat).padEnd(9)} ${c.label.slice(0, 44)}`);
    if (DRY) continue;

    const video = path.join(OUT_DIR, `${c.key}.mp4`);
    if (!fs.existsSync(video)) {
      const args = [path.join(ROOT, "scripts", "render_short_video.js"), "--name", c.key, "--seconds", "9",
        "--audio", path.join(OUT_DIR, "_bed-9s.m4a")];
      for (const f of ["chip", "date", "stat", "label", "punch", "source", "question", "tone"]) {
        if (c[f]) args.push(`--${f}`, String(c[f]));
      }
      execFileSync("node", args, { stdio: ["ignore", "ignore", "pipe"], cwd: ROOT });
    }

    const vUp = await s.storage.from("social-assets").upload(`shorts/${safe(c.key)}.mp4`, fs.readFileSync(video), { contentType: "video/mp4", upsert: true });
    if (vUp.error) { console.log(`       video upload failed: ${vUp.error.message}`); continue; }
    const videoUrl = s.storage.from("social-assets").getPublicUrl(`shorts/${safe(c.key)}.mp4`).data.publicUrl;

    // Cover from 85% in — the fully revealed card. See make_thumbnails.js.
    const jpg = path.join(tmp, "c.jpg");
    execFileSync(ffmpeg, ["-y", "-ss", "7.65", "-i", video, "-frames:v", "1", "-q:v", "3", jpg], { stdio: ["ignore", "ignore", "pipe"] });
    const tUp = await s.storage.from("entity-photos").upload(`instagram/cover-${safe(c.key)}.jpg`, fs.readFileSync(jpg), { contentType: "image/jpeg", upsert: true });
    const thumbUrl = tUp.error ? null : s.storage.from("entity-photos").getPublicUrl(`instagram/cover-${safe(c.key)}.jpg`).data.publicUrl;

    const ins = await s.from("publisher_queue").insert({
      item_key: c.key,
      title: (c.seoTitle || `${c.stat} — ${c.label}`).slice(0, 100),
      stat: String(c.stat), label: c.label, question: c.question,
      video_url: videoUrl, thumbnail_url: thumbUrl, duration_secs: 9,
      caption: `${c.stat} ${c.label}\n\n${c.punch}\n\n${c.question}\n\n${c.source}`,
      position, status: "queued",
    });
    if (ins.error) { console.log(`       queue insert failed: ${ins.error.message}`); continue; }
    console.log(`       queued`);
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\n  ${DRY ? "Dry run — nothing rendered or queued." : "Done. /admin/content-publisher"}\n`);
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
