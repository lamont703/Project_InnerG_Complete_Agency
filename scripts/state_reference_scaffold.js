#!/usr/bin/env node
/**
 * Scaffolds reference/ with one folder per US state, and seeds each with a URL
 * map to fill in.
 *
 * WHY A URL MAP AND NOT JUST THE PDFs. Board sites publish documents that their
 * own sitemaps do not list — California's PSI portal is a JavaScript app with
 * no sitemap and no PDF links in its served HTML, and Maryland's kit list lives
 * at a path nothing links to. So the URL is the thing worth recording: a PDF on
 * disk with no origin cannot be re-checked, re-downloaded, or cited, and a
 * bulletin that cannot be re-checked is exactly the stale local copy CLAUDE.md
 * warns against. Every file we keep has to be traceable back to where it came
 * from.
 *
 * TWO FILES PER STATE, deliberately separate:
 *
 *   .provenance.json  what we HAVE — filename -> {url, title, pages, summary}
 *                     Written by scripts/fetch_state_board_pdfs.js. Existing
 *                     convention; California and Maryland already use it.
 *
 *   _urlmap.json      what we KNOW — the board, the exam vendor, and every
 *                     document URL discovered, downloaded or not. This is the
 *                     research record, and it is useful long before any PDF
 *                     exists. It is also what survives a site reorganising.
 *
 * Folders are named "{State} Exam Prep Files" to match the two that already
 * exist. Idempotent: run it again and it leaves anything already there alone.
 */

const fs = require("fs");
const path = require("path");

const REFERENCE = path.join(__dirname, "..", "reference");

// 50 states plus DC. DC licenses cosmetology through its own board, so it is
// in scope for the same reason every state is.
const STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
  "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
  "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

const ABBR = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
  "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
  "District of Columbia": "DC", "Florida": "FL", "Georgia": "GA", "Hawaii": "HI",
  "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
  "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
  "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
  "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
  "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI",
  "South Carolina": "SC", "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX",
  "Utah": "UT", "Vermont": "VT", "Virginia": "VA", "Washington": "WA",
  "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY",
};

const folderFor = (state) => path.join(REFERENCE, `${state} Exam Prep Files`);

/**
 * The seed record.
 *
 * Every unknown is spelled `null` rather than omitted or guessed. A missing key
 * reads as "nobody looked"; an empty string reads as "looked and found
 * nothing"; a guess reads as a fact. Only the first is honest before research,
 * and the difference matters when this file is what a page cites.
 *
 * hasPracticalExam is the field this whole exercise exists to answer — it
 * decides whether a kit list applies to the state at all, and it must come from
 * reading the bulletin, never from assuming the common case. California's
 * bulletin contains the word "practical" zero times.
 */
function seed(state) {
  return {
    state,
    abbreviation: ABBR[state],
    board: { name: null, url: null, notes: null },
    examVendor: { name: null, psiClientCode: null, portalUrl: null },
    // null = not yet established. Never default this to true.
    hasPracticalExam: null,
    practicalEvidence: null,
    licenses: [],
    // Every document URL found, downloaded or not. `file` is null until a copy
    // lands in this folder, at which point .provenance.json also records it.
    documents: [],
    testingCenters: { url: null, count: null },
    research: { lastCheckedAt: null, checkedBy: null, status: "not-started" },
  };
}

function main() {
  if (!fs.existsSync(REFERENCE)) fs.mkdirSync(REFERENCE, { recursive: true });

  let created = 0;
  let seeded = 0;
  for (const state of STATES) {
    const dir = folderFor(state);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      created++;
    }
    const map = path.join(dir, "_urlmap.json");
    if (!fs.existsSync(map)) {
      fs.writeFileSync(map, JSON.stringify(seed(state), null, 2) + "\n");
      seeded++;
    }
  }

  console.log(`states: ${STATES.length}`);
  console.log(`folders created: ${created} (existing left alone)`);
  console.log(`url maps seeded: ${seeded}`);
}

if (require.main === module) main();

module.exports = { STATES, ABBR, folderFor, seed, REFERENCE };
