/**
 * Fills financial-aid / outcomes columns on agent_barber_school_leads and
 * agent_cosmetology_school_leads directly from the U.S. Dept. of Education's
 * College Scorecard API (api.data.gov/ed/collegescorecard/v1), instead of
 * relying solely on the static "2026 Texas Barber and Cosmetology Financial
 * Aide Data.csv" snapshot merge_school_public_data.js uses.
 *
 * Why this exists: the CSV-based merge only reached ~19% of barber schools
 * and ~7% of cosmetology schools, mostly because its name+city matching drops
 * ambiguous multi-campus chains (confirmed live: "Houston Barber School"'s
 * Humble campus is filed under city "Houston" in Scorecard's own institution
 * record, not "Humble" — a city-string match can never find it). This script
 * disambiguates by ZIP code instead, which is far more reliable, and verified
 * field-for-field against a known-good existing row before being written:
 *
 *   latest.aid.pell_grant_rate            -> pell_grant_rate   (0.8019 match)
 *   latest.aid.federal_loan_rate          -> federal_loan_rate (0.6317 match)
 *   latest.cost.tuition.program_year      -> annual_tuition    (14000 match)
 *   latest.student.size                   -> student_body_size
 *   latest.completion.completion_rate_less_than_4yr_150nt -> completion_rate
 *   latest.earnings.1_yr_after_completion.median          -> median_earnings
 *   latest.repayment.3_yr_default_rate    -> default_rate
 *   latest.aid.median_debt.completers.overall -> median_student_debt
 *
 * REQUIRES A REAL API KEY for a full run. The public "DEMO_KEY" is capped at
 * roughly 10 requests/hour, which cannot cover ~880 schools. Get a free,
 * instant key at https://api.data.gov/signup/ and set it as
 * COLLEGE_SCORECARD_API_KEY in .env.local. The script still runs on DEMO_KEY
 * for small validation batches (--limit=5), backing off automatically when
 * the API's X-RateLimit-Remaining header hits zero.
 *
 * Usage:
 *   node scripts/fetch_college_scorecard_financial_aid.js --dry-run --limit=5
 *   node scripts/fetch_college_scorecard_financial_aid.js --table=barber
 *   node scripts/fetch_college_scorecard_financial_aid.js --table=cosmetology
 *   node scripts/fetch_college_scorecard_financial_aid.js --force   (re-match rows that already have data)
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.COLLEGE_SCORECARD_API_KEY || process.env.DATA_GOV_API_KEY || 'DEMO_KEY';
const USING_DEMO_KEY = API_KEY === 'DEMO_KEY';
const BASE_URL = 'https://api.data.gov/ed/collegescorecard/v1/schools';

const FIELDS = [
  'id',
  'school.name',
  'school.city',
  'school.zip',
  'latest.student.size',
  'latest.cost.tuition.program_year',
  'latest.cost.tuition.in_state',
  'latest.cost.tuition.out_of_state',
  'latest.completion.completion_rate_less_than_4yr_150nt',
  'latest.earnings.1_yr_after_completion.median',
  'latest.earnings.10_yrs_after_entry.median',
  'latest.repayment.3_yr_default_rate',
  'latest.aid.pell_grant_rate',
  'latest.aid.federal_loan_rate',
  'latest.aid.median_debt.completers.overall',
].join(',');

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;
const tableArg = process.argv.find((a) => a.startsWith('--table='));
const TABLE_FILTER = tableArg ? tableArg.split('=')[1] : 'all'; // 'barber' | 'cosmetology' | 'all'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Rows whose names indicate a K-12 program (high school cosmetology electives
// etc.) rather than a dedicated trade school. These are legitimate rows in
// our tables (they have real TDLR test-takers) but College Scorecard only
// covers postsecondary institutions, so querying it for them just burns
// rate-limited requests for a guaranteed miss.
const K12_PATTERN = /\b(high school|elementary|middle school|isd|independent school district)\b/i;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[''']/g, '')
    .replace(/\b(school|college|academy|of|the|inc|llc|beauty|barber(ing)?|cosmetology|hair|design|institute)\b/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordOverlapScore(a, b) {
  const wordsA = new Set(a.split(' ').filter((w) => w.length > 2));
  const wordsB = new Set(b.split(' ').filter((w) => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const overlap = [...wordsA].filter((w) => wordsB.has(w)).length;
  return overlap / Math.max(wordsA.size, wordsB.size);
}

function extractZip5(formattedAddress) {
  if (!formattedAddress) return null;
  // Grabs the LAST 5-digit run in the string so street numbers earlier in the
  // address don't get mistaken for a zip.
  const matches = formattedAddress.match(/\b\d{5}\b(?!.*\b\d{5}\b)/);
  return matches ? matches[0] : null;
}

// Query string sent to Scorecard's school.name filter (it does substring
// matching — confirmed live: "Milan Institute" returns all 4 TX Milan
// campuses). Strip a trailing " - City" / ", City" campus qualifier some of
// our rows carry so the search stays broad enough to find the parent record.
function buildQueryName(schoolName) {
  return (schoolName || '')
    .split(/\s[-–]\s|,/)[0]
    .trim();
}

let rateLimitRemaining = null;
let rateLimitLimit = null;

async function scorecardFetch(params) {
  const url = `${BASE_URL}?${new URLSearchParams({ api_key: API_KEY, fields: FIELDS, ...params }).toString()}`;
  const res = await fetch(url);

  rateLimitLimit = res.headers.get('x-ratelimit-limit') || rateLimitLimit;
  rateLimitRemaining = res.headers.get('x-ratelimit-remaining');

  if (res.status === 429 || (rateLimitRemaining !== null && Number(rateLimitRemaining) <= 0)) {
    const waitMs = USING_DEMO_KEY ? 60 * 60 * 1000 : 60 * 1000;
    console.log(`   ⏳ Rate limit hit (remaining=${rateLimitRemaining}). Sleeping ${waitMs / 1000}s...`);
    await sleep(waitMs);
    return scorecardFetch(params); // retry once slept
  }

  if (!res.ok) {
    throw new Error(`Scorecard API ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

async function findScorecardMatch(school) {
  // Direct id lookup — cheap, exact, used on re-syncs of already-matched rows.
  if (school.college_scorecard_id && !FORCE) {
    const data = await scorecardFetch({ id: school.college_scorecard_id });
    return data.results && data.results[0] ? data.results[0] : null;
  }

  const queryName = buildQueryName(school.school_name);
  if (!queryName) return null;

  const data = await scorecardFetch({
    'school.name': queryName,
    'school.state': 'TX',
    per_page: 20,
  });
  const candidates = data.results || [];
  if (candidates.length === 0) return null;

  const targetNorm = normalizeName(school.school_name);
  const targetZip5 = extractZip5(school.formatted_address);

  const scored = candidates
    .map((c) => ({
      candidate: c,
      nameScore: wordOverlapScore(targetNorm, normalizeName(c['school.name'])),
      zipMatch: targetZip5 && c['school.zip'] && c['school.zip'].slice(0, 5) === targetZip5,
    }))
    .filter((s) => s.nameScore >= 0.5);

  if (scored.length === 0) return null;
  if (scored.length === 1) return scored[0].candidate;

  // Multiple plausible candidates (multi-campus chain) — ZIP is the
  // disambiguator, not city, since Scorecard's own city field can disagree
  // with a campus's real municipality (this is exactly what broke the old
  // CSV-based match for Houston Barber School's Humble campus).
  const zipAgreeing = scored.filter((s) => s.zipMatch);
  if (zipAgreeing.length === 1) return zipAgreeing[0].candidate;
  if (zipAgreeing.length > 1) return zipAgreeing.sort((a, b) => b.nameScore - a.nameScore)[0].candidate;

  // No zip signal available on either side and still ambiguous — refuse to
  // guess, same conservative stance as merge_school_public_data.js.
  if (!targetZip5) return null;

  return scored.sort((a, b) => b.nameScore - a.nameScore)[0].candidate;
}

function toUpdate(result) {
  const tuition =
    result['latest.cost.tuition.program_year'] ??
    result['latest.cost.tuition.in_state'] ??
    result['latest.cost.tuition.out_of_state'] ??
    null;
  const earnings =
    result['latest.earnings.1_yr_after_completion.median'] ??
    result['latest.earnings.10_yrs_after_entry.median'] ??
    null;

  return {
    college_scorecard_id: result.id,
    college_scorecard_matched_at: new Date().toISOString(),
    student_body_size: result['latest.student.size'] ?? null,
    annual_tuition: tuition,
    completion_rate: result['latest.completion.completion_rate_less_than_4yr_150nt'] ?? null,
    median_earnings: earnings,
    default_rate: result['latest.repayment.3_yr_default_rate'] ?? null,
    pell_grant_rate: result['latest.aid.pell_grant_rate'] ?? null,
    federal_loan_rate: result['latest.aid.federal_loan_rate'] ?? null,
    median_student_debt: result['latest.aid.median_debt.completers.overall'] ?? null,
    public_data_matched_at: new Date().toISOString(),
  };
}

async function processTable(tableName) {
  console.log(`\n=== ${tableName} ===`);

  let query = supabase.from(tableName).select('id, school_name, city, formatted_address, college_scorecard_id, pell_grant_rate');
  if (!FORCE) query = query.is('pell_grant_rate', null);

  const { data: schools, error } = await query;
  if (error) {
    console.error(`Failed to load ${tableName}:`, error.message);
    return;
  }

  const eligible = schools.filter((s) => !K12_PATTERN.test(s.school_name || ''));
  const skippedK12 = schools.length - eligible.length;
  const toProcess = LIMIT ? eligible.slice(0, LIMIT) : eligible;

  console.log(`${schools.length} candidate rows, ${skippedK12} skipped as K-12 programs, processing ${toProcess.length}.`);
  if (USING_DEMO_KEY) {
    console.log(`⚠️  Using DEMO_KEY (~10 requests/hour). Set COLLEGE_SCORECARD_API_KEY in .env.local for a full run.`);
  }

  let matched = 0;
  let noMatch = 0;
  let failed = 0;

  for (const school of toProcess) {
    process.stdout.write(`  ${school.school_name} (${school.city || 'no city'})... `);
    try {
      const result = await findScorecardMatch(school);
      if (!result) {
        console.log('no confident match');
        noMatch++;
      } else {
        const update = toUpdate(result);
        console.log(
          `matched -> Scorecard #${result.id} (pell=${update.pell_grant_rate ?? 'n/a'}, tuition=${update.annual_tuition ?? 'n/a'})`
        );
        matched++;

        if (!DRY_RUN) {
          const { error: updateErr } = await supabase.from(tableName).update(update).eq('id', school.id);
          if (updateErr) console.error(`    update failed: ${updateErr.message}`);
        }
      }
    } catch (e) {
      console.log(`error: ${e.message}`);
      failed++;
    }

    // Polite base delay regardless of key tier; real keys have much higher
    // ceilings but there's no reason to hammer a free government API.
    await sleep(USING_DEMO_KEY ? 2000 : 350);
  }

  console.log(`\n${tableName} summary: matched=${matched}, no-match=${noMatch}, errors=${failed}, skipped-k12=${skippedK12}`);
}

async function run() {
  if (TABLE_FILTER === 'all' || TABLE_FILTER === 'barber') {
    await processTable('agent_barber_school_leads');
  }
  if (TABLE_FILTER === 'all' || TABLE_FILTER === 'cosmetology') {
    await processTable('agent_cosmetology_school_leads');
  }
  console.log('\nDone.');
}

run();
