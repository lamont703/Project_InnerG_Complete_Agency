/**
 * READ-ONLY: Search Console (last 14 days) focused on school-related content —
 * three buckets: school profile pages (/schools/*), school "asset" pages (exam
 * prep/kits, leaderboards, licensing guides, practice decks, continuing-ed,
 * scholarship, etc.), and insight articles (/insights/*). Reports page-level
 * performance per bucket plus the top queries driving this content group.
 * No writes anywhere.
 *
 * Usage: node scripts/gsc_schools_insights.js
 */
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_GSC_REFRESH_TOKEN, GSC_SITE_URL } = process.env;
const OUT_DIR = path.join(__dirname, '..', 'scratchpad_reports');

// Which bucket (if any) a landing-page path belongs to.
const ASSET_RE = /(exam|school-leaderboard|school-benchmark|continuing-education|barber-license|how-to-get-a-barber|scholarship|program-advisory|practice-deck|cosmetology-schools|accreditation)/;
const PROFILE_PREFIXES = /^\/(shop|salons|stores|barbers|cosmetologists|events)\//;
function bucket(p) {
  if (p.startsWith('/schools/')) return 'School Profiles (/schools/*)';
  if (p.startsWith('/insights/')) return 'Insight Articles (/insights/*)';
  if (ASSET_RE.test(p) && !PROFILE_PREFIXES.test(p)) return 'School Asset Pages (exam/license/tools)';
  return null;
}
// GSC-side page filter (matches full URLs) to pull the queries for this group.
const PAGE_FILTER_REGEX = '(/schools/|/insights/|exam|school-leaderboard|school-benchmark|continuing-education|barber-license|how-to-get-a-barber|scholarship|program-advisory|practice-deck|cosmetology-schools|accreditation)';

async function queryGsc(auth, requestBody) {
  const searchconsole = google.searchconsole({ version: 'v1', auth });
  const rows = [];
  let startRow = 0;
  while (true) {
    const res = await searchconsole.searchanalytics.query({ siteUrl: GSC_SITE_URL, requestBody: { ...requestBody, rowLimit: 25000, startRow } });
    const batch = res.data.rows || [];
    rows.push(...batch);
    if (batch.length < 25000) break;
    startRow += 25000;
  }
  return rows;
}

async function run() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_GSC_REFRESH_TOKEN || !GSC_SITE_URL) { console.error('Missing GSC env vars.'); process.exit(1); }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const d = new Date();
  const end = new Date(d.getTime() - 86400000);
  const start = new Date(end.getTime() - 13 * 86400000);
  const iso = (x) => x.toISOString().slice(0, 10);
  const startDate = iso(start), endDate = iso(end);

  const oauth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  oauth.setCredentials({ refresh_token: GOOGLE_GSC_REFRESH_TOKEN });

  console.log(`Schools + insights analysis — ${GSC_SITE_URL}`);
  console.log(`Window: ${startDate} -> ${endDate} (14 days)\n`);

  // 1) Page-level, classify into buckets.
  const pageRows = (await queryGsc(oauth, { startDate, endDate, dimensions: ['page'] })).map((r) => {
    let p = r.keys[0]; try { p = new URL(p).pathname; } catch {}
    return { path: p, clicks: r.clicks || 0, impressions: r.impressions || 0, ctr: r.ctr || 0, position: r.position || 0, bucket: bucket(p) };
  }).filter((r) => r.bucket);

  const buckets = new Map();
  for (const r of pageRows) {
    if (!buckets.has(r.bucket)) buckets.set(r.bucket, { pages: 0, clicks: 0, impressions: 0 });
    const b = buckets.get(r.bucket); b.pages++; b.clicks += r.clicks; b.impressions += r.impressions;
  }
  console.log('================ BY BUCKET ================');
  console.log('  impressions   clicks    ctr   pages   bucket');
  for (const [name, b] of [...buckets.entries()].sort((a, c) => c[1].impressions - a[1].impressions)) {
    const ctr = b.impressions ? (b.clicks / b.impressions * 100).toFixed(1) : '0.0';
    console.log(`  ${String(b.impressions).padStart(9)}  ${String(b.clicks).padStart(6)}  ${ctr.padStart(5)}%  ${String(b.pages).padStart(5)}   ${name}`);
  }

  const fmt = (r) => `  ${String(r.impressions).padStart(5)} imp ${String(r.clicks).padStart(4)} clk pos ${r.position.toFixed(1).padStart(4)} ${(r.ctr * 100).toFixed(1)}%  ${r.path}`;
  const top = (name, by, n) => {
    console.log(`\n--- Top ${n} ${name} by ${by} ---`);
    pageRows.filter((r) => r.bucket === name && (by === 'impressions' || r.clicks > 0))
      .sort((a, b) => b[by] - a[by]).slice(0, n).forEach((r) => console.log(fmt(r)));
  };
  top('School Profiles (/schools/*)', 'clicks', 15);
  top('School Profiles (/schools/*)', 'impressions', 10);
  top('School Asset Pages (exam/license/tools)', 'impressions', 15);
  top('Insight Articles (/insights/*)', 'impressions', 15);

  // 2) Queries driving this content group (GSC-side page filter).
  const qRows = (await queryGsc(oauth, {
    startDate, endDate, dimensions: ['query'],
    dimensionFilterGroups: [{ filters: [{ dimension: 'page', operator: 'includingRegex', expression: PAGE_FILTER_REGEX }] }],
  })).map((r) => ({ query: r.keys[0], clicks: r.clicks || 0, impressions: r.impressions || 0, ctr: r.ctr || 0, position: r.position || 0 }));

  const qImp = qRows.reduce((s, r) => s + r.impressions, 0), qClk = qRows.reduce((s, r) => s + r.clicks, 0);
  console.log(`\n================ QUERIES DRIVING SCHOOL/INSIGHT PAGES (${qRows.length} queries, ${qImp} imp, ${qClk} clk) ================`);
  const qfmt = (r) => `  ${String(r.impressions).padStart(5)} imp ${String(r.clicks).padStart(4)} clk pos ${r.position.toFixed(1).padStart(4)} ${(r.ctr * 100).toFixed(1)}%  "${r.query}"`;
  console.log('\n--- Top 25 queries by impressions ---');
  [...qRows].sort((a, b) => b.impressions - a.impressions).slice(0, 25).forEach((r) => console.log(qfmt(r)));
  console.log('\n--- Top 20 queries by clicks ---');
  [...qRows].filter((r) => r.clicks > 0).sort((a, b) => b.clicks - a.clicks).slice(0, 20).forEach((r) => console.log(qfmt(r)));

  // CSVs.
  const pcsv = ['bucket,path,clicks,impressions,ctr,position', ...pageRows.sort((a, b) => b.impressions - a.impressions).map((r) => `"${r.bucket}","${r.path}",${r.clicks},${r.impressions},${(r.ctr * 100).toFixed(2)},${r.position.toFixed(1)}`)].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, `gsc_schools_insights_pages_${startDate}_to_${endDate}.csv`), pcsv);
  const qcsv = ['query,clicks,impressions,ctr,position', ...[...qRows].sort((a, b) => b.impressions - a.impressions).map((r) => `"${r.query.replace(/"/g, '""')}",${r.clicks},${r.impressions},${(r.ctr * 100).toFixed(2)},${r.position.toFixed(1)}`)].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, `gsc_schools_insights_queries_${startDate}_to_${endDate}.csv`), qcsv);
  console.log(`\nCSVs written to ${OUT_DIR}/gsc_schools_insights_*_${startDate}_to_${endDate}.csv`);
}

run().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
