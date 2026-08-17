/**
 * READ-ONLY: Google Ads Keyword Planner demand check for NACCAS — the
 * accrediting body for most career beauty schools (see the NACCAS section of
 * CLAUDE.md). Two questions:
 *   1. Does anyone search "NACCAS" by name, nationally and in Texas?
 *   2. Do people search the CONCEPT (accredited beauty school) instead?
 * No ads are created; this only reads Keyword Planner metrics.
 *
 * Usage: node scripts/gads_naccas_demand.js
 */
require('dotenv').config({ path: '.env.local' });
const { internalEnv } = require('./_google_internal_oauth');
const { GoogleAdsApi, enums } = require('google-ads-api');

const {
  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_ADS_DEVELOPER_TOKEN,
  GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_LOGIN_CUSTOMER_ID, GOOGLE_ADS_REFRESH_TOKEN,
} = internalEnv();

const LANGUAGE_ENGLISH = 'languageConstants/1000';
const GEO_US = 'geoTargetConstants/2840';
const GEO_TEXAS = 'geoTargetConstants/21176';

// Brand-name phrasings, then the concept phrasings someone would use if they
// did NOT know the acronym.
const KEYWORDS = [
  'naccas',
  'naccas accreditation',
  'naccas accredited schools',
  'naccas accredited cosmetology schools',
  'what is naccas',
  'naccas handbook',
  'is naccas accreditation important',
  'naccas school search',
  'accredited cosmetology school',
  'accredited barber school',
  'accredited beauty school',
  'is my cosmetology school accredited',
  'cosmetology school accreditation',
  'barber school accreditation',
  'accredited cosmetology schools in texas',
  'accredited barber schools in texas',
];

const SEEDS = ['naccas', 'naccas accredited', 'cosmetology school accreditation', 'accredited beauty school'];

const COMP = { 0: 'UNKNOWN', 1: 'UNSPECIFIED', 2: 'LOW', 3: 'MEDIUM', 4: 'HIGH' };
const num = (v) => (v == null ? null : Number(v));
const pad = (s, n) => String(s).padEnd(n);
const fmt = (v) => (v == null ? 'no data' : v === 0 ? '0 (<10)' : v.toLocaleString());

async function metricsFor(customer, geo) {
  const res = await customer.keywordPlanIdeas.generateKeywordHistoricalMetrics({
    customer_id: GOOGLE_ADS_CUSTOMER_ID,
    keywords: KEYWORDS,
    language: LANGUAGE_ENGLISH,
    geo_target_constants: [geo],
    keyword_plan_network: enums.KeywordPlanNetwork.GOOGLE_SEARCH,
    include_adult_keywords: false,
  });
  const results = res.results || res || [];
  const byText = new Map();
  for (const r of results) {
    const m = r.keyword_metrics || {};
    byText.set((r.text || '').toLowerCase(), {
      avg: num(m.avg_monthly_searches),
      comp: COMP[m.competition] || m.competition || '—',
      monthly: m.monthly_search_volumes || [],
    });
  }
  return byText;
}

async function ideasFor(customer, geo, limit) {
  const res = await customer.keywordPlanIdeas.generateKeywordIdeas({
    customer_id: GOOGLE_ADS_CUSTOMER_ID,
    language: LANGUAGE_ENGLISH,
    geo_target_constants: [geo],
    keyword_plan_network: enums.KeywordPlanNetwork.GOOGLE_SEARCH,
    keyword_seed: { keywords: SEEDS },
  });
  return (res || [])
    .map((i) => ({
      text: i.text,
      avg: num(i.keyword_idea_metrics && i.keyword_idea_metrics.avg_monthly_searches),
      comp: COMP[i.keyword_idea_metrics && i.keyword_idea_metrics.competition] || '—',
    }))
    .filter((i) => i.avg)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, limit);
}

(async () => {
  for (const k of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CUSTOMER_ID', 'GOOGLE_ADS_REFRESH_TOKEN']) {
    if (!process.env[k]) { console.error('Missing ' + k); process.exit(1); }
  }
  const client = new GoogleAdsApi({ client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, developer_token: GOOGLE_ADS_DEVELOPER_TOKEN });
  const customer = client.Customer({ customer_id: GOOGLE_ADS_CUSTOMER_ID, login_customer_id: GOOGLE_ADS_LOGIN_CUSTOMER_ID || undefined, refresh_token: GOOGLE_ADS_REFRESH_TOKEN });

  console.log('NACCAS search demand — Google Ads Keyword Planner, avg monthly searches (Google Search)\n');
  const us = await metricsFor(customer, GEO_US);
  const tx = await metricsFor(customer, GEO_TEXAS);

  console.log(pad('KEYWORD', 46) + pad('US avg/mo', 12) + pad('TX avg/mo', 12) + 'competition');
  console.log('-'.repeat(84));
  for (const kw of KEYWORDS) {
    const u = us.get(kw.toLowerCase()) || {};
    const t = tx.get(kw.toLowerCase()) || {};
    console.log(pad(kw.slice(0, 44), 46) + pad(fmt(u.avg), 12) + pad(fmt(t.avg), 12) + (u.comp || '—'));
  }

  // 12-month trend for the bare brand term, to see whether demand is seasonal.
  const brand = us.get('naccas');
  if (brand && brand.monthly && brand.monthly.length) {
    console.log('\n"naccas" — US monthly search volume, last 12 reported months:');
    for (const m of brand.monthly.slice(-12)) {
      console.log('  ' + pad(`${m.year}-${String(m.month).padStart(2, '0')}`, 12) + fmt(num(m.monthly_searches)));
    }
  }

  console.log('\nRelated keyword ideas with real volume — US national (top 25):');
  for (const i of await ideasFor(customer, GEO_US, 25)) {
    console.log('  ' + pad(i.text.slice(0, 54), 56) + pad(i.avg.toLocaleString(), 10) + i.comp);
  }

  console.log('\nRelated keyword ideas with real volume — Texas (top 20):');
  for (const i of await ideasFor(customer, GEO_TEXAS, 20)) {
    console.log('  ' + pad(i.text.slice(0, 54), 56) + pad(i.avg.toLocaleString(), 10) + i.comp);
  }

  console.log('\nNotes:');
  console.log('- "no data" = Keyword Planner reported no metrics for that exact phrase.');
  console.log('- "0 (<10)" = below the reporting floor, effectively zero.');
  console.log('- Volumes are Google\'s rounded buckets, Google Search network, English.');
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
