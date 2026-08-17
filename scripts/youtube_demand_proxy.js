#!/usr/bin/env node
/**
 * READ-ONLY. Scores YouTube search terms on PROVEN DEMAND and WINNABILITY, by
 * looking at what already ranks for them.
 *
 * This is the second half of scripts/youtube_keyword_research.js. That script
 * returns autocomplete ORDER, which tells you a term exists and nothing about
 * whether it is worth making. This one answers the two questions that decide
 * it: do videos on this term actually get watched, and could ours be one of
 * them.
 *
 * STILL NOT VOLUME. Nothing here is a search-volume number, because no such
 * number is published — KeywordPlanNetwork has no YouTube value and the Data
 * API exposes no keyword metric. What this measures is VIEWS ON VIDEOS THAT
 * RANK, which is a consequence of demand, not demand itself. A term can be
 * searched often and show low views because nobody made anything good.
 *
 * DO NOT USE `totalResults` AS A DEMAND PROXY. It is the obvious-looking field
 * and it is a trap. Google documents it as "an approximation and may not
 * represent an exact value... the maximum value is 1,000,000". This script
 * never reads it. Homemade keyword tools that report a volume are usually
 * reporting this.
 *
 * THE METRIC THAT ACTUALLY DECIDES THINGS is views ÷ subscribers of the channel
 * that posted. A video with 200k views from a 3k-subscriber channel was carried
 * there by search and suggested, not by an existing audience — which means the
 * TERM did the work and a new entrant can do it too. The same 200k from a
 * 900k-subscriber channel proves only that the channel is big. Demand you can
 * see but cannot take is worth knowing about and not worth filming.
 *
 * AGE IS THE SECOND SIGNAL. Top results five years old mean the term is
 * underserved NOW even if it was well served once.
 *
 * ORDERING IS `viewCount`, DELIBERATELY, not `relevance`. The question is
 * "has anything on this term ever found an audience", not "what would a
 * searcher see today". Override with --order if you want the searcher's view.
 *
 * QUOTA IS THE BINDING CONSTRAINT AND IT IS SMALL. Verified against
 * developers.google.com/youtube/v3/determine_quota_cost on 2026-08-15:
 * search.list costs 1 unit in its OWN bucket, capped at 100 CALLS PER DAY, and
 * that bucket does not refill from the 10,000 general pool. videos.list and
 * channels.list cost 1 unit each against the separate 10,000, so enrichment is
 * effectively free and only DISTINCT TERMS bind. Consequences, all deliberate:
 *
 *   - Results are CACHED to disk and cached terms are skipped. Re-running is
 *     free. Use --refresh to force, knowing what it spends.
 *   - Default is 25 terms. Above 100 the script refuses rather than burning the
 *     day's allowance and failing halfway.
 *   - Near-duplicate terms are collapsed before spending anything, because
 *     "texas barber practical exam" and "barber practical exam texas" are one
 *     question and two calls.
 *
 * Usage:
 *   node scripts/youtube_demand_proxy.js                    # top 25 from keyword research
 *   node scripts/youtube_demand_proxy.js --limit 40
 *   node scripts/youtube_demand_proxy.js --term "barber practical exam kit list"
 *   node scripts/youtube_demand_proxy.js --recent 12        # only videos from last 12 months
 *   node scripts/youtube_demand_proxy.js --refresh          # ignore cache, respend quota
 *   node scripts/youtube_demand_proxy.js --json
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { internalEnv } = require("./_google_internal_oauth");

const env = internalEnv();
/** Same precedence as youtube_channel_audit.js — see the note there. Change both together. */
const CLIENT_ID =
  env.YOUTUBE_CLIENT_ID || env.GOOGLE_INTERNAL_CLIENT_ID || env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET =
  env.YOUTUBE_CLIENT_SECRET || env.GOOGLE_INTERNAL_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN =
  env.YOUTUBE_REFRESH_TOKEN || env.GOOGLE_YOUTUBE_REFRESH_TOKEN || env.YT_REFRESH_TOKEN;

const DIR = path.join(__dirname, "..", "reference", "Keyword Research");
const SUGGESTIONS = path.join(DIR, "youtube-suggestions.json");
const OUT = path.join(DIR, "youtube-demand-proxy.json");

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};
const AS_JSON = argv.includes("--json");
const REFRESH = argv.includes("--refresh");
const LIMIT = Number(flag("limit", 25));
const ORDER = flag("order", "viewCount");
const RECENT_MONTHS = flag("recent", null) ? Number(flag("recent", null)) : null;
const PER_TERM = 25; // results pulled per term; 50 is the API max but 25 is plenty to characterise

/** Google's hard ceiling on the search bucket. Not ours to raise. */
const SEARCH_CALLS_PER_DAY = 100;

const TERMS = argv.reduce((acc, a, i) => {
  if (a === "--term" && argv[i + 1]) acc.push(argv[i + 1]);
  return acc;
}, []);

/**
 * Collapse near-duplicates BEFORE spending quota. Word-set equality, so
 * "texas barber practical exam" and "barber practical exam texas" are one
 * term. The longest surviving spelling is kept because it is the one most
 * likely to read as a real phrase in a title.
 */
function dedupe(terms) {
  const byKey = new Map();
  for (const t of terms) {
    const key = t.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter(Boolean).sort().join(" ");
    const prev = byKey.get(key);
    if (!prev || t.length > prev.length) byKey.set(key, t);
  }
  return [...byKey.values()];
}

/**
 * RELEVANCE GATE. Added after the first run, which is the run that proved it
 * was needed: `order=viewCount` sorts by views across everything YouTube thinks
 * matches, and what it thinks matches is loose. "barber exam" returned a 126M-view
 * ASMR massage video; "barber license test" returned a Canadian hockey clip
 * (#pavelbarber) and a CRPF bugler trade test; "cosmetology school for beginners"
 * returned a 28M-view box-braids tutorial. Those numbers are real and they are
 * measuring the wrong thing — a median computed over them describes YouTube's
 * matching behaviour, not demand for the term.
 *
 * TWO CONDITIONS, both required, because either alone lets the false positives
 * through:
 *
 *   1. A TRADE word, matched on WORD BOUNDARIES. The boundary is doing real
 *      work: bare substring matching accepted "#pavelbarber" as a barber video.
 *   2. An INTENT word, but only when the query itself is about exams, licensing
 *      or school. "barber exam" is a question about an exam; a haircut video
 *      that merely says "barber" does not answer it. For a query with no such
 *      intent, condition 2 is skipped rather than invented.
 *
 * Deliberately narrower than the NICHE list in youtube_niche_triage.js. That
 * list classifies OUR OWN videos and counts business, wellness and fitness as
 * on-niche by the owner's decision. Reusing it here would readmit the gym and
 * hustle content this gate exists to exclude.
 */
const TRADE = [
  "barber", "barbers", "barbershop", "barbering", "cosmetology", "cosmetologist",
  "cosmetologists", "salon", "stylist", "hairstylist", "haircut", "haircuts",
  "fade", "taper", "clipper", "clippers", "shears", "razor", "mannequin",
  "esthetician", "esthetics", "manicurist", "nail tech", "beauty school",
  "braids", "braiding", "weave", "relaxer", "perm", "shampoo", "sanitation",
  "infection control", "sterilization", "barbicide",
];

const INTENT = [
  "exam", "exams", "state board", "stateboard", "license", "licence", "licensed",
  "licensing", "licensure", "practical", "written test", "study guide", "studying",
  "practice test", "psi", "kit list", "proctor", "certification", "apprentice",
  "school", "theory", "test day", "pass", "passing", "requirements",
];

/** Word-boundary containment. Phrases with spaces are matched as phrases. */
const hasAny = (text, words) =>
  words.some((w) => new RegExp(`(^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i").test(text));

/** Does the QUERY ask about exams/licensing/school? If not, condition 2 is skipped. */
const queryHasIntent = (q) => hasAny(q, INTENT);

function isRelevant(video, term) {
  const text = [video.title, video.description, (video.tags || []).join(" ")].join(" ").toLowerCase();
  if (!hasAny(text, TRADE)) return false;
  if (queryHasIntent(term) && !hasAny(text, INTENT)) return false;
  return true;
}

/** ISO 8601 PT#H#M#S -> seconds. YouTube gives durations in no other form. */
function durationSeconds(iso) {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || "");
  if (!m) return 0;
  return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
}

const median = (nums) => {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
};

const monthsSince = (iso) =>
  Math.round((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24 * 30.44));

/**
 * The verdict. Stated as a rule rather than a score on purpose: a single
 * composite number would read as a measurement, and every input here is an
 * inference. Thresholds are OURS, not YouTube's, and are meant to be argued
 * with.
 */
function verdict(m) {
  const proven = m.medianViews >= 5000;
  const strongProven = m.medianViews >= 20000;
  const winnable = m.smallChannelShare >= 0.4 || m.medianViewsPerSub >= 2;
  const stale = m.medianAgeMonths >= 36;

  /**
   * Thin coverage is checked FIRST and reported as its own thing, because
   * "nobody has made this" and "nobody wants this" produce identical view
   * numbers and are opposite conclusions. If YouTube could only find a handful
   * of on-topic videos, the low median is a statement about supply.
   */
  if (m.resultCount < 5) {
    return { label: "UNSERVED?", why: `only ${m.resultCount} on-topic results exist — thin supply, not proven low demand` };
  }
  if (!proven) return { label: "THIN", why: "on-topic videos exist and none have found much of an audience" };
  if (strongProven && winnable) return { label: "STRONG", why: "proven appetite, and small channels are ranking" };
  if (proven && winnable && stale) return { label: "STRONG", why: "proven appetite, winnable, and the top results are old" };
  if (proven && winnable) return { label: "WORTH A LOOK", why: "real appetite and not locked up by big channels" };
  if (stale) return { label: "WORTH A LOOK", why: "big channels rank, but the material is stale" };
  return { label: "CROWDED", why: "demand is real but established channels own it" };
}

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.error("Missing YOUTUBE_CLIENT_ID / _SECRET / _REFRESH_TOKEN in .env.local");
    process.exit(1);
  }

  // ---- Choose terms -------------------------------------------------------
  let terms = TERMS;
  if (!terms.length) {
    if (!fs.existsSync(SUGGESTIONS)) {
      console.error(`No terms given and ${SUGGESTIONS} not found.\nRun: node scripts/youtube_keyword_research.js --deep`);
      process.exit(1);
    }
    const sugg = JSON.parse(fs.readFileSync(SUGGESTIONS, "utf8"));
    terms = sugg.terms.map((t) => t.term);
  }
  terms = dedupe(terms).slice(0, LIMIT);

  /**
   * CACHE KEY INCLUDES THE QUERY MODE, and must. Keyed on the term alone, a
   * `--recent 12` run silently returned the all-time results cached by an
   * earlier run — same term, completely different question, no error. A cache
   * that answers a question you did not ask is worse than no cache.
   */
  const modeKey = `${ORDER}::${RECENT_MONTHS || "all"}`;
  const ck = (t) => `${t}::${modeKey}`;
  const cache = fs.existsSync(OUT) && !REFRESH
    ? Object.fromEntries(
        (JSON.parse(fs.readFileSync(OUT, "utf8")).terms || [])
          .filter((t) => (t.mode || "viewCount::all") === modeKey)
          .map((t) => [ck(t.term), t])
      )
    : {};
  const todo = terms.filter((t) => !cache[ck(t)]);

  if (todo.length > SEARCH_CALLS_PER_DAY) {
    console.error(
      `Refusing: ${todo.length} uncached terms exceeds the ${SEARCH_CALLS_PER_DAY}/day search.list cap.\n` +
      `That bucket does not refill from the 10,000 general pool, so this would fail partway and cost the\n` +
      `whole day's allowance. Lower --limit, or run across several days (results cache).`
    );
    process.exit(1);
  }

  if (!AS_JSON) {
    console.log(`\n${terms.length} terms after dedupe · ${Object.keys(cache).length ? `${terms.length - todo.length} cached · ` : ""}${todo.length} to fetch`);
    console.log(`order=${ORDER}${RECENT_MONTHS ? ` · last ${RECENT_MONTHS} months only` : ""} · ~${todo.length} of today's ${SEARCH_CALLS_PER_DAY} search calls\n`);
  }

  // ---- Auth ---------------------------------------------------------------
  const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  auth.setCredentials({ refresh_token: REFRESH_TOKEN });
  const yt = google.youtube({ version: "v3", auth });

  const publishedAfter = RECENT_MONTHS
    ? new Date(Date.now() - RECENT_MONTHS * 30.44 * 86400000).toISOString()
    : undefined;

  const results = [];
  let searchCalls = 0;
  let generalUnits = 0;

  for (const term of terms) {
    if (cache[ck(term)]) { results.push(cache[ck(term)]); continue; }

    let ids = [];
    try {
      const s = await yt.search.list({
        part: "snippet", q: term, type: "video", order: ORDER,
        maxResults: PER_TERM, ...(publishedAfter ? { publishedAfter } : {}),
      });
      searchCalls++;
      ids = (s.data.items || []).map((i) => i.id?.videoId).filter(Boolean);
    } catch (e) {
      const msg = e?.errors?.[0]?.reason || e.message;
      console.error(`  ! ${term} — search failed: ${msg}`);
      if (/quota/i.test(msg)) {
        console.error(`\nSearch quota exhausted after ${searchCalls} calls. Partial results saved; re-run tomorrow.`);
        break;
      }
      continue;
    }

    if (!ids.length) {
      results.push({ term, resultCount: 0, verdict: { label: "THIN", why: "nothing ranks for this term" } });
      continue;
    }

    const v = await yt.videos.list({ part: "snippet,statistics,contentDetails", id: ids.join(",") });
    generalUnits++;
    const returned = (v.data.items || []).map((x) => ({
      id: x.id,
      title: x.snippet?.title || "",
      description: x.snippet?.description || "",
      tags: x.snippet?.tags || [],
      channelId: x.snippet?.channelId,
      channelTitle: x.snippet?.channelTitle || "",
      publishedAt: x.snippet?.publishedAt,
      views: Number(x.statistics?.viewCount || 0),
      seconds: durationSeconds(x.contentDetails?.duration),
    }));

    // Gate BEFORE any metric is computed. See the note on isRelevant().
    const vids = returned.filter((x) => isRelevant(x, term));

    if (!vids.length) {
      results.push({
        term, mode: modeKey, resultCount: 0, returnedCount: returned.length, matchRate: 0,
        verdict: { label: "UNSERVED?", why: `YouTube returned ${returned.length} results and none are on-topic` },
      });
      if (!AS_JSON) console.log(`  ${"UNSERVED?".padEnd(13)} ${term}`);
      continue;
    }

    // Subscriber counts, batched. Hidden counts become null, not 0 — a hidden
    // count is unknown, and treating it as zero would fake an infinite ratio.
    const chIds = [...new Set(vids.map((x) => x.channelId).filter(Boolean))];
    const subs = new Map();
    for (let i = 0; i < chIds.length; i += 50) {
      const c = await yt.channels.list({ part: "statistics", id: chIds.slice(i, i + 50).join(",") });
      generalUnits++;
      (c.data.items || []).forEach((ch) => {
        subs.set(ch.id, ch.statistics?.hiddenSubscriberCount ? null : Number(ch.statistics?.subscriberCount || 0));
      });
    }
    vids.forEach((x) => { x.subs = subs.has(x.channelId) ? subs.get(x.channelId) : null; });

    const views = vids.map((x) => x.views);
    const ratios = vids.filter((x) => x.subs && x.subs > 0).map((x) => x.views / x.subs);
    const known = vids.filter((x) => x.subs !== null);
    const m = {
      resultCount: vids.length,
      returnedCount: returned.length,
      /**
       * Share of what YouTube returned that is actually on-topic. This is a
       * FINDING, not bookkeeping: a low rate means YouTube cannot fill a page
       * for this query, which is what an underserved term looks like from the
       * outside.
       */
      matchRate: returned.length ? vids.length / returned.length : 0,
      medianViews: median(views),
      maxViews: Math.max(...views),
      medianAgeMonths: median(vids.map((x) => monthsSince(x.publishedAt))),
      // Share of ranking videos from channels under 50k subs — the "could this be us" number.
      smallChannelShare: known.length ? known.filter((x) => x.subs < 50000).length / known.length : 0,
      medianViewsPerSub: ratios.length ? Number(median(ratios.map((r) => r * 100)) / 100) : 0,
      shortsShare: vids.filter((x) => x.seconds > 0 && x.seconds <= 60).length / vids.length,
      medianSeconds: median(vids.map((x) => x.seconds)),
    };

    const top = [...vids].sort((a, b) => b.views - a.views).slice(0, 3)
      .map((x) => ({ title: x.title, views: x.views, subs: x.subs, ageMonths: monthsSince(x.publishedAt), url: `https://youtu.be/${x.id}` }));

    results.push({ term, mode: modeKey, ...m, verdict: verdict(m), top });
    if (!AS_JSON) console.log(`  ${verdict(m).label.padEnd(13)} ${term}`);
  }

  // ---- Write --------------------------------------------------------------
  fs.mkdirSync(DIR, { recursive: true });

  /**
   * Merge, do not overwrite. Results from OTHER query modes are still valid
   * answers to their own question, and clobbering them would silently throw
   * away quota already spent.
   */
  const kept = fs.existsSync(OUT)
    ? (JSON.parse(fs.readFileSync(OUT, "utf8")).terms || []).filter(
        (t) => (t.mode || "viewCount::all") !== modeKey || !results.some((r) => r.term === t.term)
      )
    : [];
  const RANK = { STRONG: 0, "WORTH A LOOK": 1, "UNSERVED?": 2, CROWDED: 3, THIN: 4 };
  results.sort((a, b) => (RANK[a.verdict.label] - RANK[b.verdict.label]) || (b.medianViews || 0) - (a.medianViews || 0));

  fs.writeFileSync(OUT, JSON.stringify({
    generatedAt: new Date().toISOString().slice(0, 10),
    method: "search.list (order=" + ORDER + ") + videos.list + channels.list",
    notAVolume:
      "No figure here is search volume. YouTube publishes none. These are views on videos that RANK, " +
      "which is a consequence of demand and not a measure of it. totalResults is deliberately never read — " +
      "Google documents it as an approximation capped at 1,000,000.",
    decidingMetric:
      "medianViewsPerSub — views divided by the posting channel's subscribers. Above ~2 means the TERM " +
      "carried the video rather than the channel's own audience, which is what makes it winnable.",
    thresholdsAreOurs: "STRONG / WORTH A LOOK / CROWDED / THIN come from thresholds in this script, not from YouTube.",
    order: ORDER, recentMonths: RECENT_MONTHS, perTerm: PER_TERM,
    quota: { searchCallsSpent: searchCalls, searchCallsPerDay: SEARCH_CALLS_PER_DAY, generalUnitsSpent: generalUnits },
    terms: [...results, ...kept],
  }, null, 2) + "\n");

  if (AS_JSON) { console.log(JSON.stringify(results, null, 2)); return; }

  console.log("\n" + "=".repeat(104));
  console.log("MED VIEWS   V/SUB  SMALL%  AGE(mo)  ONTOPIC  VERDICT        TERM");
  console.log("=".repeat(104));
  for (const r of results) {
    if (!r.resultCount) {
      console.log(`${"—".padStart(9)}  ${"".padStart(23)}${`0/${r.returnedCount || 0}`.padStart(7)}  ${r.verdict.label.padEnd(15)}${r.term}`);
      continue;
    }
    console.log(
      String(r.medianViews.toLocaleString()).padStart(9) + "  " +
      r.medianViewsPerSub.toFixed(1).padStart(6) + "  " +
      (Math.round(r.smallChannelShare * 100) + "%").padStart(6) + "  " +
      String(r.medianAgeMonths).padStart(7) + "  " +
      `${r.resultCount}/${r.returnedCount}`.padStart(7) + "  " +
      r.verdict.label.padEnd(15) + r.term
    );
  }
  console.log("\nONTOPIC = on-topic results ÷ results YouTube returned. A low ratio is a supply finding,");
  console.log("not noise: it means YouTube cannot fill a page with videos that answer this query.");

  const strong = results.filter((r) => r.verdict.label === "STRONG");
  if (strong.length) {
    console.log("\n" + "=".repeat(100));
    console.log("STRONG — proven appetite and reachable. Top performers, with the channel size that got them there:");
    console.log("=".repeat(100));
    for (const r of strong) {
      console.log(`\n${r.term}   (${r.verdict.why})`);
      for (const t of r.top) {
        console.log(`   ${String(t.views.toLocaleString()).padStart(9)} views  ${t.subs === null ? "hidden subs" : String(t.subs.toLocaleString()).padStart(8) + " subs"}  ${String(t.ageMonths).padStart(3)}mo  ${t.title.slice(0, 58)}`);
      }
    }
  }

  const unserved = results.filter((r) => r.verdict.label === "UNSERVED?");
  if (unserved.length) {
    console.log("\n" + "=".repeat(104));
    console.log("UNSERVED? — YouTube could not fill a page with on-topic results. Thin supply, NOT proven low demand.");
    console.log("Autocomplete surfaced these, so the phrasing is real. Verify by hand before filming.");
    console.log("=".repeat(104));
    for (const r of unserved) console.log(`   ${`${r.resultCount}/${r.returnedCount || 0}`.padStart(6)} on-topic   ${r.term}`);
  }

  console.log(`\nQuota: ${searchCalls} of ${SEARCH_CALLS_PER_DAY} daily search calls · ${generalUnits} of 10,000 general units`);
  console.log(`Written to reference/Keyword Research/youtube-demand-proxy.json`);
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
