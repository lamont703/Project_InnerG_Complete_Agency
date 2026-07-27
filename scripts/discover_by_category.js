// General-purpose discovery: search Google Maps for "<category> in <city>"
// and scrape the results LIST (not a single known name — discover_missing_
// businesses.js and discover_and_import_businesses.js both only look up
// specific pre-known names, one at a time). Cross-checks each candidate
// against our real DB by name+address before importing, so re-runs don't
// duplicate businesses already there.
//
// Usage: node scripts/discover_by_category.js "Sugar Land TX"

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const cityArg = process.argv[2];
if (!cityArg) {
  console.error('Usage: node scripts/discover_by_category.js "City TX"');
  process.exit(1);
}

const CATEGORIES = [
  { query: `barbershops in ${cityArg}`, table: 'agent_barbershop_leads', kind: 'shop' },
  { query: `hair salons in ${cityArg}`, table: 'agent_salon_leads', kind: 'salon' },
  { query: `beauty salons in ${cityArg}`, table: 'agent_salon_leads', kind: 'salon' },
];

const cityLabel = cityArg.replace(/\s*TX$/i, '').trim();

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
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

// Scrolls the results panel to force Maps to lazy-load more cards, then
// extracts each card's name + a snippet of its surrounding text (rating,
// review count, address fragment usually appear as plain text near the
// name within the same card container).
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
    const cards = Array.from(feed.querySelectorAll('a[aria-label]'))
      .filter((a) => a.getAttribute('aria-label') && a.getAttribute('aria-label').length > 2);
    const seen = new Set();
    const out = [];
    for (const a of cards) {
      const name = a.getAttribute('aria-label').trim();
      if (seen.has(name)) continue;
      seen.add(name);
      const container = a.closest('div[role="article"]') || a.closest('div');
      const text = container ? container.innerText : '';
      out.push({ name, cardText: text.slice(0, 400) });
    }
    return out;
  }, feedSelector);
}

// Full-detail pass on one confirmed-new candidate, same scoped-extraction
// pattern proven in discover_and_import_businesses.js (unscoped body-text
// regexes previously matched a DIFFERENT nearby business's rating).
async function extractFullDetail(page, name, city) {
  const query = `${name} ${city}`;
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  await sleep(2000);
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(4000);

  const detail = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const resolvedName = h1 ? h1.textContent.trim() : null;
    if (!h1 || resolvedName.toLowerCase() === 'results') return { name: null };

    // Fixed live: h1.closest('div')?.parentElement (one hop up) landed on a
    // near-empty ancestor for this search flow — confirmed by direct
    // inspection the real address/phone text sits several DOM levels
    // higher. Walking up until an ancestor actually has enough real
    // content (>=300 chars) adapts to whatever the real depth is instead
    // of hardcoding a hop count that broke silently once already.
    let panel = h1.parentElement;
    for (let i = 0; i < 10 && panel; i++) {
      if ((panel.innerText || '').length >= 300) break;
      panel = panel.parentElement;
    }
    const panelText = panel ? panel.innerText : '';
    const lines = panelText.split('\n').map((l) => l.trim()).filter(Boolean);
    const addressLine = lines.find((l) => /\d/.test(l) && /(TX|Texas)\b|\b\d{5}\b/.test(l) && l.length < 90 && !/^\(/.test(l));
    const phoneLine = lines.find((l) => /^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(l));
    // Rating and review count are extracted INDEPENDENTLY. The previous
    // version required one combined /(\d\.\d)\((\d+)\)/ match for the count
    // to be saved at all; when Maps rendered the two on separate lines — or
    // the count carried a thousands separator ("4.8(1,234)", which the
    // `(\d+)\)` tail cannot match) — the regex failed, the bare-rating
    // fallback still recovered the rating, and reviewCount was silently left
    // null. That shipped 336 live rows carrying a real rating and no count,
    // biased toward the MOST-reviewed businesses. Every fallback below is
    // anchored to a whole line so a phone number's area code, "(713)", can
    // never be read as a review count.
    // The rating still requires a mandatory decimal and at most a single
    // space before the count — "\s*" with an optional decimal would span a
    // newline and match a zip code followed by a phone area code
    // ("...TX 78520\n(956) 555-2211" -> rating 0, count 956). Caught in test.
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

    // Split-line render: the count sits on one of the rating line's two
    // immediate neighbours. Scoped to those lines rather than the whole
    // panel so a nearby business's numbers can't bleed in (the same failure
    // the scoped-extraction comment above already documents), and both
    // accepted shapes are whole-line anchored so "(713) 555-1234" can never
    // be read as 713 reviews.
    let nearbyCount = null;
    if (!combined && ratingIdx >= 0) {
      for (const l of lines.slice(ratingIdx + 1, ratingIdx + 3)) {
        const m = l.match(/^\(\s*([\d,]+)\s*\)$/) || l.match(/^([\d,]+)\s+reviews?$/i);
        if (m) { nearbyCount = toInt(m[1]); break; }
      }
    }

    // A count is only meaningful attached to a real rating — an unattributed
    // number has no business reaching a production insert.
    const reviewCount = rating == null ? null : (toInt(combined && combined[2]) ?? nearbyCount);

    return {
      name: resolvedName,
      address: addressLine || null,
      phone: phoneLine || null,
      rating,
      reviewCount,
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

async function importBusiness(page, name, table) {
  const detail = await extractFullDetail(page, name, cityArg);
  if (!detail || !detail.name) {
    console.log(`  Skipping "${name}" — could not resolve a confident single place.`);
    return { name, imported: false, reason: 'no confident match' };
  }

  const isShop = table === 'agent_barbershop_leads';
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

  const id = crypto.randomUUID();
  const slug = `${slugify(detail.name)}-${slugify(cityLabel)}-${id.replace(/-/g, '').slice(0, 8)}`;

  const basePayload = {
    id,
    slug,
    shop_name: detail.name,
    city: `${cityLabel}${detail.address ? ` ${(detail.address.match(/\b(\d{5})\b/) || [])[1] || ''}` : ''}`.trim(),
    formatted_address: detail.address,
    phone: detail.phone,
    rating: detail.rating,
    total_reviews: detail.reviewCount,
    latitude: detail.latitude,
    longitude: detail.longitude,
    business_status: 'OPERATIONAL',
    google_images: cachedUrls,
  };
  const insertPayload = isShop
    ? { ...basePayload, place_types: 'barber_shop | point_of_interest | establishment', hiring_need: false, booth_count_available: 0 }
    : { ...basePayload, place_types: 'beauty_salon | point_of_interest | establishment' };

  const { error: insertError } = await supabase.from(table).insert(insertPayload);
  if (insertError) {
    console.error(`  Insert failed for "${detail.name}": ${insertError.message}`);
    return { name, imported: false, reason: insertError.message };
  }
  console.log(`  Imported "${detail.name}" -> ${table} / slug: ${slug} (rating ${detail.rating ?? '?'}, ${detail.reviewCount ?? '?'} reviews, ${cachedUrls.length} photo(s))`);
  // A rating with no count is the exact shape of the bug that shipped 336
  // rows rendering "rated 4.8 stars across 0 reviews" and made those pages
  // ineligible for AggregateRating. Never let it pass silently again.
  if (detail.rating != null && detail.reviewCount == null) {
    console.warn(`  ⚠ REVIEW COUNT MISSING for "${detail.name}" (rating ${detail.rating}) — slug: ${slug}. Needs a Places-API backfill.`);
  }
  return { name: detail.name, imported: true, slug, id, table };
}

// Fuzzy dupe check — real business names vary slightly in punctuation/case
// between what Maps shows and what's already stored, so an exact-string
// match would under-count real duplicates.
function normalizeForCompare(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function run() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  const results = { discovered: [], skippedExisting: [], imported: [], failed: [] };

  for (const category of CATEGORIES) {
    console.log(`\n=== Searching: "${category.query}" ===`);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    await page.setViewport({ width: 1366, height: 900 });

    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(category.query)}`;
    try {
      await sleep(2000);
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await sleep(3500);
      const cards = await scrapeResultsList(page);
      console.log(`  Found ${cards.length} card(s) in results list.`);
      results.discovered.push({ query: category.query, count: cards.length });

      const { data: existingRows } = await supabase.from(category.table).select('shop_name');
      const existingNames = new Set((existingRows || []).map((r) => normalizeForCompare(r.shop_name)));

      for (const card of cards) {
        const norm = normalizeForCompare(card.name);
        if (existingNames.has(norm)) {
          results.skippedExisting.push(card.name);
          continue;
        }
        console.log(`  New candidate: "${card.name}" — importing...`);
        const importPage = await browser.newPage();
        await importPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
        await importPage.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
        await importPage.setViewport({ width: 1366, height: 900 });
        try {
          const result = await importBusiness(importPage, card.name, category.table);
          if (result.imported) results.imported.push(result);
          else results.failed.push(result);
        } catch (err) {
          console.error(`  Error importing "${card.name}": ${err.message}`);
          results.failed.push({ name: card.name, imported: false, reason: err.message });
        }
        await importPage.close();
      }
    } catch (err) {
      console.error(`  Error searching "${category.query}": ${err.message}`);
    }
    await page.close();
  }

  await browser.close();

  console.log('\n\n=== FINAL SUMMARY ===');
  console.log(JSON.stringify(results, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
