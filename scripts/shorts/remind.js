#!/usr/bin/env node
/**
 * Prints a reminder when today's Short has not gone out yet.
 *
 * WHY A SHELL REMINDER RATHER THAN A SCHEDULER. cron needs Full Disk Access it
 * does not have, and launchd cannot enter a working directory under ~/Desktop —
 * both fail with EPERM, and both fail SILENTLY at 9am into a log nobody reads.
 * This runs as you, in your own shell, with your own permissions. There is
 * nothing to grant and nothing to break.
 *
 * IT ONLY SPEAKS WHEN THERE IS SOMETHING TO DO. Silent if today's Short is
 * already published, silent if the pool is empty, silent on any error. A
 * reminder that prints every time becomes wallpaper within a week, and then it
 * is worse than no reminder because you have stopped seeing it.
 *
 * IT NEVER PUBLISHES. It prints a command. The irreversible step stays a thing
 * a person types — which is the same reason publish_short.js is separate from
 * make_short.js.
 *
 * FAILS SILENT, ALWAYS. This runs on every shell startup; a stack trace in your
 * prompt because Supabase was slow would be a worse bug than the one it solves.
 *
 * Install (add to ~/.zshrc):
 *   node ~/Desktop/AI_Blockchain_Enterprise_Services/scripts/shorts/remind.js 2>/dev/null
 *
 * Usage:
 *   node scripts/shorts/remind.js
 *   node scripts/shorts/remind.js --force    # print even if today is done
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const OUT_DIR = path.join(ROOT, "reference", "Podcast Visuals", "Shorts");
const PUBLISHED = path.join(OUT_DIR, "_published.json");

const FORCE = process.argv.includes("--force");

const day = (d) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

const c = {
  dim: "\x1b[2m", bold: "\x1b[1m", reset: "\x1b[0m",
  amber: "\x1b[33m", cyan: "\x1b[36m", rose: "\x1b[31m",
};

try {
  const published = JSON.parse(fs.readFileSync(PUBLISHED, "utf8"));
  const todayStr = day(new Date());
  const doneToday = Object.values(published).some((p) => day(new Date(p.at)) === todayStr);

  if (doneToday && !FORCE) process.exit(0);

  // Required late so a Supabase hiccup cannot break a shell prompt.
  const { listKeys } = require("./card-sources");
  const remaining = listKeys().filter((k) => !published[k]);

  if (!remaining.length) {
    console.log(`\n${c.rose}${c.bold}  ShearQuery Shorts — the card pool is empty.${c.reset}`);
    console.log(`${c.dim}  Add sources to scripts/shorts/card-sources.js, or run:${c.reset}`);
    console.log(`${c.cyan}    node scripts/shorts/derived-cards.js --refresh${c.reset}\n`);
    process.exit(0);
  }

  const next = remaining[0];
  console.log(`\n${c.amber}${c.bold}  ShearQuery Short not posted today.${c.reset}`);
  console.log(`${c.dim}  next: ${c.reset}${next}${c.dim}   ${remaining.length} card${remaining.length === 1 ? "" : "s"} left in the pool${c.reset}`);
  console.log(`${c.cyan}    node scripts/shorts/run_scheduled.js${c.reset}`);
  console.log(`${c.dim}    (renders ~80s, then publishes public — add --dry-run to preview)${c.reset}\n`);
} catch {
  // Silent. See the header.
  process.exit(0);
}
