#!/usr/bin/env node
/**
 * THE TEMPLATE LAYER. Turns data from this environment into news cards.
 *
 * A card is a plain object with exactly the fields shorts-news.html reads:
 *
 *   { key, chip, stat, label, punch, source, question, tone }
 *
 * That shape is the whole contract. Anything that can produce it — the exam
 * stats file, a Supabase query, a regulator diff, a CSV somebody drops in —
 * becomes a Short with no renderer changes.
 *
 * ============================================================================
 * EVERY CARD CARRIES ITS OWN ATTRIBUTION, AND THAT IS NOT DECORATION
 * ============================================================================
 * `source` is required by convention, not by the template — the renderer would
 * happily emit a card without one. It is required HERE because a figure on a
 * public video with our mark on it is a claim we have to be able to defend when
 * somebody screenshots it, and because this repo has already been bitten by a
 * number that travelled without its source (the "37.25% pass rate" that was
 * actually a failure rate). A source that cannot be named is a card that does
 * not get made.
 *
 * `assert()` below is the enforcement. It refuses a card with a missing field
 * rather than rendering a blank one, because a Short with an empty line reads
 * as broken and a Short with a missing source reads as invented.
 *
 * WHY SOURCES ARE FUNCTIONS AND NOT CONSTANTS. Half of these are live queries.
 * Baking values in at author time would mean a card claiming a figure that has
 * since changed, which is the specific failure the whole repo is organised
 * against.
 *
 * Usage:
 *   node scripts/shorts/card-sources.js --list
 *   node scripts/shorts/card-sources.js --key barber-never-pass
 *   node scripts/shorts/card-sources.js --key barber-never-pass --json
 */

require("dotenv").config({ path: ".env.local" });

/** Today, in the timezone the data is about. */
function todayLabel() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Chicago",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());
}

/**
 * The verified Texas figures. Mirrored from lib/texas-exam-stats.ts rather than
 * imported because that file is TypeScript and these scripts are CommonJS.
 *
 * MIRRORED MEANS IT CAN DRIFT, which is the cost of the arrangement and is
 * called out here so nobody discovers it by publishing a stale number. If
 * lib/texas-exam-stats.ts changes, change this. `npm run shorts:verify` exists
 * to catch exactly that — see verify-figures.js.
 */
const TX = {
  barberWrittenFirst: 56.98,
  barberWrittenEverPass: 63.45,
  barberNeverPass: 36.55,
  barberAllAttempts: 44.09,
  barberPractical: 92.34,
  cosmetWrittenFirst: 58.87,
  cosmetPractical: 97.19,
  naccasThreshold: 70,
  rosterN: 2411,
  window: "Jan 2 – May 16, 2026",
  barberMetros: [
    { city: "Dallas", pct: 78.43 },
    { city: "Fort Worth", pct: 77.91 },
    { city: "Houston", pct: 67.87 },
    { city: "Austin", pct: 58.82 },
    { city: "San Antonio", pct: 52.17 },
    { city: "El Paso", pct: 42.11 },
  ],
};

const SRC_ROSTER = `Source: TDLR / PSI roster · ${TX.rosterN.toLocaleString()} records · 2026`;

/**
 * SEO PER CARD, aimed at the terms the demand research actually found open.
 *
 * The barber practical/state-board cluster came back at 10-19x views-per-
 * subscriber with 54-78% of ranking videos from channels under 50k subs, and
 * no incumbent. Every cosmetology equivalent came back CROWDED behind one
 * 640k-subscriber channel. So titles and tags lean BARBER even when the figure
 * is a cosmetology one — the audience overlaps, the competition does not.
 *
 * `#Shorts` in the title is belt-and-braces: YouTube infers the format from
 * aspect ratio and duration, but the tag costs nothing and removes any doubt.
 */
const SEO_DEFAULT_TAGS = [
  "barber state board", "barber exam", "texas barber license",
  "barber school", "barber state board practical", "barber written exam",
  "cosmetology state board", "beauty school", "barber apprentice",
];

/**
 * The card registry. Each entry is a function so live data is read at render
 * time, not at author time.
 *
 * TONE: 'bad' (rose) is the default because a figure worth a Short is usually
 * one that should not be true. 'good' (teal) exists so a genuine improvement
 * does not arrive looking like an alarm.
 */
const SOURCES = {
  "barber-never-pass": async () => ({
    seoTitle: "36.55% of Texas Barbers NEVER Pass the Written Exam #Shorts",
    chip: "Texas · Licensing",
    stat: `${TX.barberNeverPass}%`,
    label: "of Texas barber candidates never pass the written exam.",
    punch: `They pass the hands-on exam at ${TX.barberPractical}%.`,
    source: SRC_ROSTER,
    question: "So is the exam broken — or the training?",
    tone: "bad",
  }),

  "metros-below-threshold": async () => {
    const below = TX.barberMetros.filter((m) => m.pct < TX.naccasThreshold);
    return {
      chip: "Texas · Schools",
      stat: `${below.length} of ${TX.barberMetros.length}`,
      label: "Texas barber metros sit below the accreditation monitoring line.",
      punch: `Houston — the state's largest — is one of them.`,
      source: `Source: TDLR 2026 outcomes · ${TX.naccasThreshold}% NACCAS threshold`,
      question: "Should a school have to publish its pass rate?",
      seoTitle: "4 of 6 Texas Barber Metros Are Below the Accreditation Line #Shorts",
      tone: "bad",
    };
  },

  "metro-spread": async () => {
    const sorted = [...TX.barberMetros].sort((a, b) => b.pct - a.pct);
    const top = sorted[0], bottom = sorted[sorted.length - 1];
    return {
      chip: "Texas · Licensing",
      stat: `${(top.pct - bottom.pct).toFixed(0)} points`,
      label: `separate ${top.city} from ${bottom.city} on the same barber written exam.`,
      punch: "Same state. Same test. Same textbook.",
      source: SRC_ROSTER,
      question: "What would explain a gap that big?",
      seoTitle: "36 Points Separate Dallas From El Paso on the Same Barber Exam #Shorts",
      tone: "bad",
    };
  },

  "all-attempts": async () => ({
    chip: "Texas · Licensing",
    stat: `${TX.barberAllAttempts}%`,
    label: "of all Texas barber written exam sittings end in a pass.",
    punch: "Retakes included. More people walk out failing than passing.",
    source: SRC_ROSTER,
    question: "Would you retake it a third time?",
    seoTitle: "Fewer Than Half of Texas Barber Exam Sittings End in a Pass #Shorts",
    tone: "bad",
  }),

  "practical-is-not-a-filter": async () => ({
    chip: "Texas · Exams",
    stat: `${TX.cosmetPractical}%`,
    label: "of Texas cosmetology candidates pass the hands-on exam.",
    punch: "A test almost nobody fails is not a filter.",
    source: "Source: TDLR 2026 school-reported outcomes",
    question: "Is the practical exam still worth taking?",
    seoTitle: "97% Pass the Hands-On Exam. Is It Even a Filter? #Shorts",
    tone: "good",
  }),

  /**
   * LIVE. Reads the directory rather than the stats file, so the number moves
   * on its own. Kept deliberately simple — a count is defensible; a derived
   * ratio from a table nobody has audited is not.
   */
  "schools-tracked": async () => {
    const { createClient } = require("@supabase/supabase-js");
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const counts = await Promise.all(
      ["agent_barber_school_leads", "agent_cosmetology_school_leads"].map(async (t) => {
        const { count } = await db.from(t).select("*", { count: "exact", head: true });
        return count || 0;
      })
    );
    const total = counts.reduce((a, b) => a + b, 0);
    return {
      chip: "Texas · Directory",
      stat: total.toLocaleString(),
      label: "barber and cosmetology schools tracked with published outcomes.",
      punch: "Pass rates, penalties and programmes — in one place.",
      source: `Source: ShearQuery directory · ${todayLabel()}`,
      question: "Did your school publish its pass rate before you enrolled?",
      seoTitle: "1,185 Barber & Cosmetology Schools, Ranked by Real Outcomes #Shorts",
      tone: "good",
    };
  },
};

/* --------------------------------------------------- approved candidates */

/**
 * Approved regulator-diff candidates, exposed as cards under `candidate:<id>`.
 *
 * NAMESPACED ON PURPOSE. A candidate key can never collide with a hand-written
 * source, and the prefix makes it obvious in the ledger and the publish log
 * which Shorts came from a detected change versus a curated figure.
 *
 * ONLY `approved` ONES. A candidate with null copy, or one somebody rejected,
 * is invisible here — the registry is what the automation reads, so anything
 * unapproved simply cannot reach a render, let alone an upload.
 */
const CANDIDATES_FILE = require("path").join(__dirname, "..", "..", "reference", "Podcast Visuals", "Shorts", "_candidates.json");

function approvedCandidates() {
  try {
    const list = JSON.parse(require("fs").readFileSync(CANDIDATES_FILE, "utf8"));
    return list.filter((c) => c.approved && !c.rejected && c.label && c.punch && c.question);
  } catch {
    return [];
  }
}

function candidateToCard(c) {
  return {
    chip: c.chip || "Texas · TDLR",
    stat: c.stat,
    label: c.label,
    punch: c.punch,
    source: c.source,
    question: c.question,
    tone: c.tone || "bad",
    seoTitle: c.seoTitle || `${c.stat} — ${c.label}`.slice(0, 92) + " #Shorts",
  };
}

/**
 * Derived cards, emitted by derived-cards.js --refresh and exposed under
 * `derived:<key>`. Read from the file rather than recomputed here: the
 * threshold gate lives in that script, and recomputing at render time would
 * bypass it and republish a figure that had not moved.
 */
const DERIVED_FILE = require("path").join(__dirname, "..", "..", "reference", "Podcast Visuals", "Shorts", "_derived-cards.json");

function derivedCards() {
  try { return JSON.parse(require("fs").readFileSync(DERIVED_FILE, "utf8")); } catch { return []; }
}

/** Fields a card must carry before it is allowed to become a video. */
const REQUIRED = ["chip", "stat", "label", "punch", "source", "question"];

function assert(key, card) {
  const missing = REQUIRED.filter((f) => !card[f] || !String(card[f]).trim());
  if (missing.length) {
    throw new Error(`Card "${key}" is missing: ${missing.join(", ")}. A card without a source is not publishable.`);
  }
  /**
   * Length ceilings, from what actually fits the frame at 1080 wide. The
   * renderer auto-fits the STAT but nothing else, so an over-long label wraps
   * past the safe area and is covered by YouTube's chrome — silently.
   */
  const limits = { stat: 12, label: 92, punch: 74, question: 58, source: 62 };
  for (const [f, max] of Object.entries(limits)) {
    if (card[f] && String(card[f]).length > max) {
      throw new Error(`Card "${key}" field "${f}" is ${String(card[f]).length} chars, over the ${max} that fits the frame.`);
    }
  }
  return card;
}

async function buildCard(key) {
  if (key.startsWith("derived:")) {
    const d = derivedCards().find((x) => x.key === key);
    if (!d) throw new Error(`No derived card "${key}". Run: node scripts/shorts/derived-cards.js --refresh`);
    const { key: _k, ...card } = d;
    return assert(key, { key, date: todayLabel(), tone: "bad", ...card });
  }
  if (key.startsWith("candidate:")) {
    const id = key.slice("candidate:".length);
    const c = approvedCandidates().find((x) => x.id === id);
    if (!c) throw new Error(`No APPROVED candidate "${id}". Approve it first: approve-candidate.js --id ${id} --approve`);
    return assert(key, { key, date: todayLabel(), ...candidateToCard(c) });
  }
  const fn = SOURCES[key];
  if (!fn) throw new Error(`Unknown card "${key}". Known: ${listKeys().join(", ")}`);
  const card = await fn();
  return assert(key, { key, date: todayLabel(), tone: "bad", ...card });
}

/**
 * The YouTube payload for a card.
 *
 * TITLE IS CAPPED AT 100 CHARACTERS by the API and truncated far earlier in a
 * feed, so the claim goes first and the hashtag last — a title whose only
 * distinctive words are past the fold is a title nobody read.
 *
 * THE DESCRIPTION REPEATS THE SOURCE. The card shows it for nine seconds; the
 * description is where someone who wants to check it actually looks, and it is
 * the only place a link survives.
 */
function buildSeo(card) {
  const title = (card.seoTitle || `${card.stat} — ${card.label}`).slice(0, 100);
  const description = [
    `${card.stat} ${card.label}`,
    ``,
    card.punch,
    ``,
    card.question,
    `Tell us below.`,
    ``,
    card.source.replace(/^Source:\s*/, "Source: "),
    ``,
    `Full pass rates, kit lists and state board guides:`,
    `https://shearquery.com`,
    ``,
    `#Shorts #barber #barberschool #stateboard #cosmetology`,
  ].join("\n");

  return {
    title,
    description,
    tags: SEO_DEFAULT_TAGS,
    // 26 = Howto & Style. Education (27) tested worse for trade content.
    categoryId: "26",
    defaultLanguage: "en",
  };
}

/**
 * Curated cards FIRST, then approved candidates. Order matters: run_scheduled
 * walks this list and takes the first unpublished key, so a freshly approved
 * candidate queues behind the curated set rather than jumping it. A regulator
 * change is more newsworthy, but it is also rarer — burning it on a day the
 * pool is already full wastes it.
 */
const listKeys = () => [
  ...Object.keys(SOURCES),
  ...derivedCards().map((d) => d.key),
  ...approvedCandidates().map((c) => `candidate:${c.id}`),
];

if (require.main === module) {
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : null; };
  (async () => {
    if (argv.includes("--list")) {
      console.log("\nAvailable cards:\n");
      for (const k of listKeys()) {
        try {
          const c = await buildCard(k);
          console.log(`  ${k.padEnd(28)} ${c.stat.padEnd(12)} ${c.label.slice(0, 56)}`);
        } catch (e) {
          console.log(`  ${k.padEnd(28)} FAILS — ${e.message}`);
        }
      }
      console.log("");
      return;
    }
    const key = arg("key") || listKeys()[0];
    const card = await buildCard(key);
    if (argv.includes("--json")) { console.log(JSON.stringify(card, null, 2)); return; }
    for (const [k, v] of Object.entries(card)) console.log(`  ${k.padEnd(10)} ${v}`);
  })().catch((e) => { console.error(e.message); process.exit(1); });
}

module.exports = { SOURCES, buildCard, buildSeo, listKeys, REQUIRED, approvedCandidates, derivedCards };
