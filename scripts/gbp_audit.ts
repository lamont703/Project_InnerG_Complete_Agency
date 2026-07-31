/**
 * Local SEO audit for one connected Google Business Profile location.
 *
 *   npx tsx scripts/gbp_audit.ts <locationId> [outfile.html]
 *
 * Read-only: every call is a GET. Nothing is written to Google, and nothing is
 * written to our database — this produces a report file and a console summary.
 *
 * The scoring lives in lib/gbp-audit.ts so it can be tested and later reused for
 * any connected location; this script is only the fetching and the rendering.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { writeFileSync } from "fs";
import {
  buildGbpAudit,
  splitKeywords,
  type AuditCheck,
  type SearchKeyword,
} from "../lib/gbp-audit";

config({ path: ".env.local" });

const LOCATION_ID = process.argv[2];
const OUTFILE = process.argv[3] || "gbp-audit.html";

if (!LOCATION_ID) {
  console.error("usage: npx tsx scripts/gbp_audit.ts <locationId> [outfile.html]");
  process.exit(1);
}
const LOCATION = LOCATION_ID.startsWith("locations/") ? LOCATION_ID : `locations/${LOCATION_ID}`;

const READ_MASK = [
  "name", "title", "categories", "profile", "regularHours", "specialHours", "moreHours",
  "openInfo", "serviceArea", "serviceItems", "storefrontAddress", "phoneNumbers",
  "websiteUri", "metadata",
].join(",");

const PERFORMANCE_METRICS = [
  "CALL_CLICKS", "WEBSITE_CLICKS", "BUSINESS_DIRECTION_REQUESTS",
  "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH", "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
  "BUSINESS_IMPRESSIONS_DESKTOP_MAPS", "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
];

async function main() {
  const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: conns } = await supa.from("gbp_connections").select("refresh_token, google_account_email").limit(1);
  if (!conns?.length) throw new Error("No gbp_connections row to authenticate with.");

  const tok = await (await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: (conns[0] as any).refresh_token,
      grant_type: "refresh_token",
    }),
  })).json();
  if (!tok.access_token) throw new Error("Token refresh failed: " + JSON.stringify(tok).slice(0, 200));
  const H = { Authorization: `Bearer ${tok.access_token}` };

  /** Every surface is optional — a disabled API or an empty resource degrades
   *  that check to "unavailable" rather than failing the whole report. */
  const get = async (url: string): Promise<any> => {
    try {
      const r = await fetch(url, { headers: H });
      if (!r.ok) {
        const b = await r.json().catch(() => ({}));
        console.warn(`  ! ${r.status} ${url.split("?")[0].split("/").slice(-2).join("/")} — ${(b.error?.message || "").slice(0, 90)}`);
        return null;
      }
      return await r.json();
    } catch (e: any) {
      console.warn(`  ! ${e.message}`);
      return null;
    }
  };

  console.log(`Auditing ${LOCATION} …`);

  const accounts = await get("https://mybusinessaccountmanagement.googleapis.com/v1/accounts");
  const account = accounts?.accounts?.[0]?.name;

  const location = await get(`https://mybusinessbusinessinformation.googleapis.com/v1/${LOCATION}?readMask=${encodeURIComponent(READ_MASK)}`);
  if (!location) throw new Error("Could not read the location — aborting.");

  const primaryCategoryName = location.categories?.primaryCategory?.name;

  const [attrsSet, attrsAvail, googleUpdated, verification, placeActions] = await Promise.all([
    get(`https://mybusinessbusinessinformation.googleapis.com/v1/${LOCATION}/attributes`),
    primaryCategoryName
      ? get(`https://mybusinessbusinessinformation.googleapis.com/v1/attributes?categoryName=${encodeURIComponent(primaryCategoryName)}&regionCode=US&languageCode=en`)
      : Promise.resolve(null),
    get(`https://mybusinessbusinessinformation.googleapis.com/v1/${LOCATION}:getGoogleUpdated?readMask=${encodeURIComponent("name,title,categories,profile,regularHours,storefrontAddress,phoneNumbers,websiteUri")}`),
    get(`https://mybusinessverifications.googleapis.com/v1/${LOCATION}/VoiceOfMerchantState`),
    get(`https://mybusinessplaceactions.googleapis.com/v1/${LOCATION}/placeActionLinks`),
  ]);

  // v4 (legacy) still owns photos, reviews and posts.
  const v4 = account ? `${account}/${LOCATION}` : null;
  const [media, reviews, posts] = v4
    ? await Promise.all([
        get(`https://mybusiness.googleapis.com/v4/${v4}/media?pageSize=100`),
        get(`https://mybusiness.googleapis.com/v4/${v4}/reviews?pageSize=50`),
        get(`https://mybusiness.googleapis.com/v4/${v4}/localPosts?pageSize=20`),
      ])
    : [null, null, null];

  // Trailing 30 days of performance, ending 3 days back for Google's lag.
  const end = new Date(Date.now() - 3 * 86_400_000);
  const start = new Date(end.getTime() - 29 * 86_400_000);
  const p = new URLSearchParams();
  for (const m of PERFORMANCE_METRICS) p.append("dailyMetrics", m);
  p.set("dailyRange.start_date.year", String(start.getUTCFullYear()));
  p.set("dailyRange.start_date.month", String(start.getUTCMonth() + 1));
  p.set("dailyRange.start_date.day", String(start.getUTCDate()));
  p.set("dailyRange.end_date.year", String(end.getUTCFullYear()));
  p.set("dailyRange.end_date.month", String(end.getUTCMonth() + 1));
  p.set("dailyRange.end_date.day", String(end.getUTCDate()));
  const perfRaw = await get(`https://businessprofileperformance.googleapis.com/v1/${LOCATION}:fetchMultiDailyMetricsTimeSeries?${p}`);

  const sumMetric = (name: string) => {
    const series = (perfRaw?.multiDailyMetricTimeSeries || [])
      .flatMap((x: any) => x.dailyMetricTimeSeries || [])
      .find((d: any) => d.dailyMetric === name);
    return (series?.timeSeries?.datedValues || []).reduce((s: number, v: any) => s + Number(v.value || 0), 0);
  };
  const impressions =
    sumMetric("BUSINESS_IMPRESSIONS_DESKTOP_SEARCH") + sumMetric("BUSINESS_IMPRESSIONS_MOBILE_SEARCH") +
    sumMetric("BUSINESS_IMPRESSIONS_DESKTOP_MAPS") + sumMetric("BUSINESS_IMPRESSIONS_MOBILE_MAPS");

  // Search keywords: the trailing 3 whole months.
  const kp = new URLSearchParams();
  const km = new Date(Date.now() - 35 * 86_400_000);
  const ks = new Date(km.getTime() - 60 * 86_400_000);
  kp.set("monthlyRange.start_month.year", String(ks.getUTCFullYear()));
  kp.set("monthlyRange.start_month.month", String(ks.getUTCMonth() + 1));
  kp.set("monthlyRange.end_month.year", String(km.getUTCFullYear()));
  kp.set("monthlyRange.end_month.month", String(km.getUTCMonth() + 1));
  const kwRaw = await get(`https://businessprofileperformance.googleapis.com/v1/${LOCATION}/searchkeywords/impressions/monthly?${kp}`);
  const searchKeywords: SearchKeyword[] = (kwRaw?.searchKeywordsCounts || []).map((r: any) => ({
    keyword: r.searchKeyword,
    value: r.insightsValue?.value != null ? Number(r.insightsValue.value) : null,
    threshold: r.insightsValue?.threshold != null ? Number(r.insightsValue.threshold) : null,
  }));

  const reviewList = reviews?.reviews || [];
  const report = buildGbpAudit({
    location,
    attributesSet: attrsSet?.attributes || [],
    attributesAvailable: attrsAvail?.attributeMetadata || [],
    photos: {
      count: media?.totalMediaItemCount ?? (media?.mediaItems || []).length,
      byCategory: (media?.mediaItems || []).reduce((acc: Record<string, number>, m: any) => {
        if ((m.mediaFormat ?? "PHOTO") !== "PHOTO") return acc;
        const c = m.locationAssociation?.category || "ADDITIONAL";
        acc[c] = (acc[c] || 0) + 1;
        return acc;
      }, {}),
    },
    reviews: {
      total: reviews?.totalReviewCount ?? reviewList.length,
      average: reviews?.averageRating ?? null,
      sampled: reviewList.length,
      unanswered: reviewList.filter((r: any) => !r.reviewReply).length,
    },
    posts: {
      count: (posts?.localPosts || []).length,
      latestIso: (posts?.localPosts || [])[0]?.createTime || null,
    },
    performance: perfRaw ? {
      impressions,
      callClicks: sumMetric("CALL_CLICKS"),
      websiteClicks: sumMetric("WEBSITE_CLICKS"),
      directionRequests: sumMetric("BUSINESS_DIRECTION_REQUESTS"),
      days: 30,
    } : null,
    searchKeywords,
    googleUpdated: { diffMask: googleUpdated?.diffMask || null },
    verification: verification ? {
      hasVoiceOfMerchant: verification.hasVoiceOfMerchant,
      hasBusinessAuthority: verification.hasBusinessAuthority,
    } : null,
    placeActions: placeActions?.placeActionLinks || [],
  });

  const perf = perfRaw ? {
    impressions,
    calls: sumMetric("CALL_CLICKS"),
    website: sumMetric("WEBSITE_CLICKS"),
    directions: sumMetric("BUSINESS_DIRECTION_REQUESTS"),
  } : null;

  // ── console summary ──
  console.log(`\n  ${location.title} — score ${report.score}/100 (${report.grade})`);
  for (const [area, v] of Object.entries(report.areas)) {
    console.log(`    ${area.padEnd(12)} ${Math.round(v.earned)}/${v.possible}`);
  }
  console.log("\n  Priorities:");
  for (const c of report.priorities.slice(0, 8)) {
    console.log(`    [${c.status.toUpperCase().padEnd(4)}] ${c.label} — ${c.detail}`);
  }
  if (perf) console.log(`\n  30d: ${perf.impressions} impressions · ${perf.calls} calls · ${perf.website} website · ${perf.directions} directions`);
  console.log(`  keywords: ${searchKeywords.length}`);

  writeFileSync(OUTFILE, renderHtml(location, report, perf, searchKeywords));
  console.log(`\n  report written to ${OUTFILE}`);
}

// ── report rendering ────────────────────────────────────────────────────────

const esc = (s: any) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

const STATUS_COLOR: Record<string, string> = {
  pass: "#059669", warn: "#d97706", fail: "#dc2626", info: "#64748b",
};

function renderHtml(
  location: any,
  report: ReturnType<typeof buildGbpAudit>,
  perf: { impressions: number; calls: number; website: number; directions: number } | null,
  keywords: SearchKeyword[]
) {
  const kw = splitKeywords(keywords, location.title || "");
  const actions = perf ? perf.calls + perf.website + perf.directions : 0;
  const actionRate = perf && perf.impressions > 0 ? ((actions / perf.impressions) * 100).toFixed(1) + "%" : "—";

  const checkRow = (c: AuditCheck) => `
    <tr>
      <td><span class="dot" style="background:${STATUS_COLOR[c.status]}"></span></td>
      <td><strong>${esc(c.label)}</strong><div class="muted">${esc(c.detail)}</div>
        ${c.fix ? `<div class="fix">→ ${esc(c.fix)}</div>` : ""}</td>
      <td class="num">${Math.round(c.earned)}/${c.weight}</td>
    </tr>`;

  const kwRow = (k: SearchKeyword) => `
    <tr><td>${esc(k.keyword)}</td><td class="num">${k.value != null ? k.value : `&lt;${k.threshold}`}</td></tr>`;

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Local SEO Audit — ${esc(location.title)}</title>
<style>
  *{box-sizing:border-box} body{margin:0;font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0f172a;background:#f8fafc}
  .wrap{max-width:860px;margin:0 auto;padding:40px 24px}
  h1{font-size:26px;margin:0 0 4px} h2{font-size:15px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin:36px 0 10px}
  .muted{color:#64748b;font-size:13px} .fix{color:#0f172a;background:#eff6ff;border-left:3px solid #3b82f6;padding:6px 10px;margin-top:6px;font-size:13px;border-radius:0 6px 6px 0}
  .score{display:flex;align-items:center;gap:24px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;margin-top:20px}
  .big{font-size:52px;font-weight:800;line-height:1} .grade{font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.1em}
  table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}
  td,th{padding:11px 14px;border-bottom:1px solid #f1f5f9;text-align:left;vertical-align:top}
  tr:last-child td{border-bottom:none} th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;background:#f8fafc}
  .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;color:#475569}
  .dot{display:inline-block;width:9px;height:9px;border-radius:50%}
  .tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-top:12px}
  .tile{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px}
  .tile .k{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;font-weight:700}
  .tile .v{font-size:22px;font-weight:800;margin-top:3px;font-variant-numeric:tabular-nums}
  .bar{height:7px;background:#f1f5f9;border-radius:4px;overflow:hidden;margin-top:5px}
  .bar>i{display:block;height:100%;background:#0f172a}
  .areas{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-top:14px}
  footer{margin-top:44px;padding-top:16px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px}
  @media(prefers-color-scheme:dark){body{background:#0b1220;color:#e2e8f0}.score,table,.tile{background:#111827;border-color:#1f2937}
    th{background:#0f172a;color:#94a3b8}td{border-color:#1f2937}.fix{background:#11223b;color:#dbeafe}.bar{background:#1f2937}.bar>i{background:#60a5fa}}
</style></head><body><div class="wrap">

<h1>Local SEO Audit</h1>
<div class="muted">${esc(location.title)} · ${esc(location.categories?.primaryCategory?.displayName || "no primary category")}
${location.storefrontAddress?.locality ? ` · ${esc(location.storefrontAddress.locality)}, ${esc(location.storefrontAddress.administrativeArea || "")}` : ""}</div>

<div class="score">
  <div><div class="big">${report.score}</div><div class="grade">Grade ${report.grade}</div></div>
  <div style="flex:1">
    <div class="areas">
      ${Object.entries(report.areas).map(([a, v]) => `
        <div><div class="muted"><strong>${a}</strong> ${Math.round(v.earned)}/${v.possible}</div>
        <div class="bar"><i style="width:${Math.round((v.earned / v.possible) * 100)}%"></i></div></div>`).join("")}
    </div>
  </div>
</div>

${perf ? `<h2>Last 30 days</h2>
<div class="tiles">
  <div class="tile"><div class="k">Impressions</div><div class="v">${perf.impressions.toLocaleString()}</div></div>
  <div class="tile"><div class="k">Calls</div><div class="v">${perf.calls.toLocaleString()}</div></div>
  <div class="tile"><div class="k">Website</div><div class="v">${perf.website.toLocaleString()}</div></div>
  <div class="tile"><div class="k">Directions</div><div class="v">${perf.directions.toLocaleString()}</div></div>
  <div class="tile"><div class="k">Action rate</div><div class="v">${actionRate}</div></div>
</div>
<div class="muted" style="margin-top:8px">Action rate is calls + website + directions divided by impressions — it separates “not being seen” from “being seen and not acted on”.</div>` : ""}

<h2>Priorities</h2>
${report.priorities.length ? `<table><tbody>${report.priorities.map(checkRow).join("")}</tbody></table>`
  : `<div class="muted">No gaps found.</div>`}

<h2>All checks</h2>
<table><thead><tr><th></th><th>Check</th><th class="num">Score</th></tr></thead>
<tbody>${report.checks.map(checkRow).join("")}</tbody></table>

<h2>How people find this listing</h2>
${keywords.length ? `
<div class="muted">${kw.discovery.length} discovery queries vs ${kw.branded.length} branded.
Branded searches are people who already knew the name — only the discovery half reflects being found by someone new.</div>
<table style="margin-top:10px"><thead><tr><th>Query</th><th class="num">Monthly impressions</th></tr></thead>
<tbody>${[...kw.discovery, ...kw.branded].slice(0, 25).map(kwRow).join("")}</tbody></table>
<div class="muted" style="margin-top:8px">“&lt;N” means Google withheld the exact count for a low-volume query.</div>`
  : `<div class="muted">No search-keyword data returned for this period.</div>`}

<footer>
  Generated from the Google Business Profile API (read-only). Scores are a prioritisation aid, not a Google-published metric —
  Google does not disclose ranking weights. Every finding above states the observed value so it can be checked directly.
</footer>
</div></body></html>`;
}

main().catch((e) => { console.error(e.message); process.exit(1); });
