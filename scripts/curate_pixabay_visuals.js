#!/usr/bin/env node
/**
 * Curates loopable "oddly satisfying" background footage from Pixabay, for use
 * behind an audio podcast.
 *
 * WHAT THIS CAN AND CANNOT JUDGE, because the difference matters before anyone
 * trusts the shortlist:
 *
 *   IT CAN filter on metadata — duration, resolution, Pixabay's own isGRated /
 *   isLowQuality / isAiGenerated flags, and how many people downloaded a clip.
 *
 *   IT CANNOT WATCH THE VIDEO. Whether footage is actually satisfying, whether
 *   it loops without a visible seam, and whether it has burned-in text or a
 *   distracting cut are all things only a person looking at it can answer. So
 *   this produces a SHORTLIST TO REVIEW, not a playlist to publish.
 *
 * WHY DURATION IS THE PRIMARY SORT. Behind an hour of audio, a 5-second clip
 * loops 720 times and every seam is noticed; a 25-second clip loops 144 times
 * and mostly is not. Resolution matters less than people assume — almost
 * everything on Pixabay is 1920x1080 — so length is the scarce quality.
 *
 * AI-GENERATED CLIPS ARE FLAGGED, NOT DROPPED. A lot of the "satisfying" genre
 * on stock sites is synthetic, and it often looks it: melting geometry, objects
 * that do not obey physics. For a brand that publishes licensing facts, footage
 * that reads as AI slop is a credibility cost that has nothing to do with the
 * licence. Flagged so it is a choice rather than an accident; --no-ai excludes.
 *
 * Usage:
 *   node scripts/curate_pixabay_visuals.js                 # shortlist
 *   node scripts/curate_pixabay_visuals.js --no-ai         # exclude AI-generated
 *   node scripts/curate_pixabay_visuals.js --download 8    # fetch the top N
 */

const fs = require("fs");
const path = require("path");

const KEY = (() => {
  const envPath = path.join(__dirname, "..", ".env.local");
  const m = fs.existsSync(envPath) && fs.readFileSync(envPath, "utf8").match(/^PIXABAY_API_KEY=(.*)$/m);
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : process.env.PIXABAY_API_KEY;
})();

const OUT_DIR = path.join(__dirname, "..", "reference", "Podcast Visuals");
const DELAY_MS = 400;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The searches, chosen for the genre rather than the word.
 *
 * "asmr" alone returns people whispering into microphones, which is the audio
 * genre and the opposite of what a silent background needs. The useful queries
 * name the PHENOMENON — flowing ink, kinetic sand, ferrofluid — because that is
 * how the footage is tagged.
 */
const QUERIES = [
  "satisfying loop", "ink water", "fluid art", "kinetic sand", "ferrofluid",
  "paint mixing", "slow motion liquid", "abstract loop", "macro bubbles",
  "honey pouring", "liquid marble", "oil water macro", "smoke abstract",
  "gradient loop", "particles flow", "sand falling", "soap film", "wax melting",
];

const MIN_DURATION = 8;      // below this the loop seam is unavoidable
const MIN_WIDTH = 1920;

async function search(q) {
  const url = `https://pixabay.com/api/videos/?key=${KEY}&q=${encodeURIComponent(q)}&per_page=50&safesearch=true&order=popular`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.hits || []).map((h) => ({ ...h, _query: q }));
  } catch {
    return [];
  }
}

/**
 * Suitability for a long audio bed, 0-100.
 *
 * Duration dominates deliberately — see the header. Downloads act as a crude
 * proxy for "other people found this usable", which is weak evidence but the
 * only quality signal the API offers.
 */
function score(v) {
  const large = v.videos.large || v.videos.medium;
  const durationScore = Math.min(v.duration / 30, 1) * 55;
  const resScore = large.width >= 3840 ? 20 : large.width >= 1920 ? 15 : 5;
  const popularity = Math.min(Math.log10((v.downloads || 0) + 1) / 5, 1) * 20;
  const aiPenalty = v.isAiGenerated ? -12 : 0;
  const qualityPenalty = v.isLowQuality ? -25 : 0;
  return Math.round(durationScore + resScore + popularity + aiPenalty + qualityPenalty);
}

async function main() {
  if (!KEY) { console.error("PIXABAY_API_KEY not found in .env.local"); process.exit(1); }
  const noAi = process.argv.includes("--no-ai");
  const dlIdx = process.argv.indexOf("--download");
  const downloadCount = dlIdx !== -1 ? parseInt(process.argv[dlIdx + 1], 10) || 0 : 0;

  const byId = new Map();
  for (const q of QUERIES) {
    const hits = await search(q);
    for (const h of hits) if (!byId.has(h.id)) byId.set(h.id, h);
    await sleep(DELAY_MS);
    process.stdout.write(`  ${q.padEnd(22)} ${String(hits.length).padStart(3)} hits   (unique so far: ${byId.size})\n`);
  }

  const all = [...byId.values()];
  const eligible = all.filter((v) => {
    const large = v.videos.large || v.videos.medium;
    if (!large) return false;
    if (v.duration < MIN_DURATION) return false;
    if (large.width < MIN_WIDTH) return false;
    if (v.isLowQuality) return false;
    if (v.isGRated === false) return false;
    if (noAi && v.isAiGenerated) return false;
    return true;
  });

  const ranked = eligible
    .map((v) => ({ v, s: score(v) }))
    .sort((a, b) => b.s - a.s)
    .map(({ v, s }) => {
      const large = v.videos.large || v.videos.medium;
      return {
        id: v.id,
        score: s,
        duration: v.duration,
        resolution: `${large.width}x${large.height}`,
        aiGenerated: !!v.isAiGenerated,
        tags: v.tags,
        downloads: v.downloads,
        matchedQuery: v._query,
        pageURL: v.pageURL,
        fileURL: large.url,
        credit: `${v.user} on Pixabay`,
      };
    });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = {
    generatedAt: new Date().toISOString().slice(0, 10),
    queries: QUERIES,
    filters: { minDuration: MIN_DURATION, minWidth: MIN_WIDTH, excludeAiGenerated: noAi },
    reviewRequired:
      "Metadata filtering only. Nothing here has been watched — loop quality, burned-in text and " +
      "whether a clip is actually satisfying can only be judged by looking at it.",
    totalFound: all.length,
    eligible: ranked.length,
    clips: ranked,
  };
  fs.writeFileSync(path.join(OUT_DIR, "_shortlist.json"), JSON.stringify(manifest, null, 2) + "\n");

  console.log(`\n${all.length} unique clips found, ${ranked.length} pass the filters.\n`);
  console.log("RANK  SCORE  DUR   RES         AI   DOWNLOADS  TAGS");
  console.log("-".repeat(96));
  for (const [i, c] of ranked.slice(0, 20).entries()) {
    console.log(
      String(i + 1).padStart(4) + "  " +
      String(c.score).padStart(5) + "  " +
      (c.duration + "s").padStart(4) + "  " +
      c.resolution.padEnd(11) + " " +
      (c.aiGenerated ? "yes " : "no  ") + " " +
      String(c.downloads).padStart(9) + "  " +
      c.tags.slice(0, 46)
    );
  }

  if (downloadCount > 0) {
    console.log(`\nDownloading top ${downloadCount}...`);
    for (const c of ranked.slice(0, downloadCount)) {
      const file = path.join(OUT_DIR, `pixabay-${c.id}-${c.duration}s.mp4`);
      if (fs.existsSync(file)) continue;
      try {
        const res = await fetch(c.fileURL, { signal: AbortSignal.timeout(120000) });
        if (!res.ok) { console.log(`  ${res.status} ${c.id}`); continue; }
        fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
        console.log(`  saved ${path.basename(file)}  (${c.duration}s, ${c.resolution}, ${c.credit})`);
      } catch (e) {
        console.log(`  failed ${c.id}: ${e.message}`);
      }
      await sleep(DELAY_MS);
    }
  }

  console.log(`\nShortlist written to reference/Podcast Visuals/_shortlist.json`);
}

if (require.main === module) main();
