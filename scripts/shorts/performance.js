#!/usr/bin/env node
/**
 * How the published Shorts are actually doing.
 *
 * WHAT MAKES THIS DIFFERENT FROM THE CHANNEL DASHBOARD. It joins YouTube's
 * numbers back to the CARD that produced them — the figure, the question, the
 * data source. "This one did 4x the others" is only useful if you can see that
 * the good one led with a dollar amount and the bad one led with a percentage.
 * Studio cannot tell you that; nothing else holds both halves.
 *
 * TWO APIS, AND THEY ANSWER DIFFERENT QUESTIONS:
 *   Data API      videos.list — lifetime views, likes, comments. Simple totals.
 *   Analytics API averageViewPercentage and traffic source. How much of the
 *                 Short people actually watched, and how they found it.
 *
 * RETENTION IS THE NUMBER THAT MATTERS ON THIS SURFACE. Views on a Short are
 * largely a function of what the feed decided to do; average view percentage is
 * a function of whether the card was worth watching. A Short with fewer views
 * and higher retention is the better card, and optimising for views alone will
 * walk you straight into clickbait that nobody finishes.
 *
 * ANALYTICS LAGS. YouTube's figures settle over roughly 48 hours, and a Short
 * published today will read low and wrong. Anything under two days old is
 * flagged rather than silently averaged in.
 *
 * Usage:
 *   node scripts/shorts/performance.js
 *   node scripts/shorts/performance.js --days 28
 *   node scripts/shorts/performance.js --json
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env.local") });
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const argv = process.argv.slice(2);
const AS_JSON = argv.includes("--json");
const DAYS = Number((argv.indexOf("--days") >= 0 && argv[argv.indexOf("--days") + 1]) || 90);

/** Below this many days old, YouTube's numbers are not settled. */
const SETTLE_DAYS = 2;

async function accessToken() {
  const e = process.env;
  const body = new URLSearchParams({
    client_id: e.YOUTUBE_CLIENT_ID,
    client_secret: e.YOUTUBE_CLIENT_SECRET,
    refresh_token: e.YOUTUBE_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body });
  const j = await r.json();
  if (!j.access_token) throw new Error(`token refresh failed: ${JSON.stringify(j).slice(0, 200)}`);
  return j.access_token;
}

const iso = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  /**
   * READS publisher_queue, NOT shorts_queue.
   *
   * shorts_queue was the first version of this pipeline and is now orphaned —
   * three videos were published through it before the content publisher
   * replaced it. This tool pointed at that table and therefore reported on a
   * frozen set of three while being blind to everything the live system posts.
   * A report that is confidently about the wrong table is worse than no report.
   *
   * 'partial' counts as published: it means one platform took it and the other
   * did not, and the YouTube half still has numbers worth reading.
   */
  const { data: rows, error } = await db
    .from("publisher_queue")
    .select("item_key, title, stat, label, question, youtube_id, instagram_media_id, published_at, position, status")
    .in("status", ["published", "partial"])
    .not("youtube_id", "is", null);

  if (error) throw new Error(`queue read failed: ${error.message}`);
  if (!rows || !rows.length) {
    console.log(`\n  No published Shorts in the publisher queue yet.`);
    console.log(`  Note: three early Shorts live in the orphaned shorts_queue table and are not counted here.\n`);
    return;
  }

  const token = await accessToken();
  const ids = rows.map((r) => r.youtube_id);

  // Lifetime totals.
  const vRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${ids.join(",")}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const vJson = await vRes.json();
  const stats = new Map((vJson.items || []).map((v) => [v.id, v]));

  // Retention, per video.
  const aRes = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?` +
      new URLSearchParams({
        ids: "channel==MINE",
        startDate: iso(DAYS),
        endDate: iso(0),
        metrics: "views,averageViewPercentage,likes,comments",
        dimensions: "video",
        filters: `video==${ids.join(",")}`,
        maxResults: "50",
      }),
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const aJson = await aRes.json();
  const retention = new Map(
    (aJson.rows || []).map((r) => [r[0], { views: r[1], avgPct: r[2], likes: r[3], comments: r[4] }])
  );

  const out = rows.map((r) => {
    const v = stats.get(r.youtube_id);
    const a = retention.get(r.youtube_id) || {};
    const ageDays = r.published_at ? (Date.now() - new Date(r.published_at).getTime()) / 86400000 : 0;
    return {
      cardKey: r.item_key,
      title: r.title,
      stat: r.stat,
      question: r.question,
      youtubeId: r.youtube_id,
      onInstagram: !!r.instagram_media_id,
      publishedAt: r.published_at,
      ageDays: Number(ageDays.toFixed(1)),
      settled: ageDays >= SETTLE_DAYS,
      views: Number(v?.statistics?.viewCount || a.views || 0),
      likes: Number(v?.statistics?.likeCount || 0),
      comments: Number(v?.statistics?.commentCount || 0),
      avgViewPct: a.avgPct != null ? Number(a.avgPct.toFixed(1)) : null,
    };
  });

  if (AS_JSON) { console.log(JSON.stringify(out, null, 2)); return; }

  out.sort((a, b) => b.views - a.views);

  console.log(`\n  ${out.length} published Short(s), last ${DAYS} days\n`);
  console.log(`  VIEWS  LIKES  COMM   WATCHED   CARD`);
  console.log(`  ${"-".repeat(72)}`);
  for (const s of out) {
    console.log(
      `  ${String(s.views).padStart(5)}  ${String(s.likes).padStart(5)}  ${String(s.comments).padStart(4)}   ` +
      `${(s.avgViewPct != null ? s.avgViewPct + "%" : "—").padStart(7)}   ${s.cardKey}${s.settled ? "" : "  (too new to read)"}`
    );
  }

  const settled = out.filter((s) => s.settled);
  if (settled.length >= 2) {
    const best = settled.reduce((a, b) => (b.views > a.views ? b : a));
    const worst = settled.reduce((a, b) => (b.views < a.views ? b : a));
    console.log(`\n  Best:  ${best.cardKey}  ${best.views} views, ${best.avgViewPct ?? "—"}% watched`);
    console.log(`         stat led with: "${best.stat}"`);
    console.log(`  Worst: ${worst.cardKey}  ${worst.views} views, ${worst.avgViewPct ?? "—"}% watched`);
    console.log(`         stat led with: "${worst.stat}"`);
    console.log(`\n  Comments are the signal to watch — the question is what they respond to.`);
  } else {
    console.log(`\n  Not enough settled data yet to compare cards. Needs at least 2 Shorts older than ${SETTLE_DAYS} days.`);
  }
  console.log("");
}

if (require.main === module) main().catch((e) => { console.error(`\n  ${e.message}\n`); process.exit(1); });
