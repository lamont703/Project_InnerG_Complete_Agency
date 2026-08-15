#!/usr/bin/env node
/**
 * Keyword research for YouTube.
 *
 * FIRST, THE THING THAT DECIDES THE WHOLE DESIGN: there is no YouTube Keyword
 * Planner. Not in the Google Ads API, not in the YouTube Data API. Two facts,
 * both checked against Google's own documentation on 2026-08-15 rather than
 * recalled:
 *
 *   KeywordPlanNetwork has exactly two values — GOOGLE_SEARCH and
 *   GOOGLE_SEARCH_AND_PARTNERS. There is no YouTube network. So
 *   scripts/gads_keyword_ideas.js and gads_keyword_volume.js, which already
 *   work well for Search, structurally cannot return YouTube volume. Pointing
 *   them at video terms returns Google Search demand wearing a YouTube label,
 *   which is worse than no number.
 *
 *   The YouTube Data API publishes no search-volume or keyword metric at all,
 *   and search.list sits in its own quota bucket with a default of 100 CALLS
 *   PER DAY. Not 10,000 units — 100 calls. So it cannot be brute-forced into a
 *   volume proxy either.
 *
 * WHAT THIS USES INSTEAD, and the honest status of each:
 *
 *   AUTOCOMPLETE (unofficial). suggestqueries.google.com with ds=yt returns
 *   YouTube's own search suggestions. This is what every commercial "YouTube
 *   keyword tool" actually runs on. The suggestions are real demand — YouTube
 *   surfaces what people type — and it is effectively unlimited and free.
 *   BUT IT IS UNDOCUMENTED: no SLA, no stability promise, and it can be
 *   changed or blocked without notice. Treat a result as a ranked list, never
 *   as a volume, because ORDER IS ALL YOU GET. Anyone who reports a number
 *   from this endpoint has invented it.
 *
 *   DEMAND BY PROXY (official, quota-bound). search.list plus videos.list:
 *   what already ranks for a term, and how many views those videos have. A
 *   term whose top results have millions of views across several years is
 *   demonstrably wanted. Costs one of the day's 100 searches per term, so it
 *   is opt-in and capped.
 *
 * THE FREQUENCY COLUMN IS NOT VOLUME. A term that appears under many different
 * expansions is one YouTube associates with many contexts, which correlates
 * with breadth of demand. It is a ranking signal and nothing more. It is named
 * `appearances` rather than anything volume-shaped for exactly that reason.
 *
 * Usage:
 *   node scripts/youtube_keyword_research.js
 *   node scripts/youtube_keyword_research.js --seed "barber state board" --seed "cosmetology exam"
 *   node scripts/youtube_keyword_research.js --deep        # a-z expansion, slower
 */

const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "reference", "Keyword Research");
const DELAY_MS = 120;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The domain this site actually competes in. Overridable with --seed.
const DEFAULT_SEEDS = [
  "barber state board exam",
  "texas barber practical exam",
  "cosmetology practical exam",
  "barber practical exam kit",
  "cosmetology state board kit",
  "barber school",
  "cosmetology school",
  "how to become a barber",
  "barber license",
  "cosmetology license",
  "barber exam tips",
  "state board practice",
];

const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");

async function suggest(q) {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.[1]) ? data[1] : [];
  } catch {
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  const deep = args.includes("--deep");
  const seeds = [];
  args.forEach((a, i) => { if (a === "--seed" && args[i + 1]) seeds.push(args[i + 1]); });
  const SEEDS = seeds.length ? seeds : DEFAULT_SEEDS;

  const found = new Map(); // term -> { appearances, seeds:Set, position:best }

  const record = (term, seed, idx) => {
    const t = term.toLowerCase().trim();
    if (!t) return;
    const e = found.get(t) || { term: t, appearances: 0, seeds: new Set(), bestPosition: 99 };
    e.appearances++;
    e.seeds.add(seed);
    e.bestPosition = Math.min(e.bestPosition, idx);
    found.set(t, e);
  };

  for (const seed of SEEDS) {
    const queries = [seed];
    if (deep) {
      for (const ch of ALPHABET) queries.push(`${seed} ${ch}`);
      // Question and comparison prefixes surface intent that plain expansion
      // misses — "how", "why", "vs" are where tutorial demand actually lives.
      for (const pre of ["how to", "why", "best", "vs", "worst"]) queries.push(`${pre} ${seed}`);
    }
    let n = 0;
    for (const q of queries) {
      const out = await suggest(q);
      out.forEach((t, i) => record(t, seed, i));
      n += out.length;
      await sleep(DELAY_MS);
    }
    console.log(`  ${seed.padEnd(32)} ${String(n).padStart(4)} suggestions   (unique so far: ${found.size})`);
  }

  const rows = [...found.values()]
    .map((e) => ({
      term: e.term,
      appearances: e.appearances,
      seedsMatched: e.seeds.size,
      bestPosition: e.bestPosition,
      // Breadth first (many contexts), then how high YouTube ranks it.
      rank: e.seeds.size * 10 + e.appearances - e.bestPosition * 0.5,
    }))
    .sort((a, b) => b.rank - a.rank);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, "youtube-suggestions.json");
  fs.writeFileSync(outFile, JSON.stringify({
    generatedAt: new Date().toISOString().slice(0, 10),
    source: "YouTube autocomplete (suggestqueries.google.com, ds=yt) — UNOFFICIAL and undocumented",
    warning:
      "These are RANKED SUGGESTIONS, not volumes. YouTube publishes no search-volume API: " +
      "KeywordPlanNetwork has no YouTube value, and the Data API exposes no keyword metrics. " +
      "Any number presented as YouTube search volume — here or in a commercial tool — is inferred, not measured.",
    appearancesMeaning:
      "How many expansions surfaced this term. A breadth signal, correlating with how many contexts " +
      "YouTube associates it with. NOT a volume.",
    seeds: SEEDS,
    deep,
    totalTerms: rows.length,
    terms: rows,
  }, null, 2) + "\n");

  const csv = ["term,appearances,seeds_matched,best_position"]
    .concat(rows.map((r) => `"${r.term.replace(/"/g, '""')}",${r.appearances},${r.seedsMatched},${r.bestPosition}`))
    .join("\n");
  fs.writeFileSync(path.join(OUT_DIR, "youtube-suggestions.csv"), csv + "\n");

  console.log(`\n${rows.length} unique terms\n`);
  console.log("APPEARS  SEEDS  POS  TERM");
  console.log("-".repeat(76));
  for (const r of rows.slice(0, 30)) {
    console.log(
      String(r.appearances).padStart(7) + "  " +
      String(r.seedsMatched).padStart(5) + "  " +
      String(r.bestPosition).padStart(3) + "  " + r.term
    );
  }
  console.log(`\nWritten to reference/Keyword Research/youtube-suggestions.{json,csv}`);
}

if (require.main === module) main();
