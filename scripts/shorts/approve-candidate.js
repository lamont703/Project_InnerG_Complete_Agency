#!/usr/bin/env node
/**
 * The approval gate between a detected change and a published video.
 *
 * WHY A HUMAN STEP EXISTS IN AN OTHERWISE AUTOMATED PIPELINE. regulator-diff.js
 * can establish that a fee moved from $70 to $78. It cannot establish what that
 * means, who it hits, or whether it is worth anyone's nine seconds — and a
 * model asked to invent that sentence will invent it confidently. Every other
 * guard in this repo exists because a number once travelled without its
 * meaning; this is the same guard, placed where the number becomes public.
 *
 * SO CANDIDATES ARRIVE WITH NULLS. `label`, `punch` and `question` are empty
 * until someone writes them. A null is a gap you notice. A plausible sentence
 * generated from a diff is a gap you do not.
 *
 * APPROVAL IS ALSO THE ACCURACY CHECK. The candidate carries `sourceUrl` and
 * `settles` precisely so the person approving can open the page and confirm the
 * value before it becomes a claim with our mark on it.
 *
 * Usage:
 *   node scripts/shorts/approve-candidate.js --list
 *   node scripts/shorts/approve-candidate.js --id <id> \
 *     --label "..." --punch "..." --question "..." [--chip "..."] [--tone good]
 *   node scripts/shorts/approve-candidate.js --id <id> --approve
 *   node scripts/shorts/approve-candidate.js --id <id> --reject
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const CANDIDATES = path.join(ROOT, "reference", "Podcast Visuals", "Shorts", "_candidates.json");

const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null; };

const read = () => { try { return JSON.parse(fs.readFileSync(CANDIDATES, "utf8")); } catch { return []; } };
const write = (list) => fs.writeFileSync(CANDIDATES, JSON.stringify(list, null, 2) + "\n");

/** Same ceilings card-sources.js enforces — refuse here rather than at render. */
const LIMITS = { label: 92, punch: 74, question: 58 };

function main() {
  const list = read();

  if (argv.includes("--list") || !argv.length) {
    if (!list.length) { console.log("\n  No candidates. Run regulator-diff.js.\n"); return; }
    console.log(`\n  ${list.length} candidate(s):\n`);
    for (const c of list) {
      const state = c.rejected ? "rejected" : c.approved ? "APPROVED" : c.label ? "drafted" : "needs copy";
      console.log(`  ${state.padEnd(11)} ${c.stat.padEnd(8)} ${c.kind.padEnd(7)} ${c.id}`);
      console.log(`              was ${c.was} · "${c.context}"`);
      console.log(`              ${c.sourceUrl}`);
      if (c.label) console.log(`              label: ${c.label}`);
      console.log("");
    }
    console.log(`  Author with:  --id <id> --label "..." --punch "..." --question "..."\n`);
    return;
  }

  const id = arg("id");
  if (!id) { console.error("Need --id. Run --list to see them."); process.exit(1); }
  const c = list.find((x) => x.id === id);
  if (!c) { console.error(`No candidate "${id}".`); process.exit(1); }

  if (argv.includes("--reject")) {
    c.rejected = true; c.approved = false;
    write(list);
    console.log(`  rejected  ${id}`);
    return;
  }

  for (const f of ["label", "punch", "question", "chip", "tone"]) {
    const v = arg(f);
    if (v !== null) c[f] = v;
  }

  for (const [f, max] of Object.entries(LIMITS)) {
    if (c[f] && c[f].length > max) {
      console.error(`  "${f}" is ${c[f].length} chars, over the ${max} that fits the frame.`);
      process.exit(1);
    }
  }

  if (argv.includes("--approve")) {
    const missing = ["label", "punch", "question"].filter((f) => !c[f]);
    if (missing.length) {
      console.error(`  Cannot approve — still missing: ${missing.join(", ")}`);
      process.exit(1);
    }
    c.approved = true;
    c.rejected = false;
    c.approvedAt = new Date().toISOString();
    console.log(`  APPROVED  ${id}\n  It is now a card. Render with:\n    node scripts/shorts/make_short.js --key candidate:${id}`);
  } else {
    console.log(`  drafted   ${id}  (add --approve when the copy is right)`);
  }
  write(list);
}

if (require.main === module) main();
