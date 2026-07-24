/**
 * READ-ONLY research: pulls Search Console query performance for the last 14
 * days, strips out brand/business-name (navigational) queries by matching
 * against our own DB of shop/salon/school/store/professional names, and
 * surfaces the non-business long-tail keywords we're getting impressions and
 * clicks for. Writes a report to scratchpad_reports/. No writes to GSC or DB.
 *
 * Usage: node scripts/gsc_longtail_research.js
 */
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_GSC_REFRESH_TOKEN, GSC_SITE_URL } = process.env;
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const OUT_DIR = path.join(__dirname, '..', 'scratchpad_reports');

// Industry / legal / geo filler words removed when reducing a business name
// down to its distinctive "brand core" (so "Valor Barbershop" -> "valor").
const GENERIC = new Set([
  'barber', 'barbers', 'barbershop', 'barbershops', 'barbering', 'salon', 'salons',
  'hair', 'haircut', 'haircuts', 'beauty', 'cosmetology', 'cosmetologist', 'nails',
  'shop', 'studio', 'studios', 'spa', 'lounge', 'college', 'school', 'schools',
  'academy', 'institute', 'university', 'supply', 'supplies', 'store', 'stores',
  'the', 'and', 'of', 'a', 'llc', 'inc', 'co', 'corp', 'company', 'tx', 'texas',
  'and', 'for', 'by', 'at', 'cuts', 'kutz', 'styles', 'stylez', 'fades', 'grooming',
]);
const SITE_BRAND = ['inner g complete', 'innerg complete', 'innergcomplete', 'inner g', 'shearquery', 'shear query'];

// A query is "generic/non-business" only when EVERY token is a known industry,
// geo, or modifier word — i.e. it contains no distinctive proper noun that
// would make it a specific business name. This is far more reliable than
// matching business names (which misses competitors and short brand words).
const GENERIC_VOCAB = new Set([
  // stopwords / connectors
  'a', 'an', 'the', 'in', 'of', 'for', 'to', 'and', 'at', 'on', 'or', 'with', 'my', 'your',
  // proximity / intent modifiers
  'near', 'me', 'nearby', 'around', 'close', 'closest', 'nearest', 'open', 'now', 'today',
  'best', 'top', 'good', 'great', 'cheap', 'cheapest', 'affordable', 'local', 'quality', 'popular',
  'how', 'what', 'where', 'when', 'why', 'much', 'cost', 'costs', 'price', 'prices', 'pricing',
  'requirements', 'requirement', 'license', 'licensing', 'licensed', 'become', 'get', 'do', 'does',
  'vs', 'versus', 'hours', 'number', 'phone', 'reviews', 'review', 'photos', 'images', 'map',
  'directions', 'appointment', 'appointments', 'walk', 'ins', 'booking', 'book', 'online', 'first',
  // industry terms
  'barber', 'barbers', 'barbershop', 'barbershops', 'barbering', 'salon', 'salons', 'hair',
  'haircut', 'haircuts', 'cut', 'cuts', 'beauty', 'cosmetology', 'cosmetologist', 'cosmetologists',
  'nail', 'nails', 'braid', 'braids', 'braiding', 'weave', 'weaves', 'locs', 'dreads', 'twist',
  'spa', 'shop', 'shops', 'store', 'stores', 'supply', 'supplies', 'school', 'schools', 'college',
  'colleges', 'academy', 'institute', 'university', 'training', 'program', 'programs', 'class',
  'classes', 'course', 'courses', 'stylist', 'stylists', 'esthetician', 'estheticians', 'education',
  'exam', 'exams', 'test', 'practice', 'tint', 'lamination', 'lash', 'lashes', 'brow', 'brows',
  'wax', 'waxing', 'color', 'colour', 'styling', 'style', 'fade', 'fades', 'dye', 'kids', 'mens',
  'womens', 'black', 'asian', 'natural', 'curly', 'wig', 'wigs', 'extensions', 'chair', 'booth', 'rent',
  // geo (Texas cities + split multi-word city tokens + common area words)
  'texas', 'tx', 'houston', 'katy', 'pearland', 'pasadena', 'humble', 'austin', 'dallas', 'san',
  'antonio', 'sugar', 'land', 'woodlands', 'spring', 'cypress', 'missouri', 'city', 'baytown',
  'conroe', 'league', 'fort', 'worth', 'el', 'paso', 'corpus', 'christi', 'plano', 'laredo',
  'irving', 'garland', 'amarillo', 'mckinney', 'frisco', 'brownsville', 'pflugerville', 'station',
  'beaumont', 'waco', 'tyler', 'sherman', 'eagle', 'pass', 'round', 'rock', 'stafford', 'richmond',
  'rosenberg', 'tomball', 'kingwood', 'atascocita', 'channelview', 'deer', 'park', 'la', 'porte',
  'friendswood', 'webster', 'clear', 'lake', 'galveston', 'sienna', 'fresno', 'bellaire', 'aldine',
  'downtown', 'north', 'south', 'east', 'west', 'central', 'area', 'county', 'tomball',
]);
function isGeneric(q) {
  const tokens = norm(q).split(' ').filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((t) => GENERIC_VOCAB.has(t));
}

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

function brandCore(name) {
  const tokens = norm(name).split(' ').filter((t) => t && !GENERIC.has(t));
  const core = tokens.join(' ').trim();
  // Keep only cores distinctive enough to be a real brand signal.
  return core.length >= 5 ? core : null;
}

async function fetchNames(table, col) {
  let out = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(col).range(from, from + 999);
    if (error) { console.error(`  (skip ${table}: ${error.message})`); break; }
    out = out.concat(data.map((r) => r[col]).filter(Boolean));
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return out;
}

async function gscQuery(auth, startDate, endDate) {
  const searchconsole = google.searchconsole({ version: 'v1', auth });
  const rows = [];
  let startRow = 0;
  while (true) {
    const res = await searchconsole.searchanalytics.query({
      siteUrl: GSC_SITE_URL,
      requestBody: { startDate, endDate, dimensions: ['query'], rowLimit: 25000, startRow },
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

  // Last 14 days, ending yesterday (GSC has a ~2-3 day lag; the freshest days
  // may be sparse but stay within the requested window).
  const d = new Date();
  const end = new Date(d.getTime() - 1 * 86400000);
  const start = new Date(end.getTime() - 13 * 86400000);
  const iso = (x) => x.toISOString().slice(0, 10);
  const startDate = iso(start), endDate = iso(end);

  const oauth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  oauth.setCredentials({ refresh_token: GOOGLE_GSC_REFRESH_TOKEN });

  console.log(`Querying Search Console for ${GSC_SITE_URL}`);
  console.log(`Window: ${startDate} -> ${endDate} (14 days)\n`);
  const rows = await gscQuery(oauth, startDate, endDate);
  console.log(`Total distinct queries returned: ${rows.length}`);

  console.log('Loading business names from the database to build the brand filter...');
  const nameSets = await Promise.all([
    fetchNames('agent_barbershop_leads', 'shop_name'),
    fetchNames('agent_salon_leads', 'shop_name'),
    fetchNames('agent_barber_school_leads', 'school_name'),
    fetchNames('agent_cosmetology_school_leads', 'school_name'),
    fetchNames('agent_barber_supply_store_leads', 'name'),
    fetchNames('agent_beauty_supply_store_leads', 'name'),
    fetchNames('agent_barber_leads', 'name'),
    fetchNames('agent_cosmetologist_leads', 'name'),
  ]);
  const allNames = nameSets.flat();
  const brandCores = [...new Set(allNames.map(brandCore).filter(Boolean))];
  console.log(`Business names loaded: ${allNames.length} | distinct brand cores: ${brandCores.length}\n`);

  const isBrand = (q) => {
    const nq = norm(q);
    if (SITE_BRAND.some((b) => nq.includes(b))) return true;
    // A query is navigational/brand if it contains a business's distinctive
    // brand core as a phrase.
    for (const core of brandCores) if (nq.includes(core)) return true;
    return false;
  };

  const nonBrand = [];
  let brandCount = 0;
  for (const r of rows) {
    const q = r.keys[0];
    // Keep only queries that are purely generic (no distinctive proper noun)
    // AND aren't one of our own DB brand cores / site brand.
    if (!isGeneric(q) || isBrand(q)) { brandCount++; continue; }
    nonBrand.push({ query: q, clicks: r.clicks || 0, impressions: r.impressions || 0, ctr: r.ctr || 0, position: r.position || 0, words: norm(q).split(' ').filter(Boolean).length });
  }

  const longTail = nonBrand.filter((r) => r.words >= 3);
  const sumImp = (a) => a.reduce((s, r) => s + r.impressions, 0);
  const sumClk = (a) => a.reduce((s, r) => s + r.clicks, 0);

  console.log('================ SUMMARY (last 14 days) ================');
  console.log(`Brand / business-name queries filtered out: ${brandCount}`);
  console.log(`Non-business queries: ${nonBrand.length}  (impressions ${sumImp(nonBrand)}, clicks ${sumClk(nonBrand)})`);
  console.log(`  of which long-tail (3+ words): ${longTail.length}  (impressions ${sumImp(longTail)}, clicks ${sumClk(longTail)})`);

  const fmt = (r) => `  ${String(r.impressions).padStart(6)} imp  ${String(r.clicks).padStart(4)} clk  pos ${r.position.toFixed(1).padStart(4)}  ${(r.ctr * 100).toFixed(1)}%  "${r.query}"`;

  console.log('\n===== TOP 30 NON-BUSINESS LONG-TAIL BY IMPRESSIONS =====');
  [...longTail].sort((a, b) => b.impressions - a.impressions).slice(0, 30).forEach((r) => console.log(fmt(r)));

  console.log('\n===== TOP 30 NON-BUSINESS LONG-TAIL BY CLICKS =====');
  [...longTail].filter((r) => r.clicks > 0).sort((a, b) => b.clicks - a.clicks).slice(0, 30).forEach((r) => console.log(fmt(r)));

  // Full CSVs for review.
  const toCsv = (arr) => ['query,clicks,impressions,ctr,position,words',
    ...arr.map((r) => `"${r.query.replace(/"/g, '""')}",${r.clicks},${r.impressions},${(r.ctr * 100).toFixed(2)},${r.position.toFixed(1)},${r.words}`)].join('\n');
  const csvPath = path.join(OUT_DIR, `gsc_nonbusiness_longtail_${startDate}_to_${endDate}.csv`);
  fs.writeFileSync(csvPath, toCsv([...longTail].sort((a, b) => b.impressions - a.impressions)));
  const allNonBrandPath = path.join(OUT_DIR, `gsc_nonbusiness_all_${startDate}_to_${endDate}.csv`);
  fs.writeFileSync(allNonBrandPath, toCsv([...nonBrand].sort((a, b) => b.impressions - a.impressions)));

  console.log(`\nFull long-tail CSV: ${csvPath}`);
  console.log(`All non-business queries CSV: ${allNonBrandPath}`);
}

run().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
