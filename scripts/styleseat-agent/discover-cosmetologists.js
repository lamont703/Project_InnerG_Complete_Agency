/**
 * StyleSeat Discovery + Enrichment Agent — Houston Cosmetologists
 *
 * Combines discovery (search listing -> profile URLs) and enrichment
 * (visit each profile once for phone/address/services/photos/rating) into
 * a single pass, since a profile visit is required for the phone number
 * anyway (StyleSeat only shows it to logged-in users). Writes to
 * agent_cosmetologist_leads, reusing the booksy_* column names for schema
 * parity with agent_barber_leads even though the source here is StyleSeat.
 *
 * Requires scripts/styleseat-agent/auth.json (run save-session.js first).
 *
 * Usage:
 *   node discover-cosmetologists.js
 *   node discover-cosmetologists.js --limit=10   (cap new profiles processed)
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const SESSION_FILE = path.join(__dirname, 'auth.json');
const TARGET_TABLE = 'agent_cosmetologist_leads';

// Validated once via save-session.js login + interactive Houston search;
// stable/reusable across categories and pagination offsets.
const PLACE_ID = 'AQADAMUAlyJd0kLxxKtVfF7gNn9Al8TpravSN1OYoG7wJd9V3gENu41CFaxpWEbXxH61xP5Cb-Armak4ASPXr8IlMOo0tsy8vmO84_gIcTO2a57b6oJCBpcPyYWj1DJK2fQJX_Z37_r0InWWw9J-DxOKo3hNUYT4PM8liA-SRa8Tr_zepEuEAMGzBaz01OJ2JW7q-qNPzwShqFA6fZ64kUf236crMqGAUPJ1gFvlbgJxpoYkgCNPwsyaNCGM5zc0yZ2GVzIbNyxeuX8HHrc6KsDmqnS5hcna3iIrfXpOupzVLhrDPuLpMYBsdw';
const LAT = '29.7608026';
const LON = '-95.3695062';
const PAGE_SIZE = 30;

// Covers hair stylist / cosmetologist / makeup artist / nail tech / esthetician / eyelash
// artist per the requested scope. Overlapping categories (hair + cosmetologist,
// esthetician + facial) are fine — profile_url dedup collapses them.
const CATEGORIES = ['hair', 'cosmetologist', 'makeup-artist', 'nails', 'esthetician', 'facial', 'eyelashes'];

const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1], 10) : null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildListUrl(slug, from) {
  return `https://www.styleseat.com/m/search/houston-tx/${encodeURIComponent(slug)}?app=true&from=${from}&lat=${LAT}&lon=${LON}&placeId=${PLACE_ID}&sort=best`;
}

function cleanProfileUrl(href) {
  // Strip tracking query params; keep the canonical /m/v/{slug} path.
  try {
    const u = new URL(href);
    return `${u.origin}${u.pathname}`;
  } catch {
    return href.split('?')[0];
  }
}

async function collectProfileLinks(page) {
  console.log(`\n📋  Collecting profile links across ${CATEGORIES.length} categories in Houston...`);
  const allLinks = new Set();
  const ABSOLUTE_MAX_FROM = 600; // defense-in-depth cap regardless of reported total

  for (const slug of CATEGORIES) {
    let from = 0;
    let categoryTotal = 0;
    let reportedTotal = null;
    let previousPageLinks = null;

    while (from <= ABSOLUTE_MAX_FROM) {
      await page.goto(buildListUrl(slug, from), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(3000);

      if (reportedTotal === null) {
        reportedTotal = await page.evaluate(() => {
          const m = document.body.innerText.match(/Best [^\n]+\((\d+)\)/);
          return m ? parseInt(m[1], 10) : null;
        });
        if (reportedTotal !== null) console.log(`   "${slug}": site reports ${reportedTotal} total`);
      }

      const links = await page.evaluate(() => {
        return [...new Set(Array.from(document.querySelectorAll('a')).map((a) => a.href).filter((h) => /styleseat\.com\/m\/v\//.test(h)))];
      });

      if (links.length === 0) break;

      // If this page returned the exact same set as the previous page, the site has
      // started repeating/wrapping around rather than signaling true end-of-results.
      const cleanedThisPage = links.map(cleanProfileUrl);
      if (previousPageLinks && cleanedThisPage.every((l) => previousPageLinks.has(l))) {
        console.log(`   "${slug}": page repeated previous results at from=${from}, stopping.`);
        break;
      }
      previousPageLinks = new Set(cleanedThisPage);

      links.forEach((l) => allLinks.add(cleanProfileUrl(l)));
      categoryTotal += links.length;

      if (links.length < PAGE_SIZE) break; // last page for this category
      if (reportedTotal !== null && from + PAGE_SIZE >= reportedTotal) break; // hit the site's own reported total
      from += PAGE_SIZE;
      await sleep(500);
    }

    console.log(`   "${slug}": ${categoryTotal} listing(s) seen, ${allLinks.size} unique total so far`);
  }

  return Array.from(allLinks);
}

function parsePhone(bodyText) {
  const match = bodyText.match(/(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
  return match ? match[0] : null;
}

function parseAddress(bodyText) {
  const match = bodyText.match(/[\w.\s]+,\s*[A-Za-z\s]+,?\s*[A-Z]{2}\s*\d{5}/);
  return match ? match[0].trim() : null;
}

function parseServices(bodyText) {
  // Each service renders as (blank lines collapsed):
  //   Service Name
  //   [#N booked]        <- optional
  //   $Price[+]
  //   ·
  //   Duration
  //   Description...
  // Anchor on the reliable "$Price\n·\nDuration" triple, then walk backwards
  // for the nearest line that looks like a real service name (skips the
  // optional "#N booked" line and stray rating/review-count lines).
  const lines = bodyText.split('\n').map((l) => l.trim()).filter(Boolean);
  const services = [];

  for (let i = 0; i < lines.length - 2; i++) {
    const priceMatch = lines[i].match(/^\$(\d+)\+?$/);
    if (!priceMatch) continue;
    if (Number(priceMatch[1]) === 0) continue; // $0 entries are booking policy notices, not real services
    if (lines[i + 1] !== '·') continue;
    const durationLine = lines[i + 2];
    if (!/^\d+\s*(hr|min)/.test(durationLine)) continue;

    let name = null;
    for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
      const candidate = lines[j];
      if (/^#\d+\s*booked$/i.test(candidate)) continue;
      if (/^\d\.\d$/.test(candidate)) continue; // bare rating like "5.0"
      if (/^\(\d+\)$/.test(candidate)) continue; // bare review count like "(9)"
      if (/^\+\d+$/.test(candidate)) continue; // "+15" more-photos indicator
      if (/^See Times$/i.test(candidate)) continue;
      name = candidate;
      break;
    }
    if (!name || name.length < 2 || name.length > 80) continue;

    services.push({ name, duration: durationLine, price: Number(priceMatch[1]) });
  }

  // Dedupe by name+price
  const seen = new Set();
  return services.filter((s) => {
    const key = `${s.name}|${s.price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseRating(bodyText) {
  const match = bodyText.match(/(\d\.\d)\s*\n?\((\d+)\)/);
  if (!match) return { rating: null, reviewCount: null };
  return { rating: Number(match[1]), reviewCount: Number(match[2]) };
}

function extractPhotos(imgSrcs) {
  const byBaseId = new Map();
  for (const src of imgSrcs) {
    const m = src.match(/uploads\/.+?\/(\d+)_([a-f0-9]+)_(\d+)x(\d+)\.jpg/);
    if (!m) continue;
    const [, id, hash, w] = m;
    const key = `${id}_${hash}`;
    const width = Number(w);
    if (!byBaseId.has(key) || width > byBaseId.get(key).width) {
      byBaseId.set(key, { src, width });
    }
  }
  return Array.from(byBaseId.values())
    .sort((a, b) => b.width - a.width)
    .map((v) => v.src)
    .slice(0, 5);
}

async function scrapeProfile(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(4000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(2000);

  const bodyText = await page.evaluate(() => document.body.innerText);
  const title = await page.title();
  const name = title.split('|')[0].trim() || bodyText.split('\n')[0].trim();

  const imgSrcs = await page.evaluate(() => Array.from(document.querySelectorAll('img')).map((img) => img.src));
  const photos = extractPhotos(imgSrcs);
  const { rating, reviewCount } = parseRating(bodyText);

  return {
    name,
    phone: parsePhone(bodyText),
    address: parseAddress(bodyText),
    services: parseServices(bodyText),
    photos,
    rating,
    reviewCount,
  };
}

async function run() {
  if (!fs.existsSync(SESSION_FILE)) {
    console.error('❌  No saved session. Run: node save-session.js first.');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'] });
  const context = await browser.newContext({
    storageState: SESSION_FILE,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  try {
    let profileLinks = await collectProfileLinks(page);
    console.log(`\n✅  ${profileLinks.length} unique profile(s) found across all categories.`);

    // Dedup against existing cosmetologist rows AND barber leads (avoid re-adding
    // someone already tracked as a barber).
    console.log('🔄  Cross-referencing with database...');
    const [{ data: existingCosmet }, { data: existingBarbers }] = await Promise.all([
      supabase.from(TARGET_TABLE).select('profile_url'),
      supabase.from('agent_barber_leads').select('profile_url'),
    ]);
    const existingUrls = new Set([
      ...(existingCosmet || []).map((r) => r.profile_url),
      ...(existingBarbers || []).map((r) => r.profile_url),
    ]);
    profileLinks = profileLinks.filter((l) => !existingUrls.has(l));
    console.log(`   ${profileLinks.length} new profile(s) to scrape.`);

    if (LIMIT) profileLinks = profileLinks.slice(0, LIMIT);

    let succeeded = 0;
    let skippedNoPhone = 0;
    let failed = 0;

    for (let i = 0; i < profileLinks.length; i++) {
      const url = profileLinks[i];
      process.stdout.write(`[${i + 1}/${profileLinks.length}] ${url}... `);

      try {
        const data = await scrapeProfile(page, url);

        if (!data.phone) {
          console.log('no phone found, skipped');
          skippedNoPhone++;
          continue;
        }

        const prices = data.services.map((s) => s.price).filter((p) => p > 0);
        const priceRange = prices.length ? `USD ${Math.min(...prices)} - ${Math.max(...prices)}` : null;

        const { error } = await supabase.from(TARGET_TABLE).upsert(
          {
            name: data.name,
            phone: data.phone,
            address: data.address,
            profile_url: url,
            source: 'StyleSeat',
            status: 'pending_outreach',
            metro_area: 'Houston',
            booksy_photo_url: data.photos[0] || null,
            booksy_gallery_urls: data.photos,
            booksy_services: data.services.slice(0, 25),
            booksy_price_range: priceRange,
            booksy_rating: data.rating,
            booksy_review_count: data.reviewCount,
            booksy_scraped_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'phone' }
        );

        if (error) {
          console.log(`db error: ${error.message}`);
          failed++;
        } else {
          console.log(`ok (${data.services.length} services, ${data.photos.length} photos, rating ${data.rating ?? 'n/a'})`);
          succeeded++;
        }
      } catch (e) {
        console.log(`failed: ${e.message}`);
        failed++;
      }

      await sleep(1500);
    }

    console.log('\n=========================================');
    console.log(`✅  Success: ${succeeded}, No phone: ${skippedNoPhone}, Failed: ${failed}`);
    console.log('=========================================\n');
  } finally {
    await browser.close();
  }
}

run();
