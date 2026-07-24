/**
 * READ-ONLY: for each of the three cosmetology-student themes, asks Google Ads
 * Keyword Planner for RELATED keyword ideas with real search volume (US
 * national). Answers "are related keywords getting searches" when the exact
 * long-tail phrasing returns no data. No ads created.
 *
 * Usage: node scripts/gads_keyword_ideas.js
 */
require('dotenv').config({ path: '.env.local' });
const { GoogleAdsApi, enums } = require('google-ads-api');

const {
  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_ADS_DEVELOPER_TOKEN,
  GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_LOGIN_CUSTOMER_ID, GOOGLE_ADS_REFRESH_TOKEN,
} = process.env;

const LANGUAGE_ENGLISH = 'languageConstants/1000';
const GEO_US = 'geoTargetConstants/2840';
const COMP = { 2: 'LOW', 3: 'MEDIUM', 4: 'HIGH' };

const THEMES = {
  'Exam & Licensing': [
    'cosmetology state board practice test', 'cosmetology written exam prep',
    'how to pass cosmetology state board', 'cosmetology practical exam',
  ],
  'Tools & Equipment': [
    'mannequin head for hair practice', 'cosmetology school kit',
    'hair cutting scissors', 'cosmetology student supplies',
  ],
  'Education & Career': [
    'cosmetology school financial aid', 'jobs after cosmetology school',
    'cosmetology continuing education', 'cosmetology license requirements',
  ],
};

(async () => {
  const client = new GoogleAdsApi({ client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, developer_token: GOOGLE_ADS_DEVELOPER_TOKEN });
  const customer = client.Customer({ customer_id: GOOGLE_ADS_CUSTOMER_ID, login_customer_id: GOOGLE_ADS_LOGIN_CUSTOMER_ID || undefined, refresh_token: GOOGLE_ADS_REFRESH_TOKEN });

  console.log('Google Ads Keyword Planner — related keyword ideas with volume (US national)\n');
  for (const [theme, seeds] of Object.entries(THEMES)) {
    const res = await customer.keywordPlanIdeas.generateKeywordIdeas({
      customer_id: GOOGLE_ADS_CUSTOMER_ID,
      language: LANGUAGE_ENGLISH,
      geo_target_constants: [GEO_US],
      keyword_plan_network: enums.KeywordPlanNetwork.GOOGLE_SEARCH,
      keyword_seed: { keywords: seeds },
    });
    const ideas = ((res) || []).map((i) => ({
      text: i.text,
      avg: i.keyword_idea_metrics ? Number(i.keyword_idea_metrics.avg_monthly_searches || 0) : 0,
      comp: i.keyword_idea_metrics ? (COMP[i.keyword_idea_metrics.competition] || '—') : '—',
    })).filter((i) => i.avg > 0).sort((a, b) => b.avg - a.avg);

    console.log(`\n=== ${theme} — top related keywords by US searches/mo (${ideas.length} with volume) ===`);
    ideas.slice(0, 18).forEach((i) => console.log(`  ${String(i.avg.toLocaleString()).padStart(8)}/mo  ${i.comp.padEnd(7)}  ${i.text}`));
  }
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
