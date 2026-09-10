#!/usr/bin/env node
/**
 * LANDSCAPE B-ROLL for the comment-reaction video, from Pixabay only.
 *
 *   node scripts/fetch_reaction_broll.js          # fetch
 *   node scripts/fetch_reaction_broll.js --dry    # search and report, download nothing
 *
 * WHY THIS EXISTS RATHER THAN lib/broll-library.js findClips(). The library was
 * checked first, as the b-roll rule requires — and every one of its 24 clips is
 * portrait, because it was built for 9:16 Reels and Shorts. There is nothing to
 * reuse for a 16:9 cut. Cropping 1080x1920 to 16:9 leaves 1080x607, under HD.
 *
 * WHY IT DOES NOT USE pickBest(). That picker sorts a hit's files by HEIGHT and
 * takes the tallest, which is the correct choice for a 9:16 crop and the wrong
 * one here. This picks the widest file at or above 1920 and rejects any clip
 * whose chosen file is not landscape, so nothing portrait reaches the timeline.
 *
 * IT REUSES searchVideos() DELIBERATELY. That function carries two findings
 * worth keeping: video_type=film (Pixabay mixes in line-drawn animation that no
 * tag distinguishes) and a 24h search cache. Only the picking is replaced.
 *
 * NOTHING HERE IS GENERATED. Pixabay is free and its licence permits commercial
 * use; the beats that need footage nobody filmed are diagrams, and those are
 * rendered from markup by HyperFrames rather than bought.
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { searchVideos } = require("../lib/pixabay.js");

const DRY = process.argv.includes("--dry");
const OUT = path.join("reference", "reaction-one-person-ai", "broll");

/** Minimum width for a 1080p landscape timeline. Below this it gets upscaled. */
const MIN_WIDTH = 1920;

/**
 * One entry per beat that needs footage. `seconds` is how long the clip is
 * actually on screen, so a hit shorter than that is rejected before scoring —
 * a 3-second clip under an 8-second hold means a visible loop.
 *
 * BEAT 1 USED TO BE EXEMPT AND IS NOT ANY MORE. The first cut of the script
 * opened on a generic hypothetical, so face-to-camera carried it. The voice-DNA
 * rewrite replaced that with his own barbershop story — a leased unit, a wall
 * coming down, six chairs, booth rent — which is 48 seconds of a specific place
 * that none of the original nine clips depicts. Beat 2 is still a screen
 * recording and beat 3 is still a diagram, but both run long enough now to need
 * something under the back half.
 *
 * THE BARBERSHOP CLIPS ARE THE SPINE, NOT DECORATION. The chairs are referenced
 * again in beat 3 as the mechanism and again in beat 7 as the arithmetic, so the
 * same footage has to carry three separate moments.
 */
const BEATS = [
  { beat: 4, slug: "measure",   seconds: 8, queries: ["stopwatch time", "office clock working", "analytics dashboard screen"] },
  { beat: 4, slug: "handoffs",  seconds: 6, queries: ["office paperwork desk", "documents folder office"] },
  { beat: 5, slug: "buildbuy",  seconds: 8, queries: ["laptop screen software", "computer screen typing office"] },
  { beat: 6, slug: "delivery",  seconds: 8, queries: ["server room data", "network server rack"] },
  { beat: 6, slug: "handover",  seconds: 6, queries: ["laptop meeting office", "business meeting laptop"] },
  { beat: 7, slug: "repricing", seconds: 8, queries: ["invoice calculator desk", "accounting calculator money"] },
  { beat: 8, slug: "roofing",   seconds: 8, queries: ["roofer roof construction", "construction worker roof"] },
  /*
   * "plumber" and "electrician" are barely used as Pixabay tags — both queries
   * returned nothing that passed the gate, and the unfiltered top hit was a
   * keyboard. Welding and carpentry are heavily tagged and read as the same
   * thing on screen: an unglamorous trade nobody makes content about.
   */
  { beat: 8, slug: "trades",    seconds: 8, queries: ["welding metal workshop", "carpenter wood workshop", "mechanic engine repair"] },
  { beat: 8, slug: "van",       seconds: 6, queries: ["work van street", "delivery truck road"] },

  /* --- added after the voice-DNA rewrite; see the note above --- */

  { beat: 1, slug: "shop",      seconds: 10, queries: ["barber shop interior", "barbershop chairs", "hair salon interior"] },
  { beat: 1, slug: "chair",     seconds: 8,  queries: ["barber chair", "barber cutting hair", "hairdresser client chair"] },
  /*
   * The wall coming down. "demolition" is well tagged; "renovation interior"
   * is the fallback because a literal sledgehammer read as too violent against
   * a story about a business decision.
   */
  { beat: 1, slug: "buildout",  seconds: 8,  queries: ["renovation interior construction", "demolition wall interior"] },

  /* Beat 3's diagram runs 26s against 66s of narration. */
  { beat: 3, slug: "overflow",  seconds: 8,  queries: ["busy office people", "paperwork stack desk"] },

  /* Beat 7 is the longest beat in the cut and had the least footage. */
  /*
   * "signing contract pen" and "handshake business deal" both returned nothing
   * landscape that passed the gate — the same barely-tagged problem recorded
   * above for plumber and electrician. A spreadsheet reads as the arithmetic
   * this beat is actually about, and it is heavily tagged.
   */
  { beat: 7, slug: "numbers",   seconds: 8,  queries: ["spreadsheet screen data", "financial chart graph screen"] },
  { beat: 7, slug: "money",     seconds: 8,  queries: ["counting money cash", "bank notes counting"] },

  /* Beat 8 names septic and medical billing now; neither was in the old list. */
  { beat: 8, slug: "pipes",     seconds: 6,  queries: ["excavator digging trench", "pipe installation ground"] },
  { beat: 8, slug: "billing",   seconds: 6,  queries: ["medical records paperwork", "hospital reception desk"] },

  /* Beat 9's close is 61s with nothing under it. */
  { beat: 9, slug: "road",      seconds: 10, queries: ["driving road windshield", "highway driving car"] },
];

/** Widest landscape file at or above MIN_WIDTH; undefined if the hit has none. */
function widestLandscape(hit) {
  const files = Object.values(hit.videos ?? {}).filter((v) => v && v.url && v.width > v.height);
  const big = files.filter((v) => v.width >= MIN_WIDTH).sort((a, b) => b.width - a.width);
  return big[0];
}

/*
 * THE RELEVANCE GATE, PORTED FROM pickBest — DO NOT DROP IT AGAIN.
 *
 * The first version of this file took the first hit that had a landscape file
 * and skipped matching entirely, on the assumption that Pixabay's own ranking
 * was good enough. It is not. "plumber pipes working" returned a clip tagged
 * keyboard/mouse/typing, and "work van street" returned a couple walking. Both
 * passed every other check and would have gone straight into the timeline.
 *
 * lib/pixabay.js already carries the fix and the scar tissue behind it: match
 * WHOLE tag words (so "man" does not hide inside "germany"), drop words that
 * carry no visual meaning, and require a majority of what is left to land.
 */
const GENERIC = new Set(["man", "men", "woman", "women", "person", "people", "guy", "human",
                         "with", "and", "the", "for", "from", "your", "his", "her", "one",
                         "working", "work", "office", "business"]);

function relevance(hit, query) {
  const want = String(query).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
    .filter((w) => w.length > 2 && !GENERIC.has(w));
  if (!want.length) return { ok: true, matched: 0, want: 0 };
  const tagWords = new Set(
    String(hit.tags ?? "").toLowerCase().split(/[,\s]+/).map((t) => t.trim()).filter(Boolean)
  );
  const matched = want.filter((w) => tagWords.has(w)).length;
  return { ok: matched >= Math.max(1, Math.ceil(want.length * 0.6)), matched, want: want.length };
}

/*
 * ONE HIT MAY ONLY BE USED ONCE ACROSS THE WHOLE CUT.
 *
 * Two different queries can resolve to the same Pixabay clip, and nothing about
 * that looks wrong at any step: both searches succeed, both pass the relevance
 * gate, both download, and the manifest lists two entries. It happened on the
 * first run of the extended list — "laptop screen software" (beat 5) and
 * "spreadsheet screen data" (beat 7) both returned id 41263, and the two files
 * were byte-identical. In the finished video that is the same footage playing
 * twice, forty seconds apart, which reads as a mistake to the viewer and is
 * invisible to every check up to that point.
 *
 * Caught only by comparing ids in the output filenames after the fact. The set
 * below makes it structural instead of something to remember.
 */
const usedIds = new Set();

async function pickLandscape(query, seconds) {
  const hits = await searchVideos(query, { perPage: 20 });
  for (const [position, hit] of (hits ?? []).entries()) {
    if (usedIds.has(hit.id)) continue;
    if ((hit.duration ?? 0) < seconds + 0.5) continue;
    const rel = relevance(hit, query);
    if (!rel.ok) continue;
    const file = widestLandscape(hit);
    if (!file) continue;
    return { hit, file, position, query, rel };
  }
  return null;
}

async function download(pick, slug, beat) {
  const name = `beat${beat}-${slug}-${pick.hit.id}-${pick.file.width}x${pick.file.height}.mp4`;
  const out = path.join(OUT, name);
  if (fs.existsSync(out)) return { out, cached: true };
  const res = await fetch(pick.file.url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  return { out, cached: false };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = [];
  let bytes = 0;

  for (const b of BEATS) {
    let pick = null;
    for (const q of b.queries) {
      pick = await pickLandscape(q, b.seconds);
      if (pick) break;
    }
    if (!pick) {
      console.log(`beat ${b.beat} ${b.slug.padEnd(10)} NO LANDSCAPE HIT (tried: ${b.queries.join(" | ")})`);
      continue;
    }
    usedIds.add(pick.hit.id);

    const line = `beat ${b.beat} ${b.slug.padEnd(10)} ${String(pick.file.width).padStart(4)}x${pick.file.height} ` +
      `${String(pick.hit.duration).padStart(3)}s  ${pick.rel.matched}/${pick.rel.want} match  "${pick.query}"  tags: ${String(pick.hit.tags).slice(0, 44)}`;

    if (DRY) { console.log(line); continue; }

    const { out, cached } = await download(pick, b.slug, b.beat);
    const size = fs.statSync(out).size;
    bytes += size;
    console.log(`${line}  -> ${path.basename(out)} (${(size / 1e6).toFixed(1)}MB${cached ? ", cached" : ""})`);

    manifest.push({
      beat: b.beat, slug: b.slug, holdSeconds: b.seconds,
      pixabayId: pick.hit.id, query: pick.query, tags: pick.hit.tags,
      resolution: `${pick.file.width}x${pick.file.height}`,
      durationSecs: pick.hit.duration,
      pageUrl: pick.hit.pageURL, file: path.basename(out),
      licence: "Pixabay Content License — https://pixabay.com/service/license-summary/",
    });
  }

  if (!DRY) {
    fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
    console.log(`\n${manifest.length} clips, ${(bytes / 1e6).toFixed(1)}MB total -> ${OUT}`);
  }
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
