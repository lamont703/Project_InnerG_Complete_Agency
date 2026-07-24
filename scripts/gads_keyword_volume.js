/**
 * READ-ONLY: pulls Google Ads Keyword Planner historical search volume for a
 * fixed list of cosmetology-student long-tail keywords, to confirm whether
 * they get any real search demand ("impressions"). US national + Texas.
 * No ads are created; this only reads Keyword Planner metrics.
 *
 * Usage: node scripts/gads_keyword_volume.js
 */
require('dotenv').config({ path: '.env.local' });
const { GoogleAdsApi, enums } = require('google-ads-api');

const {
  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_ADS_DEVELOPER_TOKEN,
  GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_LOGIN_CUSTOMER_ID, GOOGLE_ADS_REFRESH_TOKEN,
} = process.env;

const LANGUAGE_ENGLISH = 'languageConstants/1000';
const GEO_US = 'geoTargetConstants/2840';
const GEO_TEXAS = 'geoTargetConstants/21176';

const KEYWORDS = [
  // Exam & licensing
  'cosmetology state board practice test',
  'cosmetology state board practice test online',
  'how to pass the written cosmetology state board exam',
  'practical exam tips for cosmetology students',
  // Tools & equipment
  'best mannequin head for practicing hair cutting',
  'cheap professional hair scissors for cosmetology school',
  'what to put in a cosmetology student starter kit',
  // Education & career
  'how to get a job right after cosmetology school',
  'financial aid options for cosmetology programs',
  'best shoes to wear for standing all day in beauty school',
  'continuing education hours needed after getting cosmetology license',
];

const COMP = { 0: 'UNKNOWN', 1: 'UNSPECIFIED', 2: 'LOW', 3: 'MEDIUM', 4: 'HIGH' };
const num = (v) => (v == null ? null : Number(v));

async function metricsFor(customer, geo, label) {
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
      compIdx: num(m.competition_index),
      closeVariants: r.close_variants || [],
    });
  }
  return byText;
}

(async () => {
  for (const k of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CUSTOMER_ID', 'GOOGLE_ADS_REFRESH_TOKEN']) {
    if (!process.env[k]) { console.error('Missing ' + k); process.exit(1); }
  }
  const client = new GoogleAdsApi({ client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, developer_token: GOOGLE_ADS_DEVELOPER_TOKEN });
  const customer = client.Customer({ customer_id: GOOGLE_ADS_CUSTOMER_ID, login_customer_id: GOOGLE_ADS_LOGIN_CUSTOMER_ID || undefined, refresh_token: GOOGLE_ADS_REFRESH_TOKEN });

  console.log('Google Ads Keyword Planner — historical avg monthly searches (Google Search)\n');
  const us = await metricsFor(customer, GEO_US, 'US');
  const tx = await metricsFor(customer, GEO_TEXAS, 'TX');

  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad('KEYWORD', 62) + pad('US avg/mo', 12) + pad('TX avg/mo', 12) + 'competition');
  console.log('-'.repeat(100));
  for (const kw of KEYWORDS) {
    const u = us.get(kw.toLowerCase()) || {};
    const t = tx.get(kw.toLowerCase()) || {};
    const usv = u.avg == null ? 'no data' : (u.avg === 0 ? '0 (<10)' : u.avg.toLocaleString());
    const txv = t.avg == null ? 'no data' : (t.avg === 0 ? '0 (<10)' : t.avg.toLocaleString());
    console.log(pad(kw.slice(0, 60), 62) + pad(usv, 12) + pad(txv, 12) + (u.comp || '—'));
  }

  console.log('\nNotes:');
  console.log('- "no data" = Keyword Planner returned no metrics for that exact phrase (too little volume to report).');
  console.log('- "0 (<10)" = essentially zero searches (below the reporting floor).');
  console.log('- Numbers are avg monthly searches (broad-ish rounded buckets Google reports), Google Search network.');
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
