#!/usr/bin/env node
/**
 * Renders every unqueued card, uploads it, and schedules it one per day.
 *
 * REPLACES THE SHELL REMINDER. A nudge only fires when a terminal happens to be
 * open; a queue with dates on it is visible whether anyone looks or not, and
 * the publisher can run from anywhere.
 *
 * IT SCHEDULES, IT DOES NOT PUBLISH. Rows land as 'queued' with a date.
 * publish_due.js is what actually uploads, and only for dates that have
 * arrived — the irreversible step stays separate, same as everywhere else here.
 *
 * ALREADY-PUBLISHED CARDS ARE SKIPPED using _published.json, so the one Short
 * already live does not get queued a second time.
 *
 * RENDERING IS THE SLOW PART — roughly 80 seconds a card. Nine cards is about
 * twelve minutes. That is why this is a batch you run when you add cards, not
 * something on a schedule.
 *
 * Usage:
 *   node scripts/shorts/queue_shorts.js --dry-run
 *   node scripts/shorts/queue_shorts.js
 *   node scripts/shorts/queue_shorts.js --start 2026-08-18
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env.local") });
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");
const { buildCard, buildSeo, listKeys } = require("./card-sources");

const ROOT = path.join(__dirname, "..", "..");
const OUT_DIR = path.join(ROOT, "reference", "Podcast Visuals", "Shorts");
const PUBLISHED = path.join(OUT_DIR, "_published.json");
const BUCKET = "social-assets";

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry-run");
const arg = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : null; };

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/** Tomorrow in Central, unless told otherwise. Never today — today may be done. */
function defaultStart() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

async function main() {
  const s = db();
  const start = arg("start") || defaultStart();

  const alreadyPublished = (() => { try { return JSON.parse(fs.readFileSync(PUBLISHED, "utf8")); } catch { return {}; } })();
  const { data: existing, error } = await s.from("shorts_queue").select("card_key, scheduled_for, status");
  if (error) { console.error(`Cannot read queue: ${error.message}`); process.exit(1); }
  const queued = new Set((existing || []).map((r) => r.card_key));

  const todo = listKeys().filter((k) => !queued.has(k) && !alreadyPublished[k]);

  if (!todo.length) {
    console.log(`\n  Nothing to queue — every card is already scheduled or published.\n`);
    return;
  }

  /**
   * Start after the last scheduled date if the queue already has entries, so a
   * second run extends the schedule rather than stacking two Shorts on one day.
   */
  const lastDate = (existing || []).filter((r) => r.status === "queued").map((r) => r.scheduled_for).sort().pop();
  let cursor = lastDate ? addDays(lastDate, 1) : start;
  if (cursor < start) cursor = start;

  console.log(`\n  ${todo.length} card(s) to queue, one per day from ${cursor}\n`);

  for (const key of todo) {
    const card = await buildCard(key);
    const seo = buildSeo(card);
    console.log(`  ${cursor}  ${key}`);
    console.log(`              ${card.stat}  ${card.label.slice(0, 58)}`);

    if (!DRY) {
      const safe = key.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      const video = path.join(OUT_DIR, `${key}.mp4`);

      if (!fs.existsSync(video)) {
        execFileSync("node", [path.join(__dirname, "make_short.js"), "--key", key, "--seconds", "9"], { stdio: "inherit", cwd: ROOT });
      }

      const bytes = fs.readFileSync(video);
      const objectPath = `shorts/${safe}.mp4`;
      const up = await s.storage.from(BUCKET).upload(objectPath, bytes, { contentType: "video/mp4", upsert: true });
      if (up.error) { console.error(`    upload failed: ${up.error.message}`); continue; }
      const { data: pub } = s.storage.from(BUCKET).getPublicUrl(objectPath);

      const ins = await s.from("shorts_queue").insert({
        card_key: key,
        title: seo.title,
        stat: card.stat,
        label: card.label,
        question: card.question,
        video_url: pub.publicUrl,
        duration_secs: 9,
        scheduled_for: cursor,
        status: "queued",
      });
      if (ins.error) { console.error(`    queue insert failed: ${ins.error.message}`); continue; }
      console.log(`              queued`);
    }

    cursor = addDays(cursor, 1);
  }

  console.log(`\n  ${DRY ? "Dry run — nothing rendered, uploaded or queued." : "Done. View at /admin/shorts-queue"}\n`);
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
