/**
 * READ-ONLY: Bing Webmaster Tools performance for agency.innergcomplete.com —
 * traffic, index coverage, crawl health, queries and landing pages. No writes
 * anywhere; every call is a GET against the reporting endpoints.
 *
 * Usage:
 *   node scripts/bing_webmaster_report.js                 # full report
 *   node scripts/bing_webmaster_report.js --days=7        # trim the daily series
 *   node scripts/bing_webmaster_report.js --no-sitemap    # skip the coverage fetch
 *   node scripts/bing_webmaster_report.js --query="barber shops near me"
 *
 * WHY THIS EXISTS ALONGSIDE THE gsc_* SCRIPTS. Bing is a different index with a
 * different crawl schedule, and it exposes two things Search Console does not:
 * a running count of pages it holds in its index, and a per-day count of the
 * 4xx responses its crawler hit. Both are gauges we otherwise have to infer.
 *
 * AUTH. Bing Webmaster uses a plain API key, not OAuth — BING_WEBMASTER_API_KEY
 * in .env.local, generated in the Bing Webmaster Tools UI under Settings > API
 * Access. There is no refresh flow and nothing expires on a schedule, which is
 * why this needs none of the _google_internal_oauth plumbing the gsc_* scripts
 * carry.
 *
 * THE ONE TRAP IN THE DATA. `InIndex` on GetCrawlStats is a RUNNING TOTAL — the
 * number of pages Bing holds on that date — not a daily delta. Summing the
 * column produces a number roughly ten times the truth. This script reports it
 * as a trend with first/last values and deliberately never totals it.
 *
 * WINDOW. Bing chooses its own reporting window (~20 days as of Aug 2026) and
 * the endpoints take no date range. `--days` trims the returned series client
 * side; it cannot ask for more than Bing sends. Query and page stats come back
 * pre-aggregated over Bing's window with no date attached, so they cannot be
 * trimmed at all — they are reported as-is and labelled that way.
 *
 * NOT INCLUDED. GetKeywordStats is keyword research (search volume for a term
 * you supply), not console data, and it rejects the obvious `language=en`. It
 * belongs in a research script, not this one.
 */
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.BING_WEBMASTER_API_KEY;
const BASE = 'https://ssl.bing.com/webmaster/api.svc/json';
const OUT_DIR = path.join(__dirname, '..', 'scratchpad_reports');

const daysArg = process.argv.find((a) => a.startsWith('--days='));
const DAYS = daysArg ? parseInt(daysArg.split('=')[1], 10) : null;
const SKIP_SITEMAP = process.argv.includes('--no-sitemap');
const queryArg = process.argv.find((a) => a.startsWith('--query='));
const DRILL_QUERY = queryArg ? queryArg.slice('--query='.length) : null;

/** Our own brand, as opposed to the thousands of third-party business names. */
const OWN_BRAND = /innerg|inner\s*g|shearquery|shear\s*query/i;

/**
 * Informational intent, as opposed to someone typing a business name.
 *
 * Heuristic and labelled as one. The directory ranks overwhelmingly for
 * third-party salon and barbershop names, which is the product working — but it
 * drowns out the handful of queries that show the content pages earning their
 * keep, and those are the ones worth reading. Bing gives no query->page join on
 * GetQueryStats, so intent has to come from the query text itself.
 */
// Leading \b only: a trailing one would break the prefix matches ("open" must
// still catch "opening"), while the leading boundary is what stops "top" from
// firing inside "stopped".
const INFORMATIONAL = new RegExp(
  '\\b(?:' + [
    // Licensing and training vocabulary.
    'licen[cs]e|licensing|requirement|renewal|renew|exam|reciprocity|transfer|equivalence',
    'apprentice|school|training|certification|continuing education|tdlr|state board|kit|practical|written',
    // Shopping and comparison vocabulary.
    'cost|fee|price|pricing|hours|how|what|why|when|where|near me|best|top|vs|versus|cheap|open|start',
    'booth rent|insurance|walk.?in|appointment|book',
    // A PLURAL CATEGORY is a category search, not a business name — "barber
    // shops that braid real hair fort worth" is someone shopping, and it was
    // landing in the business-name bucket purely for lacking a keyword.
    'barber ?shops|hair salons|nail salons|beauty salons|barbers|stylists|braid(s|ing|er)?',
    // Our actual product surface.
    'automation|software|ai\\b|a\\.i\\.|rebooking|crm|marketing',
  ].join('|') + ')',
  'i'
);

async function call(method, params = {}) {
  const qs = new URLSearchParams({ apikey: API_KEY, ...params });
  const res = await fetch(`${BASE}/${method}?${qs}`);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${method}: non-JSON response (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  // Bing signals failure in the body with ErrorCode, not by HTTP status.
  if (json.ErrorCode) throw new Error(`${method}: ${json.Message || `ErrorCode ${json.ErrorCode}`}`);
  return json.d;
}

/** Bing serialises dates as /Date(1754179200000-0700)/. */
function bingDate(raw) {
  const m = /\/Date\((-?\d+)/.exec(raw || '');
  return m ? new Date(Number(m[1])).toISOString().slice(0, 10) : '?';
}

const desc = (rows, key) => [...rows].sort((a, b) => (b[key] || 0) - (a[key] || 0));
const pct = (n, d) => (d ? ((n / d) * 100).toFixed(1) : '0.0');

/** Bucket a path into a page-type section. Mirrors gsc_landing_pages.js. */
function section(p) {
  if (p === '/' || p === '') return '(homepage)';
  const seg = p.split('/').filter(Boolean);
  const named = {
    shop: '/shop/* (barbershops)',
    salons: '/salons/* (salons)',
    schools: '/schools/* (schools)',
    stores: '/stores/* (supply stores)',
    barbers: '/barbers/* (barbers)',
    cosmetologists: '/cosmetologists/* (cosmetologists)',
    events: '/events/*',
    insights: '/insights/*',
    tools: '/tools/*',
    california: '/california/* (CA hubs)',
  };
  if (named[seg[0]]) return named[seg[0]];
  if (seg[0] === 'texas') {
    if (seg.length === 1) return '/texas (state hub)';
    if (seg.length === 2) return '/texas/[city] (city hubs)';
    if (seg.length >= 3 && /^\d{5}$/.test(seg[2])) return '/texas/[city]/[zip] (zip hubs)';
    return '/texas/* (other)';
  }
  if (/^texas-/.test(seg[0])) return '/texas-* (licence & exam guides)';
  return `/${seg[0]} (marketing/landing)`;
}

function toPath(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/** How many URLs we publish, for an index-coverage denominator. Best effort. */
async function sitemapUrlCount(siteUrl) {
  const res = await fetch(new URL('/sitemap.xml', siteUrl).toString());
  if (!res.ok) throw new Error(`sitemap HTTP ${res.status}`);
  const xml = await res.text();
  const locs = xml.match(/<loc>/g) || [];
  // A sitemap index lists child sitemaps rather than pages — follow them.
  if (!/<sitemapindex/.test(xml)) return locs.length;
  const children = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  let total = 0;
  for (const child of children) {
    const r = await fetch(child);
    if (!r.ok) continue;
    total += ((await r.text()).match(/<loc>/g) || []).length;
  }
  return total;
}

async function run() {
  if (!API_KEY) {
    console.error('ERROR: BING_WEBMASTER_API_KEY is not set in .env.local.');
    console.error('Generate one in Bing Webmaster Tools > Settings > API Access > API Key.');
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // ---- Which site are we reporting on ------------------------------------
  const sites = (await call('GetUserSites')) || [];
  const verified = sites.filter((s) => s.IsVerified);
  if (!verified.length) {
    console.error('ERROR: no verified sites on this API key.');
    console.error(`Key sees ${sites.length} site(s): ${sites.map((s) => s.Url).join(', ') || '(none)'}`);
    process.exit(1);
  }
  // Prefer the site we track in Search Console so the two reports line up.
  const gscHost = (() => {
    try {
      return new URL((process.env.GSC_SITE_URL || '').replace(/^sc-domain:/, 'https://')).hostname;
    } catch {
      return null;
    }
  })();
  const site = verified.find((s) => gscHost && new URL(s.Url).hostname === gscHost) || verified[0];
  const SITE = site.Url;

  console.log(`Bing Webmaster Tools — ${SITE}`);
  console.log(`Verified sites on this key: ${verified.map((s) => s.Url).join(', ')}`);
  if (DAYS) console.log(`Daily series trimmed to the most recent ${DAYS} days.`);
  console.log('');

  // ---- Traffic ------------------------------------------------------------
  const trafficRaw = (await call('GetRankAndTrafficStats', { siteUrl: SITE })) || [];
  let traffic = trafficRaw
    .map((r) => ({
      date: bingDate(r.Date),
      impressions: r.Impressions || 0,
      clicks: r.Clicks || 0,
      avgImpressionPosition: r.AvgImpressionPosition ?? null,
      avgClickPosition: r.AvgClickPosition ?? null,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const trafficWindow = traffic.length;
  if (DAYS) traffic = traffic.slice(0, DAYS);

  const totImp = traffic.reduce((s, r) => s + r.impressions, 0);
  const totClk = traffic.reduce((s, r) => s + r.clicks, 0);

  console.log('================ TRAFFIC BY DAY ================');
  console.log('  date         impressions   clicks     ctr   avg impr pos');
  for (const r of traffic) {
    console.log(
      `  ${r.date}   ${String(r.impressions).padStart(11)}  ${String(r.clicks).padStart(7)}  ${pct(r.clicks, r.impressions).padStart(5)}%  ${String(r.avgImpressionPosition ?? '—').padStart(12)}`
    );
  }
  console.log(
    `  ---- ${traffic.length} of ${trafficWindow} days Bing returned: ${totImp} impressions, ${totClk} clicks, CTR ${pct(totClk, totImp)}%`
  );

  // ---- Index coverage + crawl health --------------------------------------
  const crawlRaw = (await call('GetCrawlStats', { siteUrl: SITE })) || [];
  let crawl = crawlRaw
    .map((r) => ({
      date: bingDate(r.Date),
      crawled: r.CrawledPages || 0,
      inIndex: r.InIndex || 0,
      c4xx: r.Code4xx || 0,
      c5xx: r.Code5xx || 0,
      blocked: r.BlockedByRobotsTxt || 0,
      timeout: r.ConnectionTimeout || 0,
      dns: r.DnsFailures || 0,
      other: r.AllOtherCodes || 0,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const crawlWindow = crawl.length;
  if (DAYS) crawl = crawl.slice(0, DAYS);

  console.log('\n================ CRAWL & INDEX BY DAY ================');
  console.log('  date         crawled   inIndex    4xx    5xx  blocked  timeout    dns');
  for (const r of crawl) {
    console.log(
      `  ${r.date}   ${String(r.crawled).padStart(7)}  ${String(r.inIndex).padStart(8)}  ${String(r.c4xx).padStart(5)}  ${String(r.c5xx).padStart(5)}  ${String(r.blocked).padStart(7)}  ${String(r.timeout).padStart(7)}  ${String(r.dns).padStart(5)}`
    );
  }

  // inIndex is a running total, so it gets a trend — never a sum. See header.
  const newest = crawl[0];
  const oldest = crawl[crawl.length - 1];
  const totCrawled = crawl.reduce((s, r) => s + r.crawled, 0);
  const tot4xx = crawl.reduce((s, r) => s + r.c4xx, 0);
  const tot5xx = crawl.reduce((s, r) => s + r.c5xx, 0);
  console.log(`  ---- ${crawl.length} of ${crawlWindow} days Bing returned`);
  console.log(`       pages crawled: ${totCrawled}   4xx: ${tot4xx}   5xx: ${tot5xx}`);
  if (newest && oldest) {
    const delta = newest.inIndex - oldest.inIndex;
    const dir = delta > 0 ? '+' : '';
    console.log(
      `       index size: ${oldest.inIndex} on ${oldest.date} -> ${newest.inIndex} on ${newest.date}  (${dir}${delta}; running total, not a daily delta)`
    );
  }

  if (!SKIP_SITEMAP && newest) {
    try {
      const published = await sitemapUrlCount(SITE);
      console.log(
        `       index coverage: ${newest.inIndex} of ${published} sitemap URLs = ${pct(newest.inIndex, published)}%`
      );
    } catch (e) {
      console.log(`       index coverage: sitemap unavailable (${e.message})`);
    }
  }

  // ---- Queries ------------------------------------------------------------
  const queries = ((await call('GetQueryStats', { siteUrl: SITE })) || []).map((r) => ({
    query: r.Query,
    impressions: r.Impressions || 0,
    clicks: r.Clicks || 0,
    position: r.AvgImpressionPosition ?? null,
    clickPosition: r.AvgClickPosition ?? null,
  }));

  const ownBrand = queries.filter((r) => OWN_BRAND.test(r.query));
  const rest = queries.filter((r) => !OWN_BRAND.test(r.query));
  const informational = rest.filter((r) => INFORMATIONAL.test(r.query));
  const likelyBusinessName = rest.filter((r) => !INFORMATIONAL.test(r.query));

  const qLine = (r) =>
    `  ${String(r.impressions).padStart(5)} imp  ${String(r.clicks).padStart(4)} clk  pos ${String(r.position ?? '—').padStart(4)}   ${r.query}`;

  console.log('\n================ QUERIES (Bing\'s own window, no date breakdown) ================');
  console.log(`  ${queries.length} queries returned. Split is heuristic — see INFORMATIONAL in the header.\n`);
  console.log(`  -- INFORMATIONAL INTENT (${informational.length}) --`);
  if (informational.length) desc(informational, 'impressions').forEach((r) => console.log(qLine(r)));
  else console.log('  (none)');
  console.log(`\n  -- OUR OWN BRAND (${ownBrand.length}) --`);
  if (ownBrand.length) desc(ownBrand, 'impressions').forEach((r) => console.log(qLine(r)));
  else console.log('  (none)');
  console.log(`\n  -- LIKELY THIRD-PARTY BUSINESS NAMES (${likelyBusinessName.length}) --`);
  if (likelyBusinessName.length) desc(likelyBusinessName, 'impressions').slice(0, 25).forEach((r) => console.log(qLine(r)));
  else console.log('  (none)');

  // ---- Pages --------------------------------------------------------------
  // GetPageStats reports the URL in a field named `Query`, which is Bing's
  // naming, not a mistake here. It can return the same URL more than once, so
  // rows are merged on path before reporting.
  const pageRaw = (await call('GetPageStats', { siteUrl: SITE })) || [];
  const byPath = new Map();
  for (const r of pageRaw) {
    const p = toPath(r.Query);
    const cur = byPath.get(p) || { path: p, impressions: 0, clicks: 0, position: null };
    cur.impressions += r.Impressions || 0;
    cur.clicks += r.Clicks || 0;
    // Keep the best position seen; Bing gives no impression weights to average.
    const pos = r.AvgImpressionPosition ?? null;
    if (pos !== null) cur.position = cur.position === null ? pos : Math.min(cur.position, pos);
    byPath.set(p, cur);
  }
  const pages = [...byPath.values()];

  console.log('\n================ LANDING PAGES ================');
  console.log(`  ${pages.length} distinct pages (merged from ${pageRaw.length} rows)\n`);
  console.log('  impressions   clicks   pages   section');
  const buckets = new Map();
  for (const r of pages) {
    const s = section(r.path);
    const b = buckets.get(s) || { section: s, pages: 0, clicks: 0, impressions: 0 };
    b.pages++;
    b.clicks += r.clicks;
    b.impressions += r.impressions;
    buckets.set(s, b);
  }
  for (const b of desc([...buckets.values()], 'impressions')) {
    console.log(
      `  ${String(b.impressions).padStart(11)}  ${String(b.clicks).padStart(6)}  ${String(b.pages).padStart(5)}   ${b.section}`
    );
  }
  console.log('\n  -- TOP 30 PAGES BY IMPRESSIONS --');
  for (const r of desc(pages, 'impressions').slice(0, 30)) {
    console.log(
      `  ${String(r.impressions).padStart(5)} imp  ${String(r.clicks).padStart(4)} clk  pos ${String(r.position ?? '—').padStart(4)}   ${r.path}`
    );
  }

  // ---- Crawl issues -------------------------------------------------------
  const issues = (await call('GetCrawlIssues', { siteUrl: SITE })) || [];
  console.log(`\n================ CRAWL ISSUES (${issues.length}) ================`);
  if (!issues.length) {
    console.log('  none reported');
  } else {
    for (const i of issues.slice(0, 40)) {
      console.log(`  ${toPath(i.Url)}  ${JSON.stringify(i.Issues ?? i)}`);
    }
    if (issues.length > 40) console.log(`  ... and ${issues.length - 40} more (see CSV)`);
  }

  // ---- Submission quota ---------------------------------------------------
  // Direct URL submission, separate from and on top of IndexNow (lib/indexnow.ts),
  // which has no quota. Reported so it is visible before anyone needs it.
  try {
    const quota = await call('GetUrlSubmissionQuota', { siteUrl: SITE });
    console.log('\n================ URL SUBMISSION QUOTA ================');
    console.log(`  daily: ${quota.DailyQuota}   monthly: ${quota.MonthlyQuota}   (IndexNow is separate and unmetered)`);
  } catch (e) {
    console.log(`\n  submission quota unavailable: ${e.message}`);
  }

  // ---- Optional single-query drill-down ------------------------------------
  if (DRILL_QUERY) {
    console.log(`\n================ PAGES FOR "${DRILL_QUERY}" ================`);
    try {
      const drill = (await call('GetQueryPageStats', { siteUrl: SITE, query: DRILL_QUERY })) || [];
      if (!drill.length) console.log('  no rows — Bing has no data for that query on this site');
      for (const r of desc(drill.map((x) => ({ path: toPath(x.Query), impressions: x.Impressions || 0, clicks: x.Clicks || 0, position: x.AvgImpressionPosition ?? null })), 'impressions')) {
        console.log(`  ${String(r.impressions).padStart(5)} imp  ${String(r.clicks).padStart(4)} clk  pos ${String(r.position ?? '—').padStart(4)}   ${r.path}`);
      }
    } catch (e) {
      console.log(`  unavailable: ${e.message}`);
    }
  }

  // ---- CSVs ---------------------------------------------------------------
  const stamp = traffic.length ? `${traffic[traffic.length - 1].date}_to_${traffic[0].date}` : 'nodata';
  const write = (name, header, rows) => {
    const p = path.join(OUT_DIR, `bing_${name}_${stamp}.csv`);
    fs.writeFileSync(p, [header, ...rows].join('\n'));
    return p;
  };
  const files = [
    write('traffic', 'date,impressions,clicks,ctr,avg_impression_position', traffic.map((r) => `${r.date},${r.impressions},${r.clicks},${pct(r.clicks, r.impressions)},${r.avgImpressionPosition ?? ''}`)),
    write('crawl', 'date,crawled,in_index,c4xx,c5xx,blocked_robots,timeout,dns,other', crawl.map((r) => `${r.date},${r.crawled},${r.inIndex},${r.c4xx},${r.c5xx},${r.blocked},${r.timeout},${r.dns},${r.other}`)),
    write('queries', 'query,impressions,clicks,avg_impression_position,bucket', desc(queries, 'impressions').map((r) => {
      const bucket = OWN_BRAND.test(r.query) ? 'own_brand' : INFORMATIONAL.test(r.query) ? 'informational' : 'likely_business_name';
      return `"${r.query.replace(/"/g, '""')}",${r.impressions},${r.clicks},${r.position ?? ''},${bucket}`;
    })),
    write('pages', 'path,impressions,clicks,best_position,section', desc(pages, 'impressions').map((r) => `"${r.path}",${r.impressions},${r.clicks},${r.position ?? ''},"${section(r.path)}"`)),
  ];
  console.log('\nCSVs written:');
  files.forEach((f) => console.log(`  ${f}`));
}

run().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
