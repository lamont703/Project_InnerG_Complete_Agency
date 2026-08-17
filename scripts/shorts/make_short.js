#!/usr/bin/env node
/**
 * Card key in, publishable Short out. The whole pipeline in one command.
 *
 *   card-sources.js  ->  the figure and its attribution
 *   make_news_bed.js ->  the music bed, length-matched
 *   render_short_video.js -> 1080x1920 MP4 with the timeline
 *   this file        ->  writes the SEO payload beside the video
 *
 * IT RENDERS AND STOPS. Nothing here uploads, and that separation is the point:
 * publishing is the irreversible step, so it lives in its own script with its
 * own flag. See publish_short.js.
 *
 * ROTATION IS DETERMINISTIC, NOT RANDOM. `--next` picks the card that has gone
 * longest without being made, from the ledger. Random selection on a twice-a-day
 * schedule repeats within a week and looks like a broken bot; a queue does not.
 *
 * Usage:
 *   node scripts/shorts/make_short.js --key barber-never-pass
 *   node scripts/shorts/make_short.js --next
 *   node scripts/shorts/make_short.js --next --seconds 9 --audio path/to/licensed.m4a
 */

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { buildCard, buildSeo, listKeys } = require("./card-sources");

const ROOT = path.join(__dirname, "..", "..");
const OUT_DIR = path.join(ROOT, "reference", "Podcast Visuals", "Shorts");
/** Which cards have been made, and when. Also what --next reads. */
const LEDGER = path.join(OUT_DIR, "_ledger.json");

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };

function readLedger() {
  try { return JSON.parse(fs.readFileSync(LEDGER, "utf8")); } catch { return { made: {} }; }
}

/** Longest-unused card. Never-used sorts first, so a new card jumps the queue. */
function nextKey() {
  const led = readLedger();
  const keys = listKeys();
  return keys
    .map((k) => ({ k, at: led.made[k]?.at || "" }))
    .sort((a, b) => a.at.localeCompare(b.at))[0].k;
}

async function main() {
  const key = process.argv.includes("--next") ? nextKey() : arg("key", listKeys()[0]);
  const seconds = Number(arg("seconds", 9));
  const fps = Number(arg("fps", 30));
  let audio = arg("audio", null);

  const card = await buildCard(key);
  const seo = buildSeo(card);

  console.log(`\n  card    ${key}`);
  console.log(`  stat    ${card.stat}  ${card.label}`);
  console.log(`  title   ${seo.title}`);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  /**
   * Generate a bed only when no licensed track was supplied. The synthesised
   * one is a placeholder — see make_news_bed.js — and this branch exists so
   * passing a real track is the easy path rather than a code change.
   */
  if (!audio) {
    const bed = path.join(OUT_DIR, `_bed-${seconds}s.m4a`);
    if (!fs.existsSync(bed)) {
      execFileSync("node", [path.join(ROOT, "scripts", "make_news_bed.js"), "--seconds", String(seconds), "--out", path.basename(bed)], { stdio: "inherit" });
    }
    audio = bed;
  }

  const args = [
    path.join(ROOT, "scripts", "render_short_video.js"),
    "--name", key,
    "--seconds", String(seconds),
    "--fps", String(fps),
    "--audio", audio,
  ];
  for (const f of ["chip", "date", "stat", "label", "punch", "source", "question", "tone"]) {
    if (card[f]) args.push(`--${f}`, String(card[f]));
  }
  execFileSync("node", args, { stdio: "inherit" });

  const video = path.join(OUT_DIR, `${key}.mp4`);
  const meta = path.join(OUT_DIR, `${key}.seo.json`);
  fs.writeFileSync(meta, JSON.stringify({ key, card, seo, video: path.relative(ROOT, video), renderedAt: new Date().toISOString() }, null, 2) + "\n");

  const led = readLedger();
  led.made[key] = { at: new Date().toISOString() };
  fs.writeFileSync(LEDGER, JSON.stringify(led, null, 2) + "\n");

  console.log(`  seo     ${path.relative(ROOT, meta)}`);
  console.log(`\n  Not uploaded. Publish with:\n    node scripts/shorts/publish_short.js --key ${key}\n`);
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
