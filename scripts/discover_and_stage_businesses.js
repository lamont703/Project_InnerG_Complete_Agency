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
// Three modes:
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
//   node scripts/discover_and_stage_businesses.js --all-cities
//     State-wide sweep — every city in TX_CITIES below, one after another,
//     for every entity type. This is a genuinely long-running process (30+
//     cities x up to 6 categories each, with real Puppeteer navigation
//     delays) — meant to be started and left running, not a quick command.
//     No special resume logic needed: the existing cross-run dedup
//     (fetchExistingCandidateMap, already-live-name checks) means an
//     interrupted/restarted sweep naturally skips whatever's already
//     staged.
//
// Entity types covered per city: barbershops, hair/beauty salons,
// cosmetology/hair/beauty schools (all three via the Puppeteer/Maps-UI
// scrape), plus barber schools AND barber/beauty supply stores via the real
// Google Places API instead — see discoverViaPlacesAPI below. Barber schools
// look like they'd fit the Puppeteer path (same as cosmetology schools) but
// don't: agent_barber_school_leads carries a legacy contact_id TEXT UNIQUE
// NOT NULL column from its original life as a CRM outreach-tracking table,
// and every real row sets contact_id = place_id — confirmed live via a
// failed publish attempt against a Puppeteer-scraped candidate (no place_id
// available from the Maps-UI results list, same root cause as supply
// stores). Individual barbers/stylists are NOT covered here —
// confirmed live that Maps searches for "barbers"/"hair stylists" just
// return the same shop/salon businesses already found above, not
// separately-listed individual professionals, and those two entity types
// are 100% sourced from Booksy/StyleSeat today (scripts/booksy-agent/,
// scripts/styleseat-agent/) — a different tech stack entirely, not a fit
// for this Maps-based pipeline.
//
// Discovery only — no longer chains into Entity Auditor internally. Run
// `node scripts/audit_staged_entities.js --watch` alongside this (in its
// own terminal) to have anything staged here picked up and audited
// automatically, without needing to re-invoke anything by hand.

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

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
function titleCase(str) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Per-table discovery config — separate from (but consistent with) the
// TABLE_CONFIG in scripts/auto_publish_audited_entities.js /
// app/api/agents/directives/update-status/route.ts, which handles the
// real DB column names at publish time. This one just needs enough to
// scrape/stage correctly: which real column holds the name (for the
// "already live" dedup check), a human label for directive text, and a
// storage subfolder for downloaded photos.
const NAME_COLUMN_BY_TABLE = {
  agent_barbershop_leads: 'shop_name',
  agent_salon_leads: 'shop_name',
  agent_barber_school_leads: 'school_name',
  agent_cosmetology_school_leads: 'school_name',
  agent_barber_supply_store_leads: 'name',
  agent_beauty_supply_store_leads: 'name',
};
const CATEGORY_LABEL_BY_TABLE = {
  agent_barbershop_leads: 'barbershop',
  agent_salon_leads: 'salon',
  agent_barber_school_leads: 'barber school',
  agent_cosmetology_school_leads: 'cosmetology/beauty school',
  agent_barber_supply_store_leads: 'barber supply store',
  agent_beauty_supply_store_leads: 'beauty/hair supply store',
};
const STORAGE_DIR_BY_TABLE = {
  agent_barbershop_leads: 'shops',
  agent_salon_leads: 'salons',
  agent_barber_school_leads: 'schools',
  agent_cosmetology_school_leads: 'schools',
  agent_barber_supply_store_leads: 'stores',
  agent_beauty_supply_store_leads: 'stores',
};

// Same ~35-city real Texas list already established in
// app/api/agents/traffic-optimization/run/route.ts's TX_CITIES — ported
// here (scripts can't import from the Next app) for --all-cities mode.
const TX_CITIES = [
  'houston', 'katy', 'pearland', 'pasadena', 'humble', 'austin', 'dallas',
  'san antonio', 'sugar land', 'the woodlands', 'spring', 'cypress',
  'missouri city', 'baytown', 'conroe', 'league city', 'fort worth',
  'el paso', 'corpus christi', 'plano', 'laredo', 'irving', 'garland',
  'amarillo', 'mckinney', 'frisco', 'brownsville', 'pflugerville',
  'college station', 'beaumont', 'waco', 'tyler', 'sherman', 'eagle pass',
];

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
    { query: `cosmetology schools in ${cityArg}`, table: 'agent_cosmetology_school_leads' },
    { query: `beauty schools in ${cityArg}`, table: 'agent_cosmetology_school_leads' },
  ];
  // Barber schools deliberately NOT here — unlike agent_cosmetology_school_leads
  // (clean, school_name-only NOT NULL), agent_barber_school_leads still carries
  // a legacy contact_id TEXT UNIQUE NOT NULL column from its original life as a
  // CRM outreach-tracking table (migration 167). Confirmed live: every real row
  // sets contact_id = place_id (same value in both columns) — the Maps-UI
  // scrape here never gets a real place_id, so barber schools are discovered
  // via discoverViaPlacesAPI() below instead, same mechanism as supply stores.
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

      const nameColumn = NAME_COLUMN_BY_TABLE[category.table];
      const existingRows = await fetchAllRows(category.table, nameColumn);
      const existingNames = new Set(existingRows.map((r) => normalizeForCompare(r[nameColumn])));

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

          const categoryLabel = CATEGORY_LABEL_BY_TABLE[category.table];

          const candidateKey = `${normalizeForCompare(detail.name)}::${cityLabel.toLowerCase()}`;
          const existingCandidate = candidateMap.get(candidateKey);
          if (existingCandidate && existingCandidate.table !== category.table) {
            console.log(`    Skipping — already staged as a ${CATEGORY_LABEL_BY_TABLE[existingCandidate.table]} under a different category (cross-category duplicate guard).`);
            summary.crossCategoryDuplicate++;
            await detailPage.close();
            continue;
          }

          const storageDir = STORAGE_DIR_BY_TABLE[category.table];
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
          const directiveText = `Found a real ${categoryLabel} not yet in our database: "${detail.name}" in ${cityLabel}${detail.rating ? ` (${detail.rating}★${detail.reviewCount ? `, ${detail.reviewCount} reviews` : ''})` : ''}. Directive: Review the details below and click Approve to publish this as a real profile page.`;
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

// Supply stores can't go through the Maps-UI Puppeteer path above — both
// agent_barber_supply_store_leads and agent_beauty_supply_store_leads have
// a real `place_id TEXT UNIQUE NOT NULL` constraint (confirmed live via a
// failed test insert), and the Maps search-results-list page Puppeteer
// navigates to never exposes a real Google place_id (only a specific
// place's detail-page URL does, and this scraper doesn't reliably land
// there). The real Google Places API (New) searchText endpoint does
// return an authoritative place.id — same call shape already proven by
// scripts/pull_google_places_supply_stores.js /
// pull_google_places_beauty_supply_stores.js, which upsert directly into
// these tables today. This reuses that exact call, but STAGES into
// agent_directives instead, so it goes through the same human-review gate
// as everything else — one searchText call per city per term (not those
// scripts' full zip-code sweep, to keep API cost modest for a per-city
// discovery pass). No photos are fetched here (the field mask below
// doesn't request them, matching the existing precedent scripts) — a
// store discovered this way will need manual Approve rather than
// Auto-Publish's 5-photo bar, same as any barbershop/salon candidate with
// no photos found.
async function discoverViaPlacesAPI(cityArg, cityLabel, candidateMap) {
  const summary = { discovered: 0, alreadyLive: 0, staged: 0, recurred: 0, failed: 0, crossCategoryDuplicate: 0 };
  const stagedRows = [];

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.log('\n  GOOGLE_MAPS_API_KEY not set — skipping Places API discovery for this city.');
    return { summary, stagedRows };
  }

  // agent_barber_school_leads is here (not in discoverCity's Puppeteer
  // CATEGORIES) because it requires a real place_id (see contact_id note
  // above) — the only one of the "school" tables that does.
  const PLACES_API_TERMS = [
    { query: `barber supply store in ${cityArg}`, table: 'agent_barber_supply_store_leads' },
    { query: `beauty supply store in ${cityArg}`, table: 'agent_beauty_supply_store_leads' },
    { query: `hair supply store in ${cityArg}`, table: 'agent_beauty_supply_store_leads' },
    { query: `barber schools in ${cityArg}`, table: 'agent_barber_school_leads' },
  ];

  for (const term of PLACES_API_TERMS) {
    console.log(`\n=== Searching (Places API): "${term.query}" ===`);
    try {
      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.nationalPhoneNumber',
        },
        body: JSON.stringify({ textQuery: term.query, languageCode: 'en' }),
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error(`  Places API error: ${response.status} ${errText}`);
        continue;
      }
      const data = await response.json();
      const places = data.places || [];
      console.log(`  Found ${places.length} result(s).`);
      summary.discovered += places.length;

      const nameColumn = NAME_COLUMN_BY_TABLE[term.table];
      const existingRows = await fetchAllRows(term.table, `${nameColumn}, place_id`);
      const existingPlaceIds = new Set(existingRows.map((r) => r.place_id).filter(Boolean));
      const existingNames = new Set(existingRows.map((r) => normalizeForCompare(r[nameColumn])));

      for (const place of places) {
        const name = place.displayName?.text;
        if (!name) continue;
        if (existingPlaceIds.has(place.id) || existingNames.has(normalizeForCompare(name))) {
          summary.alreadyLive++;
          continue;
        }

        const candidateKey = `${normalizeForCompare(name)}::${cityLabel.toLowerCase()}`;
        const existingCandidate = candidateMap.get(candidateKey);
        if (existingCandidate && existingCandidate.table !== term.table) {
          console.log(`    Skipping "${name}" — already staged as a ${CATEGORY_LABEL_BY_TABLE[existingCandidate.table]} under a different category.`);
          summary.crossCategoryDuplicate++;
          continue;
        }

        const evidence = {
          type: 'new_business_candidate',
          table: term.table,
          name,
          city: cityLabel,
          formatted_address: place.formattedAddress || null,
          phone: place.nationalPhoneNumber || null,
          rating: place.rating ?? null,
          reviewCount: place.userRatingCount ?? null,
          latitude: place.location?.latitude ?? null,
          longitude: place.location?.longitude ?? null,
          images: [],
          place_id: place.id,
          place_types: (place.types || []).join(' | ') || null,
        };
        const directiveText = `Found a real ${CATEGORY_LABEL_BY_TABLE[term.table]} not yet in our database: "${name}" in ${cityLabel}${place.rating ? ` (${place.rating}★${place.userRatingCount ? `, ${place.userRatingCount} reviews` : ''})` : ''}. Directive: Review the details below and click Approve to publish this as a real profile page.`;
        const subjectKey = `new_business::${term.table}::${normalizeForCompare(name)}::${cityLabel.toLowerCase()}`;

        const result = await stageFinding({ subjectKey, directiveText, evidence });
        if (result.staged) {
          console.log(`    Staged for review: "${name}"`);
          summary.staged++;
        } else {
          console.log(`    Already staged (recurrence bumped): "${name}"`);
          summary.recurred++;
        }
        if (result.id) {
          stagedRows.push({ id: result.id, evidence });
          candidateMap.set(candidateKey, { id: result.id, table: term.table });
        }
      }
      await sleep(1000);
    } catch (err) {
      console.error(`  Error searching "${term.query}": ${err.message}`);
    }
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

const ALL_CITIES_MODE = process.argv.includes('--all-cities');

async function run() {
  const cityArg = !ALL_CITIES_MODE ? process.argv[2] : null;

  let targets;
  if (ALL_CITIES_MODE) {
    targets = TX_CITIES.map((c) => ({ cityArg: `${titleCase(c)} TX`, cityLabel: titleCase(c), sourceDirective: null }));
    console.log(`State-wide sweep mode: ${targets.length} Texas cities queued.`);
    console.log(`Cities: ${targets.map((t) => t.cityLabel).join(', ')}`);
    console.log('This will take a long time (many cities x up to 6 categories each, with real navigation delays) — safe to start and leave running.\n');
  } else if (cityArg) {
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
  const overall = { discovered: 0, alreadyLive: 0, staged: 0, recurred: 0, failed: 0, crossCategoryDuplicate: 0 };
  // Shared across every city/category this run touches, seeded from
  // whatever's already staged in the DB, so a cross-category duplicate is
  // caught whether the two sightings happen in the same run or a prior one.
  const candidateMap = await fetchExistingCandidateMap();

  for (const target of targets) {
    console.log(`\n\n########## City: ${target.cityLabel} ##########`);
    const { summary } = await discoverCity(browser, target.cityArg, target.cityLabel, candidateMap);
    const { summary: storeSummary } = await discoverViaPlacesAPI(target.cityArg, target.cityLabel, candidateMap);
    for (const key of Object.keys(overall)) {
      overall[key] += summary[key] + storeSummary[key];
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
  console.log('\nReview staged candidates at /admin/agent-directives. Run `node scripts/audit_staged_entities.js --watch` in another terminal to have these picked up and audited automatically.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
