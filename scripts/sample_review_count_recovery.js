// Measures how many of the live "rating but no review count" rows the FIXED
// Maps scraper can actually recover, before committing to a full backfill run.
//
// Background: 336 published entities carry a real Google rating and a null
// review count. Two different causes are mixed together in that population and
// they have opposite prognoses:
//
//   (a) the old parser dropped a count that WAS on screen — a split-line
//       render, or a thousands separator ("4.8(1,234)") the old
//       /(\d\.\d)\((\d+)\)/ tail could not match. Now fixed, so re-scraping
//       recovers these.
//   (b) Google served a limited-view panel that rendered no count at all.
//       Re-scraping fails again no matter how good the parser is.
//
// This script measures the (a):(b) split on a sample so the full ~45-minute
// run is a decision backed by a number instead of a guess. It also answers the
// only question that matters for the rest of the plan: if recovery is poor,
// the scraper cannot fix this and the Places API (plus the place_id matching
// work those rows need) is the only remaining path.
//
// READ-ONLY by default — it reports and writes nothing. Pass --apply to
// persist the counts it successfully recovers.
//
// Usage:
//   node scripts/sample_review_count_recovery.js                # sample 25, report only
//   node scripts/sample_review_count_recovery.js --limit=50
//   node scripts/sample_review_count_recovery.js --table=agent_salon_leads
//   node scripts/sample_review_count_recovery.js --limit=25 --apply
//
// Must be run locally from a residential IP — this drives a real Google Maps
// session, which is the same permanent constraint documented for Business
// Discovery and Entity Auditor in SEO_AGENT_STRATEGY.md.

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const args = process.argv.slice(2);
const numArg = (flag, fallback) => {
  const raw = (args.find((a) => a.startsWith(`--${flag}=`)) || '').split('=')[1];
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const APPLY = args.includes('--apply');
const ALL = args.includes('--all');
const LIMIT = numArg('limit', 25);
const TABLE_FILTER = (args.find((a) => a.startsWith('--table=')) || '').split('=')[1] || null;

// Throttle tuning. The 25-row measurement run failed 32% of lookups, and the
// failures clustered in a near-contiguous late-batch run (items 15-17, 19-21,
// 23-24) while interleaved items still succeeded — that is Google rate-limiting
// ramping up mid-run, not bad listings. Fixed pacing would just hit the same
// wall harder over 336 rows, so the delay adapts: it grows on failure, decays
// back toward baseline on success, and a run of consecutive failures triggers a
// full cooldown before continuing.
const BASE_DELAY = numArg('delay', 2500);       // pre-navigation pause, floor
const MAX_DELAY = numArg('max-delay', 20000);   // ceiling for the adaptive ramp
const COOLDOWN_AFTER = numArg('cooldown-after', 4);   // consecutive failures that trigger a cooldown
const COOLDOWN_MS = numArg('cooldown', 120000); // 2 min, long enough to clear a soft block
const MAX_PASSES = numArg('passes', 3);         // retry passes over whatever still failed

// Same six tables the audit found affected. Barbers/cosmetologists are absent
// deliberately — they come from the Booksy pipeline, never touch this parser,
// and measured 0 broken rows.
const TARGETS = [
  { table: 'agent_barbershop_leads', nameCol: 'shop_name', reviewCol: 'total_reviews', label: 'Barbershops' },
  { table: 'agent_salon_leads', nameCol: 'shop_name', reviewCol: 'total_reviews', label: 'Salons' },
  { table: 'agent_beauty_supply_store_leads', nameCol: 'name', reviewCol: 'total_reviews', label: 'Beauty supply' },
  { table: 'agent_barber_supply_store_leads', nameCol: 'name', reviewCol: 'total_reviews', label: 'Barber supply' },
  { table: 'agent_barber_school_leads', nameCol: 'school_name', reviewCol: 'google_review_count', label: 'Barber schools' },
  { table: 'agent_cosmetology_school_leads', nameCol: 'school_name', reviewCol: 'google_review_count', label: 'Cosmetology schools' },
];

// Extraction is character-for-character the block now in
// discover_by_category.js / discover_and_import_businesses.js /
// audit_staged_entities.js. Kept in sync deliberately rather than shared,
// matching this codebase's per-script convention — if this diverges, the
// measurement stops predicting what the real backfill would do.
async function inspect(page, name, city, preDelay = 2000) {
  const query = [name, city].filter(Boolean).join(' ');
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  await sleep(preDelay);
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(4000);

  return page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const resolvedName = h1 ? h1.textContent.trim() : null;
    if (!h1 || resolvedName.toLowerCase() === 'results') {
      return { resolvedName: null, rating: null, reviewCount: null, panelChars: 0 };
    }

    let panel = h1.parentElement;
    for (let i = 0; i < 10 && panel; i++) {
      if ((panel.innerText || '').length >= 300) break;
      panel = panel.parentElement;
    }
    const panelText = panel ? panel.innerText : '';
    const lines = panelText.split('\n').map((l) => l.trim()).filter(Boolean);

    const combined = panelText.match(/(\d\.\d) ?\(([\d,]+)\)/);
    const ratingIdx = lines.findIndex((l) => /^\d\.\d$/.test(l));

    const toInt = (s) => {
      if (!s) return null;
      const n = parseInt(String(s).replace(/,/g, ''), 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    };

    const rating = combined
      ? parseFloat(combined[1])
      : ratingIdx >= 0
      ? parseFloat(lines[ratingIdx])
      : null;

    let nearbyCount = null;
    if (!combined && ratingIdx >= 0) {
      for (const l of lines.slice(ratingIdx + 1, ratingIdx + 3)) {
        const m = l.match(/^\(\s*([\d,]+)\s*\)$/) || l.match(/^([\d,]+)\s+reviews?$/i);
        if (m) { nearbyCount = toInt(m[1]); break; }
      }
    }

    const reviewCount = rating == null ? null : (toInt(combined && combined[2]) ?? nearbyCount);
    return { resolvedName, rating, reviewCount, panelChars: panelText.length };
  });
}

async function collectBroken() {
  const pool = [];
  for (const t of TARGETS) {
    if (TABLE_FILTER && t.table !== TABLE_FILTER) continue;
    const { data, error } = await supabase
      .from(t.table)
      .select(`slug, ${t.nameCol}, city, rating, ${t.reviewCol}`)
      .gt('rating', 0)
      .or(`${t.reviewCol}.is.null,${t.reviewCol}.eq.0`);
    if (error) {
      console.error(`  ! ${t.label}: ${error.message}`);
      continue;
    }
    (data || []).forEach((row) =>
      pool.push({
        ...t,
        slug: row.slug,
        name: row[t.nameCol],
        city: row.city,
        rating: row.rating,
      })
    );
  }
  return pool;
}

// Proportional stratified sample, so a table holding 56% of the defect
// contributes ~56% of the sample and the projection back to the full
// population is not skewed by whichever table happens to sort first.
function sample(pool, limit) {
  if (pool.length <= limit) return pool.slice();
  const byTable = new Map();
  for (const row of pool) {
    if (!byTable.has(row.table)) byTable.set(row.table, []);
    byTable.get(row.table).push(row);
  }
  const picked = [];
  for (const [, rows] of byTable) {
    const share = Math.max(1, Math.round((rows.length / pool.length) * limit));
    const shuffled = rows.slice().sort(() => Math.random() - 0.5);
    picked.push(...shuffled.slice(0, share));
  }
  return picked.slice(0, limit);
}

async function run() {
  console.log(`\nReview-count recovery sample — ${APPLY ? 'APPLY (will write)' : 'READ-ONLY (no writes)'}`);

  const pool = await collectBroken();
  if (!pool.length) {
    console.log('No rows with a rating and a missing review count. Nothing to measure.');
    return;
  }
  const chosen = ALL ? pool.slice() : sample(pool, LIMIT);
  console.log(`Population: ${pool.length} broken rows. Processing ${chosen.length}.`);
  console.log(`Throttle: base ${BASE_DELAY}ms, ceiling ${MAX_DELAY}ms, ${COOLDOWN_MS / 1000}s cooldown after ${COOLDOWN_AFTER} consecutive failures, up to ${MAX_PASSES} passes.\n`);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

  const outcomes = { recovered: [], no_count_rendered: [], lookup_failed: [], error: [] };
  let applied = 0;

  // Adaptive throttle, shared across passes so a pass that ends throttled
  // doesn't start the next one at full speed straight back into the wall.
  let delay = BASE_DELAY;
  let consecutiveFailures = 0;

  // One pass over `rows`; returns the rows that failed transiently (lookup
  // failures and errors) and are therefore worth retrying. Rows that resolved
  // to "no count rendered" are NOT retried — Maps answered, the count simply
  // isn't there, and hammering it again just burns rate limit.
  async function runPass(rows, passNum) {
    const retryable = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const tag = `[p${passNum} ${i + 1}/${rows.length}] ${row.name} (${row.city || '?'})`;
      let transient = false;
      try {
        const got = await inspect(page, row.name, row.city, delay);

        if (!got.resolvedName) {
          transient = true;
          console.log(`  ${tag} -> LOOKUP FAILED (no panel / blocked)`);
        } else if (got.reviewCount != null) {
          outcomes.recovered.push({ ...row, recovered: got.reviewCount, liveRating: got.rating });
          console.log(`  ${tag} -> RECOVERED ${got.reviewCount} reviews (rating ${got.rating})`);
          if (APPLY) {
            const patch = { [row.reviewCol]: got.reviewCount };
            const { error } = await supabase.from(row.table).update(patch).eq('slug', row.slug);
            if (error) console.log(`      ! write failed: ${error.message}`);
            else applied++;
          }
        } else {
          // Panel loaded and readable, but no count rendered — the genuinely
          // unrecoverable bucket, not a parser miss and not worth a retry.
          outcomes.no_count_rendered.push(row);
          console.log(`  ${tag} -> NO COUNT RENDERED (panel ${got.panelChars} chars, rating ${got.rating ?? 'none'})`);
        }
      } catch (err) {
        transient = true;
        console.log(`  ${tag} -> ERROR ${err.message.slice(0, 70)}`);
      }

      if (transient) {
        retryable.push(row);
        consecutiveFailures++;
        delay = Math.min(Math.round(delay * 1.8), MAX_DELAY);
        if (consecutiveFailures >= COOLDOWN_AFTER) {
          console.log(`  ... ${consecutiveFailures} consecutive failures — cooling down ${COOLDOWN_MS / 1000}s`);
          await sleep(COOLDOWN_MS);
          consecutiveFailures = 0;
          delay = BASE_DELAY;
        }
      } else {
        consecutiveFailures = 0;
        // Decay back toward baseline rather than snapping to it, so one lucky
        // success after a block doesn't immediately re-trigger the throttle.
        delay = Math.max(BASE_DELAY, Math.round(delay * 0.7));
      }
    }
    return retryable;
  }

  let pending = chosen;
  for (let p = 1; p <= MAX_PASSES && pending.length; p++) {
    if (p > 1) {
      console.log(`\n--- Pass ${p}: retrying ${pending.length} transient failure(s) after a ${COOLDOWN_MS / 1000}s cooldown ---\n`);
      await sleep(COOLDOWN_MS);
      delay = BASE_DELAY;
      consecutiveFailures = 0;
    }
    pending = await runPass(pending, p);
  }

  // Whatever is still pending after the last pass never resolved.
  outcomes.lookup_failed = pending;

  await browser.close();

  const n = chosen.length;
  const rec = outcomes.recovered.length;
  const none = outcomes.no_count_rendered.length;
  // Still unresolved after every retry pass — transient failures that never
  // became decisive, not evidence that the count doesn't exist.
  const failed = outcomes.lookup_failed.length;
  const pct = (x) => `${((x / n) * 100).toFixed(1)}%`;

  console.log(`\n${'='.repeat(64)}`);
  console.log(`RESULT — ${n} row(s), up to ${MAX_PASSES} pass(es)`);
  console.log('='.repeat(64));
  console.log(`  Recovered (parser fix worked)   ${String(rec).padStart(4)}  ${pct(rec)}`);
  console.log(`  No count rendered by Maps       ${String(none).padStart(4)}  ${pct(none)}`);
  console.log(`  Unresolved after all passes     ${String(failed).padStart(4)}  ${pct(failed)}`);

  // Project onto the full population. Unresolved lookups are excluded from the
  // rate because they are a transient session problem, not evidence either
  // way about whether the count exists — counting them as failures would
  // understate what a full run recovers.
  const decisive = rec + none;
  if (decisive > 0) {
    const rate = rec / decisive;
    console.log(`\n  Recovery rate on decisive lookups: ${(rate * 100).toFixed(1)}% (${rec}/${decisive})`);
    if (!ALL) {
      console.log(`  Projected recovery across all ${pool.length}: ~${Math.round(rate * pool.length)} rows`);
      console.log(`  Projected to remain on the "stars on Google" fallback: ~${pool.length - Math.round(rate * pool.length)} rows`);
    }
  } else {
    console.log('\n  No decisive lookups — every attempt failed. Likely rate-limited;');
    console.log('  re-run later from a residential IP before drawing any conclusion.');
  }

  if (failed) {
    console.log(`\n  ${failed} row(s) never resolved and were NOT written. Re-run to pick them up:`);
    outcomes.lookup_failed.slice(0, 8).forEach((r) => console.log(`    ${r.slug}`));
    if (failed > 8) console.log(`    ... and ${failed - 8} more`);
  }

  if (APPLY) console.log(`\n  Wrote ${applied} recovered count(s) to the database.`);
  else console.log('\n  READ-ONLY: nothing was written. Re-run with --apply to persist recovered counts.');

  if (outcomes.no_count_rendered.length) {
    console.log('\n  Sample of rows Maps rendered without any count:');
    outcomes.no_count_rendered.slice(0, 5).forEach((r) => console.log(`    ${r.slug}`));
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
