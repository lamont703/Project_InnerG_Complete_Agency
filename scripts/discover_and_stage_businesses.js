// Manually-run, local-only discovery agent — searches Google Maps for
// "<category> in <city>" and stages each genuinely new business as a
// directive in agent_directives instead of inserting it directly into
// production. Approve (in the existing /admin/agent-directives dashboard)
// is what actually publishes it — see the publishDiscoveredBusiness()
// special case in app/api/agents/directives/update-status/route.ts.
//
// Deliberately local, not scheduled: (1) Puppeteer needs a real browser and
// a non-datacenter IP — running this from Vercel/cloud infrastructure on a
// recurring schedule is exactly the kind of automated pattern Google's
// anti-bot systems are primed to flag (we already hit a real reCAPTCHA
// block earlier this session). (2) No timers per your preference — you
// start it when you want it "on," Ctrl+C or let it finish when you want it
// "off."
//
// Two modes:
//   node scripts/discover_and_stage_businesses.js "Sugar Land TX"
//     Manual — discover exactly the city you name.
//   node scripts/discover_and_stage_businesses.js
//     Auto — pulls its target list from Google Ads Agent's own findings:
//     every city_expansion_opportunity directive you've APPROVED on the
//     dashboard (real Keyword Planner demand for a city we don't cover
//     yet) that hasn't already had a discovery run triggered for it. You
//     still decide which markets are worth expanding into by approving or
//     denying the Google Ads Agent's directive — this just removes the
//     manual "now go type that city into the discovery script" step once
//     you have.
//
// Either mode chains straight into the Entity Auditor Agent for whatever
// it just staged, reusing this same browser — no separate manual
// `node scripts/audit_staged_entities.js` step needed afterward.

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const { auditOne } = require('./audit_staged_entities');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const AGENT_NAME = 'Website Business Discovery Agent';
const MISSION = 'Find real businesses missing from our database and stage them for review before anything goes live.';
const GOOGLE_ADS_AGENT_NAME = 'Google Ads Agent';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function normalizeForCompare(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// PostgREST caps a single request at 1000 rows — agent_salon_leads (1536+)
// and agent_barbershop_leads (1090+) both already exceed that. A plain
// .select() here would silently miss real, already-published businesses
// outside whatever arbitrary 1000 rows come back, risking a wasted
// re-scrape at best and a genuine duplicate staged for Auto-Publish at
// worst. Mirrors lib/supabase-fetch-all.ts's fetchAllRows exactly (ported
// to CommonJS — scripts here don't import from the Next app).
async function fetchAllRows(table, columns) {
  let all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE - 1);
    if (error) {
      console.error(`fetchAllRows: ${table} failed:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function downloadImage(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.error(`    Photo download failed: ${err.message}`);
    return null;
  }
}

async function scrapeResultsList(page, maxScrolls = 6) {
  const feedSelector = 'div[role="feed"]';
  const hasFeed = await page.$(feedSelector);
  if (!hasFeed) return [];
  for (let i = 0; i < maxScrolls; i++) {
    await page.evaluate((sel) => {
      const feed = document.querySelector(sel);
      if (feed) feed.scrollTop = feed.scrollHeight;
    }, feedSelector);
    await sleep(1200);
  }
  return page.evaluate((sel) => {
    const feed = document.querySelector(sel);
    if (!feed) return [];
    // "Sponsored" ad cards use the exact same aria-label markup as real
    // results — confirmed live (Dallas run): "Belico Dallas Barbershop" got
    // captured as literally "Sponsored" and staged as a business under that
    // name. Filtering the label text itself here is a cheap, direct fix;
    // Entity Auditor Agent below is the safety net for anything that slips
    // through or was already staged before this fix existed.
    const GENERIC_LABELS = new Set(['sponsored', 'results', 'ad']);
    const cards = Array.from(feed.querySelectorAll('a[aria-label]')).filter(
      (a) => a.getAttribute('aria-label') && a.getAttribute('aria-label').length > 2
    );
    const seen = new Set();
    const out = [];
    for (const a of cards) {
      const name = a.getAttribute('aria-label').trim();
      if (GENERIC_LABELS.has(name.toLowerCase())) continue;
      if (seen.has(name)) continue;
      seen.add(name);
      out.push(name);
    }
    return out;
  }, feedSelector);
}

// Scoping fix (verified live): h1.closest('div')?.parentElement landed on a
// near-empty ancestor for many results — the real address/phone text sits
// several DOM levels higher. Walking up until an ancestor actually has
// enough real content (>=300 chars) adapts to whatever the real depth is.
async function extractFullDetail(page, name, city) {
  const query = `${name} ${city}`;
  await sleep(2000);
  await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(4000);

  const detail = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const resolvedName = h1 ? h1.textContent.trim() : null;
    // Confirmed live (Dallas run): re-searching a real business by exact
    // name can still land on a Sponsored ad card as the top/only result,
    // and its h1 literally reads "Sponsored" — this is a different failure
    // point than the results-list scrape above (that one saw the real
    // name fine), so it needs its own guard here.
    if (!h1 || ['results', 'sponsored', 'ad'].includes(resolvedName.toLowerCase())) return { name: null };

    let panel = h1.parentElement;
    for (let i = 0; i < 10 && panel; i++) {
      if ((panel.innerText || '').length >= 300) break;
      panel = panel.parentElement;
    }
    const panelText = panel ? panel.innerText : '';
    const lines = panelText.split('\n').map((l) => l.trim()).filter(Boolean);
    const addressLine = lines.find((l) => /\d/.test(l) && /(TX|Texas)\b|\b\d{5}\b/.test(l) && l.length < 90 && !/^\(/.test(l));
    const phoneLine = lines.find((l) => /^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(l));
    const withCount = panelText.match(/(\d\.\d)\((\d+)\)/);
    const bareRatingLine = lines.find((l) => /^\d\.\d$/.test(l));
    return {
      name: resolvedName,
      address: addressLine || null,
      phone: phoneLine || null,
      rating: withCount ? parseFloat(withCount[1]) : bareRatingLine ? parseFloat(bareRatingLine) : null,
      reviewCount: withCount ? parseInt(withCount[2], 10) : null,
    };
  });
  if (!detail.name) return null;

  const url = page.url();
  const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const latitude = coordMatch ? parseFloat(coordMatch[1]) : null;
  const longitude = coordMatch ? parseFloat(coordMatch[2]) : null;

  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const seePhotos = buttons.find((b) => b.textContent && b.textContent.trim().toLowerCase().includes('see photos'));
    if (seePhotos) seePhotos.click();
  });
  await sleep(2500);
  const images = await page.evaluate(() => {
    const urls = new Set();
    document.querySelectorAll('img').forEach((img) => {
      if (img.src && img.src.includes('googleusercontent.com/') && !img.src.includes('mapslogo')) {
        urls.add(img.src.split('=')[0] + '=w1000-h1000-k-no');
      }
    });
    return Array.from(urls).slice(0, 5);
  });

  return { ...detail, latitude, longitude, images };
}

// Cross-category duplicate guard — confirmed live: "Texas Hair Team -
// Conroe" got staged TWICE, once under agent_barbershop_leads and once
// under agent_salon_leads, same name + same address, because the
// dedup key (subjectKey below) includes the table, so a business showing
// up in both a "barbershops in X" and "hair salons in X" search (Google
// sometimes cross-lists, or a shop genuinely does both) was treated as two
// unrelated candidates. If both were ever approved/auto-published, that's
// a real duplicate live page for the same business. This builds a
// name+city -> table map from every currently staged candidate (any
// table) so a second category can recognize "this is the same business
// already staged under a different category" and skip it, rather than
// creating a second row.
async function fetchExistingCandidateMap() {
  const { data } = await supabase
    .from('agent_directives')
    .select('id, evidence')
    .eq('agent_name', AGENT_NAME)
    .in('status', ['pending', 'approved']);
  const map = new Map();
  for (const d of data || []) {
    const ev = d.evidence || {};
    if (!ev.name || !ev.city || !ev.table) continue;
    const key = `${normalizeForCompare(ev.name)}::${ev.city.toLowerCase()}`;
    map.set(key, { id: d.id, table: ev.table });
  }
  return map;
}

// Same upsert-by-subject-key behavior as lib/agent-directives.ts —
// duplicated here rather than imported since scripts in this repo are
// plain CommonJS, not the Next.js TS app. A denied candidate is NOT
// revived (a human already said "not this"); a fresh discovery of the
// same business gets its own new staged row.
async function stageFinding({ subjectKey, directiveText, evidence }) {
  const { data: existing } = await supabase
    .from('agent_directives')
    .select('id, times_recurred')
    .eq('agent_name', AGENT_NAME)
    .eq('subject_key', subjectKey)
    .in('status', ['pending', 'approved'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('agent_directives')
      .update({ directive_text: directiveText, evidence, last_seen_at: new Date().toISOString(), times_recurred: (existing.times_recurred || 1) + 1 })
      .eq('id', existing.id);
    return { staged: false, id: existing.id };
  }
  const { data: inserted } = await supabase
    .from('agent_directives')
    .insert({
      agent_name: AGENT_NAME,
      mission: MISSION,
      subject_key: subjectKey,
      directive_text: directiveText,
      evidence,
      status: 'pending',
    })
    .select('id')
    .single();
  return { staged: true, id: inserted?.id };
}

// Runs full discovery (all 3 categories) for one city. Returns a summary
// plus every {id, evidence} row this call staged or bumped this run, so the
// caller can chain straight into an audit pass without a re-query.
// candidateMap is shared/mutated across the whole run (see run()) so a
// cross-category duplicate is caught even within the same city's own pass.
async function discoverCity(browser, cityArg, cityLabel, candidateMap) {
  const CATEGORIES = [
    { query: `barbershops in ${cityArg}`, table: 'agent_barbershop_leads' },
    { query: `hair salons in ${cityArg}`, table: 'agent_salon_leads' },
    { query: `beauty salons in ${cityArg}`, table: 'agent_salon_leads' },
  ];
  const summary = { discovered: 0, alreadyLive: 0, staged: 0, recurred: 0, failed: 0, crossCategoryDuplicate: 0 };
  const stagedRows = [];

  for (const category of CATEGORIES) {
    console.log(`\n=== Searching: "${category.query}" ===`);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    await page.setViewport({ width: 1366, height: 900 });

    try {
      await sleep(2000);
      await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(category.query)}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await sleep(3500);
      const names = await scrapeResultsList(page);
      console.log(`  Found ${names.length} card(s) in results list.`);
      summary.discovered += names.length;

      const existingRows = await fetchAllRows(category.table, 'shop_name');
      const existingNames = new Set(existingRows.map((r) => normalizeForCompare(r.shop_name)));

      for (const name of names) {
        if (existingNames.has(normalizeForCompare(name))) {
          summary.alreadyLive++;
          continue;
        }
        console.log(`  New candidate: "${name}" — extracting detail...`);
        const detailPage = await browser.newPage();
        await detailPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
        await detailPage.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
        await detailPage.setViewport({ width: 1366, height: 900 });
        try {
          const detail = await extractFullDetail(detailPage, name, cityArg);
          if (!detail) {
            console.log(`    Skipping — could not resolve a confident single place.`);
            summary.failed++;
            await detailPage.close();
            continue;
          }

          const isShop = category.table === 'agent_barbershop_leads';

          const candidateKey = `${normalizeForCompare(detail.name)}::${cityLabel.toLowerCase()}`;
          const existingCandidate = candidateMap.get(candidateKey);
          if (existingCandidate && existingCandidate.table !== category.table) {
            console.log(`    Skipping — already staged as a ${existingCandidate.table === 'agent_barbershop_leads' ? 'barbershop' : 'salon'} under a different category (cross-category duplicate guard).`);
            summary.crossCategoryDuplicate++;
            await detailPage.close();
            continue;
          }

          const storageDir = isShop ? 'shops' : 'salons';
          const cachedUrls = [];
          for (let i = 0; i < detail.images.length; i++) {
            const buf = await downloadImage(detail.images[i]);
            if (!buf) continue;
            const tempPath = `${storageDir}/pending-${slugify(detail.name)}-${Date.now()}_${i}.jpg`;
            const { error: uploadError } = await supabase.storage.from('entity-photos').upload(tempPath, buf, { contentType: 'image/jpeg', upsert: true });
            if (uploadError) continue;
            const { data: { publicUrl } } = supabase.storage.from('entity-photos').getPublicUrl(tempPath);
            cachedUrls.push(publicUrl);
          }

          const evidence = {
            type: 'new_business_candidate',
            table: category.table,
            name: detail.name,
            city: cityLabel,
            formatted_address: detail.address,
            phone: detail.phone,
            rating: detail.rating,
            reviewCount: detail.reviewCount,
            latitude: detail.latitude,
            longitude: detail.longitude,
            images: cachedUrls,
          };
          const directiveText = `Found a real ${isShop ? 'barbershop' : 'salon'} not yet in our database: "${detail.name}" in ${cityLabel}${detail.rating ? ` (${detail.rating}★${detail.reviewCount ? `, ${detail.reviewCount} reviews` : ''})` : ''}. Directive: Review the details below and click Approve to publish this as a real profile page.`;
          const subjectKey = `new_business::${category.table}::${normalizeForCompare(detail.name)}::${cityLabel.toLowerCase()}`;

          const result = await stageFinding({ subjectKey, directiveText, evidence });
          if (result.staged) {
            console.log(`    Staged for review: "${detail.name}"`);
            summary.staged++;
          } else {
            console.log(`    Already staged (recurrence bumped): "${detail.name}"`);
            summary.recurred++;
          }
          if (result.id) {
            stagedRows.push({ id: result.id, evidence });
            candidateMap.set(candidateKey, { id: result.id, table: category.table });
          }
        } catch (err) {
          console.error(`    Error on "${name}": ${err.message}`);
          summary.failed++;
        }
        await detailPage.close();
      }
    } catch (err) {
      console.error(`  Error searching "${category.query}": ${err.message}`);
    }
    await page.close();
  }

  return { summary, stagedRows };
}

// Auto mode's target list: real, human-approved market intelligence from
// the Google Ads Agent — a city_expansion_opportunity directive means real
// Keyword Planner demand exists for a Texas city we don't cover yet, and
// "approved" means you've already decided that's a market worth pursuing.
// discoveryTriggered guards against re-running the exact same city forever
// on every no-arg invocation once it's been picked up once; pass the city
// explicitly (manual mode) any time you want to force a re-run.
async function fetchApprovedExpansionCities() {
  const { data, error } = await supabase
    .from('agent_directives')
    .select('id, evidence')
    .eq('agent_name', GOOGLE_ADS_AGENT_NAME)
    .eq('status', 'approved');
  if (error) {
    console.error('Failed to fetch approved city-expansion directives from Google Ads Agent:', error.message);
    return [];
  }
  return (data || []).filter((d) => d.evidence?.type === 'city_expansion_opportunity' && !d.evidence?.discoveryTriggered && d.evidence?.city);
}

async function run() {
  const cityArg = process.argv[2];

  let targets;
  if (cityArg) {
    targets = [{ cityArg, cityLabel: cityArg.replace(/\s*TX$/i, '').trim(), sourceDirective: null }];
  } else {
    const approved = await fetchApprovedExpansionCities();
    if (approved.length === 0) {
      console.log('Auto mode: no approved city-expansion directives from Google Ads Agent are waiting on discovery.');
      console.log('Either approve one at /admin/agent-directives, or run manually: node scripts/discover_and_stage_businesses.js "City TX"');
      return;
    }
    targets = approved.map((d) => ({ cityArg: `${d.evidence.city} TX`, cityLabel: d.evidence.city, sourceDirective: d }));
    console.log(`Auto mode: ${targets.length} approved expansion city/ies from Google Ads Agent — ${targets.map((t) => t.cityLabel).join(', ')}`);
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const overall = { discovered: 0, alreadyLive: 0, staged: 0, recurred: 0, failed: 0, crossCategoryDuplicate: 0, audited: 0, auditCleanedImages: 0, auditRecommendDelete: 0 };
  // Shared across every city/category this run touches, seeded from
  // whatever's already staged in the DB, so a cross-category duplicate is
  // caught whether the two sightings happen in the same run or a prior one.
  const candidateMap = await fetchExistingCandidateMap();

  for (const target of targets) {
    console.log(`\n\n########## City: ${target.cityLabel} ##########`);
    const { summary, stagedRows } = await discoverCity(browser, target.cityArg, target.cityLabel, candidateMap);
    overall.discovered += summary.discovered;
    overall.alreadyLive += summary.alreadyLive;
    overall.staged += summary.staged;
    overall.recurred += summary.recurred;
    overall.failed += summary.failed;
    overall.crossCategoryDuplicate += summary.crossCategoryDuplicate;

    if (stagedRows.length > 0) {
      console.log(`\n--- Auto-auditing ${stagedRows.length} newly staged candidate(s) for ${target.cityLabel} (Entity Auditor Agent) ---`);
      for (const row of stagedRows) {
        const { outcome } = await auditOne(browser, row);
        if (outcome === 'error') continue;
        overall.audited++;
        if (outcome === 'delete') overall.auditRecommendDelete++;
        else if (outcome === 'cleaned') overall.auditCleanedImages++;
      }
    }

    if (target.sourceDirective) {
      await supabase
        .from('agent_directives')
        .update({ evidence: { ...target.sourceDirective.evidence, discoveryTriggered: true, discoveryTriggeredAt: new Date().toISOString() } })
        .eq('id', target.sourceDirective.id);
    }
  }

  await browser.close();
  console.log('\n\n=== SUMMARY ===');
  console.log(JSON.stringify(overall, null, 2));
  console.log('\nReview staged + audited candidates at /admin/agent-directives — nothing above was published automatically.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
