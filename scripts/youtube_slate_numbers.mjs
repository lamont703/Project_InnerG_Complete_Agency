#!/usr/bin/env node
/**
 * Every figure "The Distribution Slate" video 01 puts on screen, for one FIXED
 * window.
 *
 *   node --experimental-strip-types --import ./scripts/_alias-loader.mjs \
 *     scripts/youtube_slate_numbers.mjs --start=2026-06-16 --end=2026-09-13
 *
 * RUN IT THE MORNING YOU FILM, AND PUT THE WINDOW ON SCREEN. Every number here
 * is a 90-day rolling figure, so the whole set moves every day — between the
 * slate being written on 13 Sep and the next morning, views moved 2,505,225 ->
 * 2,683,370 and the median moved 69 -> 80.5. A number filmed on one day and
 * published two weeks later cannot be reproduced by the audience OR by us,
 * which is fatal in a video whose entire pitch is that the receipts are real.
 * Fixed --start and --end, stated on camera, is the whole fix.
 *
 * THE VIEW FLOOR IS THE POINT OF THE CONVERTER SECTION. Ranked by raw subs per
 * thousand views, the top of this channel is 1- and 2-subscriber videos —
 * 3.95/1k reads as a 7x finding and is one person. The slate's "best converter"
 * claim is built on two. So the rate table refuses to report anything under
 * --floor (default 50 subscribers, not views), and the honest comparison it
 * prints instead is between the two videos whose sample nobody can dismiss.
 *
 * SUBSCRIBERS LOST IS REPORTED BECAUSE STUDIO LEADS WITH GAINED. Net is the
 * number that describes the channel, and it is roughly 12% lower here.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { youtubeAccessToken } from "@/lib/youtube-publish";

const arg = (n, d) => {
  const m = process.argv.find((a) => a.startsWith(`--${n}=`));
  return m ? m.split("=").slice(1).join("=") : d;
};
const iso = (d) => d.toISOString().slice(0, 10);
const END = arg("end", iso(new Date(Date.now() - 2 * 864e5)));
const START = arg("start", iso(new Date(new Date(END).getTime() - 89 * 864e5)));
const FLOOR = Number(arg("floor", 50));   // minimum SUBSCRIBERS to be quotable

const auth = { Authorization: `Bearer ${await youtubeAccessToken()}` };
const analytics = async (metrics, extra = "") => {
  const u = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE`
    + `&startDate=${START}&endDate=${END}&metrics=${metrics}${extra}`;
  const j = await (await fetch(u, { headers: auth })).json();
  if (j.error) { console.error(`API: ${j.error.message}`); process.exit(1); }
  return j;
};
const n = (x) => Number(x).toLocaleString();
const head = (s) => console.log(`\n${"=".repeat(64)}\n  ${s}\n${"=".repeat(64)}`);

console.log(`\n  WINDOW  ${START} -> ${END}   <- this goes on screen, every frame`);

/* ---- SHOT 2 + 4: the channel totals ---- */
const core = (await analytics("views,subscribersGained,subscribersLost,estimatedMinutesWatched")).rows[0];
const [views, gained, lost, mins] = core;

const per = await analytics("views,subscribersGained", "&dimensions=video&sort=-views&maxResults=200");
const rows = (per.rows ?? []).map(([id, v, s]) => ({ id, v, s }));
const ids = rows.map((r) => r.id);
const titles = {};
for (let i = 0; i < ids.length; i += 50) {
  const j = await (await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${ids.slice(i, i + 50).join(",")}`,
    { headers: auth })).json();
  for (const v of j.items ?? []) {
    const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(v.contentDetails.duration) || [];
    titles[v.id] = { t: v.snippet.title, secs: (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) };
  }
}
const T = (id) => titles[id]?.t ?? id;

const sorted = [...rows].sort((a, b) => a.v - b.v);
const mid = sorted.length % 2
  ? sorted[sorted.length >> 1].v
  : (sorted[sorted.length / 2 - 1].v + sorted[sorted.length / 2].v) / 2;
const totalViews = rows.reduce((s, r) => s + r.v, 0);

head("SHOT 2 — THE MEDIAN  (Studio > Content > sort by Views > middle row)");
console.log(`  videos with views in window   ${rows.length}`);
console.log(`  middle row                    #${Math.ceil(rows.length / 2)}`);
console.log(`  MEDIAN VIEWS PER VIDEO        ${mid}`);
console.log(`  row 1 (top)                   ${n(rows[0].v)}  "${T(rows[0].id).slice(0, 46)}"`);
console.log(`  top vs median                 ${Math.round(rows[0].v / mid).toLocaleString()}x`);
const under = (k) => rows.filter((r) => r.v < k).length;
console.log(`  under 100 views               ${under(100)} of ${rows.length}  (${(under(100) / rows.length * 100).toFixed(0)}%)`);
console.log(`  under 1,000 views             ${under(1000)} of ${rows.length}  (${(under(1000) / rows.length * 100).toFixed(0)}%)`);

head("SHOT 3 — CONCENTRATION  (export > Sheets > =SUM(top2)/SUM(all))");
const top2 = rows[0].v + rows[1].v;
console.log(`  #1  ${n(rows[0].v).padStart(10)}  "${T(rows[0].id).slice(0, 44)}"`);
console.log(`  #2  ${n(rows[1].v).padStart(10)}  "${T(rows[1].id).slice(0, 44)}"`);
console.log(`  sum of all 200                ${n(totalViews)}`);
console.log(`  TOP 2 SHARE                   ${(top2 / totalViews * 100).toFixed(1)}%`);
console.log(`  remaining ${rows.length - 2} share            ${((1 - top2 / totalViews) * 100).toFixed(1)}%`);

head("SHOT 4 — CONVERSION, AND THE NUMBER STUDIO BURIES");
console.log(`  views                         ${n(views)}`);
console.log(`  subscribers GAINED            ${n(gained)}      <- what Studio shows first`);
console.log(`  subscribers LOST              ${n(lost)}        <- go and find this one`);
console.log(`  NET                           ${n(gained - lost)}`);
console.log(`  conversion (gained/views)     ${(gained / views * 100).toFixed(3)}%`);
console.log(`  conversion (NET/views)        ${((gained - lost) / views * 100).toFixed(3)}%`);
console.log(`  subs per 1,000 views (net)    ${((gained - lost) / views * 1000).toFixed(2)}`);
console.log(`  watch time (minutes)          ${n(mins)}`);

head(`SHOT 5 — THE COMPARISON THAT HOLDS UP  (min ${FLOOR} subscribers)`);
const rate = (r) => r.s / r.v * 1000;
const quotable = rows.filter((r) => r.s >= FLOOR).sort((a, b) => rate(b) - rate(a));
const flagship = rows[0];
console.log(`  videos clearing the ${FLOOR}-subscriber floor: ${quotable.length}`);
for (const r of quotable.slice(0, 5)) {
  console.log(`    ${rate(r).toFixed(2).padStart(5)}/1k  ${n(r.v).padStart(10)}v  ${String(r.s).padStart(4)} subs  "${T(r.id).slice(0, 40)}"`);
}
const best = quotable.find((r) => r.id !== flagship.id);
if (best) {
  console.log(`\n  ON SCREEN, SIDE BY SIDE:`);
  console.log(`    reach:    ${n(flagship.v).padStart(10)} views -> ${String(flagship.s).padStart(4)} subs  =  ${rate(flagship).toFixed(2)}/1k`);
  console.log(`    intent:   ${n(best.v).padStart(10)} views -> ${String(best.s).padStart(4)} subs  =  ${rate(best).toFixed(2)}/1k`);
  console.log(`    ${(best.v / flagship.v * 100).toFixed(0)}% of the reach, ${(best.s / flagship.s * 100).toFixed(0)}% of the subscribers, ${(rate(best) / rate(flagship)).toFixed(1)}x the rate`);
  console.log(`\n  counterfactual: at ${rate(best).toFixed(2)}/1k the flagship makes ${n(Math.round(flagship.v * rate(best) / 1000))} subs.`);
  console.log(`  It made ${flagship.s}. Gap: ${n(Math.round(flagship.v * rate(best) / 1000) - flagship.s)}.`);
}

/* The claim the slate makes that this floor exists to stop. */
head("DO NOT PUT THESE ON SCREEN — the slate's rate claims are noise");
const noisy = rows.filter((r) => r.v >= 100 && r.s > 0 && r.s < FLOOR).sort((a, b) => rate(b) - rate(a));
for (const r of noisy.slice(0, 4)) {
  console.log(`    ${rate(r).toFixed(2).padStart(5)}/1k looks like ${(rate(r) / rate(flagship)).toFixed(1)}x  — but it is ${r.s} subscriber${r.s === 1 ? "" : "s"} on ${n(r.v)} views`);
  console.log(`            "${T(r.id).slice(0, 52)}"`);
}
console.log("");
