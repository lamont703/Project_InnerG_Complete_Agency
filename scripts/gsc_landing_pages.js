/**
 * READ-ONLY: Search Console performance for the last 14 days broken down by
 * LANDING PAGE (page dimension) — top pages plus an aggregate by page section
 * (/shop, /salons, /schools, /texas/[city], etc.). No writes anywhere.
 *
 * Usage: node scripts/gsc_landing_pages.js
 */
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_GSC_REFRESH_TOKEN, GSC_SITE_URL } = process.env;
const OUT_DIR = path.join(__dirname, '..', 'scratchpad_reports');

// Bucket a path into a page-type section for the aggregate view.
function section(p) {
  if (p === '/' || p === '') return '(homepage)';
  const seg = p.split('/').filter(Boolean);
  if (seg[0] === 'shop') return '/shop/* (barbershops)';
  if (seg[0] === 'salons') return '/salons/* (salons)';
  if (seg[0] === 'schools') return '/schools/* (schools)';
  if (seg[0] === 'stores') return '/stores/* (supply stores)';
  if (seg[0] === 'barbers') return '/barbers/* (barbers)';
  if (seg[0] === 'cosmetologists') return '/cosmetologists/* (cosmetologists)';
  if (seg[0] === 'events') return '/events/*';
  if (seg[0] === 'insights') return '/insights/*';
  if (seg[0] === 'california') return '/california/* (CA hubs)';
  if (seg[0] === 'texas') {
    if (seg.length === 1) return '/texas (state hub)';
    if (seg.includes('insights')) return '/texas/houston/insights/* (market analysis)';
    if (seg.length === 2) return '/texas/[city] (city hubs)';
    if (seg.length >= 3 && /^\d{5}$/.test(seg[2])) return '/texas/[city]/[zip] (zip hubs)';
    return '/texas/* (other)';
  }
  if (seg[0] === 'tools') return '/tools/*';
  return `/${seg[0]} (marketing/landing)`;
}

async function gscByPage(auth, startDate, endDate) {
  const searchconsole = google.searchconsole({ version: 'v1', auth });
  const rows = [];
  let startRow = 0;
  while (true) {
    const res = await searchconsole.searchanalytics.query({
      siteUrl: GSC_SITE_URL,
      requestBody: { startDate, endDate, dimensions: ['page'], rowLimit: 25000, startRow },
    });
    const batch = res.data.rows || [];
    rows.push(...batch);
    if (batch.length < 25000) break;
    startRow += 25000;
  }
  return rows;
}

async function run() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_GSC_REFRESH_TOKEN || !GSC_SITE_URL) {
    console.error('Missing GSC OAuth env vars.'); process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const d = new Date();
  const end = new Date(d.getTime() - 1 * 86400000);
  const start = new Date(end.getTime() - 13 * 86400000);
  const iso = (x) => x.toISOString().slice(0, 10);
  const startDate = iso(start), endDate = iso(end);

  const oauth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  oauth.setCredentials({ refresh_token: GOOGLE_GSC_REFRESH_TOKEN });

  console.log(`Search Console — landing pages for ${GSC_SITE_URL}`);
  console.log(`Window: ${startDate} -> ${endDate} (14 days)\n`);

  const rows = await gscByPage(oauth, startDate, endDate).then((rs) => rs.map((r) => {
    let p = r.keys[0];
    try { p = new URL(p).pathname; } catch { /* keep as-is */ }
    return { path: p, clicks: r.clicks || 0, impressions: r.impressions || 0, ctr: r.ctr || 0, position: r.position || 0 };
  }));

  const totClk = rows.reduce((s, r) => s + r.clicks, 0);
  const totImp = rows.reduce((s, r) => s + r.impressions, 0);
  console.log(`Distinct landing pages: ${rows.length}  |  total impressions: ${totImp}  clicks: ${totClk}\n`);

  // Aggregate by section.
  const buckets = new Map();
  for (const r of rows) {
    const s = section(r.path);
    if (!buckets.has(s)) buckets.set(s, { section: s, pages: 0, clicks: 0, impressions: 0 });
    const b = buckets.get(s);
    b.pages++; b.clicks += r.clicks; b.impressions += r.impressions;
  }
  const sections = [...buckets.values()].sort((a, b) => b.impressions - a.impressions);

  console.log('================ IMPRESSIONS / CLICKS BY PAGE SECTION ================');
  console.log('  impressions   clicks   ctr    pages   section');
  for (const b of sections) {
    const ctr = b.impressions ? (b.clicks / b.impressions * 100).toFixed(1) : '0.0';
    console.log(`  ${String(b.impressions).padStart(9)}  ${String(b.clicks).padStart(6)}  ${ctr.padStart(5)}%  ${String(b.pages).padStart(5)}   ${b.section}`);
  }

  const fmt = (r) => `  ${String(r.impressions).padStart(6)} imp  ${String(r.clicks).padStart(4)} clk  pos ${r.position.toFixed(1).padStart(4)}  ${(r.ctr * 100).toFixed(1)}%  ${r.path}`;
  console.log('\n================ TOP 30 LANDING PAGES BY IMPRESSIONS ================');
  [...rows].sort((a, b) => b.impressions - a.impressions).slice(0, 30).forEach((r) => console.log(fmt(r)));
  console.log('\n================ TOP 25 LANDING PAGES BY CLICKS ================');
  [...rows].filter((r) => r.clicks > 0).sort((a, b) => b.clicks - a.clicks).slice(0, 25).forEach((r) => console.log(fmt(r)));

  const csv = ['path,clicks,impressions,ctr,position',
    ...[...rows].sort((a, b) => b.impressions - a.impressions).map((r) => `"${r.path}",${r.clicks},${r.impressions},${(r.ctr * 100).toFixed(2)},${r.position.toFixed(1)}`)].join('\n');
  const csvPath = path.join(OUT_DIR, `gsc_landing_pages_${startDate}_to_${endDate}.csv`);
  fs.writeFileSync(csvPath, csv);
  console.log(`\nFull landing-page CSV: ${csvPath}`);
}

run().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
