#!/usr/bin/env node
/**
 * The unattended run: pick the next card, render it, publish it. One Short.
 *
 * Invoked once a day by cron. Everything it needs is deterministic — the card
 * comes off a rotation queue, not a random pick — so repeated runs never
 * collide and the output is reproducible from the ledger.
 *
 * ============================================================================
 * THE GUARDS, AND WHY EACH ONE EXISTS
 * ============================================================================
 * This script publishes PUBLIC video to a real channel with nobody watching.
 * That is what was asked for, and it means every failure mode has to fail
 * CLOSED — a broken run must publish nothing rather than publish something
 * wrong. So, in order:
 *
 *   DAILY CAP. Refuses if MAX_PER_DAY have already gone out today. A cron that
 *   fires twice, a manual run on the same day, or a retry after a partial
 *   failure would otherwise stack uploads on one channel.
 *
 *   NO REPEATS. Refuses a card already in _published.json. The rotation should
 *   prevent it; this catches the case where the ledger and the published log
 *   disagree, which is exactly when a bot starts reposting.
 *
 *   RENDER BEFORE PUBLISH, SEPARATELY. If rendering throws, the publisher is
 *   never reached. The two steps are separate processes for this reason.
 *
 *   POOL EXHAUSTION IS AN ERROR, NOT A WRAP-AROUND. When every card has been
 *   published, this stops and says so rather than silently starting again from
 *   the top. Reposting the same handful of figures on a loop is how an automated
 *   channel becomes spam.
 *
 * QUOTA. videos.insert sits in its own bucket with a documented default of 100
 * calls per day. One is far inside it. There is deliberately no retry loop: a
 * blind retry on a failing upload can burn the whole allowance.
 *
 * Usage:
 *   node scripts/shorts/run_scheduled.js --dry-run
 *   node scripts/shorts/run_scheduled.js
 *   node scripts/shorts/run_scheduled.js --unlisted     # publish quietly
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env.local") });
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { listKeys } = require("./card-sources");

const ROOT = path.join(__dirname, "..", "..");
const OUT_DIR = path.join(ROOT, "reference", "Podcast Visuals", "Shorts");
const PUBLISHED = path.join(OUT_DIR, "_published.json");
const LOG = path.join(OUT_DIR, "_scheduled.log");

const DRY = process.argv.includes("--dry-run");
const UNLISTED = process.argv.includes("--unlisted");

/**
 * Hard ceiling per calendar day, Central — where the audience and data are.
 *
 * ONE, NOT TWO, UNTIL THE POOL IS DEEPER. Cadence is limited by supply, not by
 * appetite: nine cards at two a day is four days of content, and the thing that
 * happens on day five — an automated channel with nothing new to say — is worse
 * than posting half as often. At one a day the same pool lasts eight days,
 * which is long enough for renewal-wave to roll into a new month and for the
 * crawlers to move directory-coverage past its threshold.
 *
 * Raise this when the pool sustains it, not when it feels slow.
 */
const MAX_PER_DAY = 1;

const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date());

function log(line) {
  const stamp = new Date().toISOString();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.appendFileSync(LOG, `${stamp}  ${line}\n`);
  console.log(`  ${line}`);
}

function readPublished() {
  try { return JSON.parse(fs.readFileSync(PUBLISHED, "utf8")); } catch { return {}; }
}

function main() {
  const published = readPublished();
  const todayStr = today();

  const publishedToday = Object.values(published).filter(
    (p) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(p.at)) === todayStr
  ).length;

  if (publishedToday >= MAX_PER_DAY) {
    log(`SKIP — ${publishedToday} already published today (cap ${MAX_PER_DAY})`);
    return;
  }

  const unpublished = listKeys().filter((k) => !published[k]);
  if (!unpublished.length) {
    log(`STOP — every card has been published. Add cards to card-sources.js; this will NOT loop and repost.`);
    process.exitCode = 2;
    return;
  }

  const key = unpublished[0];
  log(`START ${key}  (${unpublished.length} unpublished remaining)`);

  if (DRY) { log(`DRY RUN — would render and publish ${key}`); return; }

  try {
    execFileSync("node", [path.join(__dirname, "make_short.js"), "--key", key, "--seconds", "9"], {
      stdio: "inherit", cwd: ROOT,
    });
  } catch (e) {
    log(`FAIL render ${key} — ${e.message.slice(0, 200)}. Nothing published.`);
    process.exitCode = 1;
    return;
  }

  try {
    const args = [path.join(__dirname, "publish_short.js"), "--key", key];
    if (!UNLISTED) args.push("--public");
    execFileSync("node", args, { stdio: "inherit", cwd: ROOT });
    const after = readPublished();
    log(`DONE ${key} — https://youtube.com/shorts/${after[key]?.videoId || "?"}`);
  } catch (e) {
    log(`FAIL publish ${key} — ${e.message.slice(0, 200)}`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();
