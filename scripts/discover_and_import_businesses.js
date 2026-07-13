// Two-part follow-up to discover_missing_businesses.js:
//   PASS A: retry the searches that came back ambiguous ("Results" only)
//           or empty, using a fixed extraction (the old one grabbed a
//           generic "Results" link because it didn't exclude known UI
//           aria-labels before taking the first match).
//   PASS B: for the 6 already-confirmed real businesses, pull full detail
//           (address, phone, coordinates, real photos) and insert each
//           as a new row in the correct table (shops vs salons).
//
// Usage: node scripts/discover_and_import_businesses.js

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

// Plain array, not a Set — page.evaluate() serializes arguments through
// Puppeteer's protocol boundary, and a Set doesn't survive that trip with
// its .has() method intact (confirmed live: "generic.has is not a
// function" on the very first search, before anything else ran).
const GENERIC_LABELS = [
  "results", "directions", "search", "search this area", "zoom in", "zoom out",
  "collapse side panel", "menu", "search nearby", "share", "search along route",
];

async function downloadImage(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.error(`  Photo download failed: ${err.message}`);
    return null;
  }
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// --- PASS A: retry with fixed extraction ---
const RETRY_TARGETS = [
  { name: "Fanatics Barber Shop", city: "Pearland TX" },
  { name: "Trinity Salon", city: "Pearland TX" },
  { name: "Vintage Barber Shop", city: "Pearland TX" },
  { name: "Katy's Barber Parlor", city: "Katy TX" },
  { name: "Diesel Barbershop", city: "Katy TX" },
  { name: "Studio Brows Etc", city: "Katy TX" },
];

async function retrySearch(page, target) {
  const query = `${target.name} ${target.city}`;
  console.log(`\n[Retry] Searching: "${query}"`);
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  await sleep(2500);
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(5000);

  const matches = await page.evaluate((generic) => {
    const h1 = document.querySelector('h1');
    if (h1 && h1.textContent) {
      const t = h1.textContent.trim();
      if (t.length > 0 && t.toLowerCase() !== 'results') {
        return [{ name: t, single: true }];
      }
    }
    const cards = Array.from(document.querySelectorAll('a[aria-label]'))
      .map((a) => ({ el: a, label: (a.getAttribute('aria-label') || '').trim() }))
      .filter(({ label }) => label.length > 2 && !generic.includes(label.toLowerCase()));
    return cards.slice(0, 5).map(({ el, label }) => {
      const container = el.closest('div');
      const text = container ? container.innerText.slice(0, 250) : '';
      return { name: label, context: text, single: false };
    });
  }, GENERIC_LABELS);

  if (matches.length === 0) {
    console.log("  Still no results.");
  } else {
    matches.forEach((m) => console.log(`  - ${m.name}${m.context ? ` | ${m.context.replace(/\n/g, ' ')}` : ''}`));
  }
  return matches;
}

// --- PASS B: full detail extraction + insert ---
// Original 6 confirmed businesses, plus real new finds surfaced by Pass
// A's retry that were checked against our DB first and aren't already
// there (Chophouse Barber Company and Perfect Barber, also from that
// retry, ARE already in our data under those exact addresses — skipped).
// The first 7 (Barbers On The Lake, Joe Black Barber Shop, Level Up
// Barbershop, A Shaving Grace, Change Barber Studio, Aurea Salon, Madison
// Reed) already imported successfully in the prior run and had their
// rating/review_count corrected afterward — not repeated here.
const IMPORT_TARGETS = [
  { searchName: "Katy's Barber Parlor", city: "Katy TX", table: "agent_barbershop_leads", cityLabel: "Katy" },
  { searchName: "Katy Barbershop", city: "Katy TX", table: "agent_barbershop_leads", cityLabel: "Katy" },
  { searchName: "Katy Klips", city: "Katy TX", table: "agent_barbershop_leads", cityLabel: "Katy" },
  { searchName: "5TH Street Barber Shop", city: "Katy TX", table: "agent_barbershop_leads", cityLabel: "Katy" },
  { searchName: "Diesel Barbershop Katy Ranch", city: "Katy TX", table: "agent_barbershop_leads", cityLabel: "Katy" },
  { searchName: "Diesel Barbershop Spring Green", city: "Katy TX", table: "agent_barbershop_leads", cityLabel: "Katy" },
  { searchName: "StudioBrowsEtc", city: "Katy TX", table: "agent_salon_leads", cityLabel: "Katy" },
];

async function extractFullDetail(page, target) {
  const query = `${target.searchName} ${target.city}`;
  console.log(`\n[Import] Extracting: "${query}"`);
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  await sleep(2500);
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(4500);

  // Scoped to the panel right around the h1 — NOT document.body.innerText.
  // Confirmed live (A Shaving Grace): an unscoped body-text regex silently
  // matched a "Nearby" section's rating/review count belonging to a
  // different business entirely (5.0/162 instead of the real 3.9, no
  // count shown at all in this session's limited view) and that wrong
  // value went straight into a production insert before this fix.
  const detail = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const name = h1 ? h1.textContent.trim() : null;
    if (!h1) return { name: null, address: null, phone: null, rating: null, reviewCount: null };

    const panel = h1.closest('div')?.parentElement;
    const panelText = panel ? panel.innerText : '';
    const lines = panelText.split('\n').map((l) => l.trim()).filter(Boolean);
    const addressLine = lines.find((l) => /\d/.test(l) && /(TX|Texas)\b|\b\d{5}\b/.test(l) && l.length < 90 && !/^\(/.test(l));
    const phoneLine = lines.find((l) => /^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(l));
    // Rating sometimes has no "(count)" next to it at all in a limited
    // session view (confirmed live) — try the full "4.7(495)" pattern
    // first, then fall back to a bare "4.7" on its own line right after
    // the name, and leave reviewCount null rather than guess.
    const withCount = panelText.match(/(\d\.\d)\((\d+)\)/);
    const bareRatingLine = lines.find((l) => /^\d\.\d$/.test(l));
    return {
      name,
      address: addressLine || null,
      phone: phoneLine || null,
      rating: withCount ? parseFloat(withCount[1]) : bareRatingLine ? parseFloat(bareRatingLine) : null,
      reviewCount: withCount ? parseInt(withCount[2], 10) : null,
    };
  });

  // Lat/long from the URL Maps redirected to, e.g. /place/.../@29.7,-95.3,17z
  const url = page.url();
  const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const latitude = coordMatch ? parseFloat(coordMatch[1]) : null;
  const longitude = coordMatch ? parseFloat(coordMatch[2]) : null;

  // Photos: same "click See photos" pattern proven in the recovery script.
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const seePhotos = buttons.find((b) => b.textContent && b.textContent.trim().toLowerCase().includes('see photos'));
    if (seePhotos) seePhotos.click();
  });
  await sleep(3000);
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

async function importBusiness(page, target) {
  const detail = await extractFullDetail(page, target);
  console.log("  Detail:", JSON.stringify({ ...detail, images: `${detail.images.length} photo(s)` }));

  if (!detail.name) {
    console.log("  Skipping — could not resolve a confident single place.");
    return { target, imported: false, reason: "no confident match" };
  }

  // Download + upload real photos
  const isShop = target.table === "agent_barbershop_leads";
  const storageDir = isShop ? "shops" : "salons";
  const cachedUrls = [];
  for (let i = 0; i < detail.images.length; i++) {
    const buf = await downloadImage(detail.images[i]);
    if (!buf) continue;
    const tempPath = `${storageDir}/pending-${slugify(detail.name)}-${Date.now()}_${i}.jpg`;
    const { error: uploadError } = await supabase.storage.from('entity-photos').upload(tempPath, buf, { contentType: 'image/jpeg', upsert: true });
    if (uploadError) {
      console.error(`  Upload failed: ${uploadError.message}`);
      continue;
    }
    const { data: { publicUrl } } = supabase.storage.from('entity-photos').getPublicUrl(tempPath);
    cachedUrls.push(publicUrl);
  }

  // slug is NOT NULL UNIQUE on both tables, so it has to be present on
  // the very first insert — generating the id client-side (Postgres
  // accepts an explicit id over the gen_random_uuid() default) lets the
  // slug's 8-hex-char suffix be computed up front instead of needing a
  // second insert-then-update round trip that would violate NOT NULL.
  const id = crypto.randomUUID();
  const slug = `${slugify(detail.name)}-${slugify(target.cityLabel)}-${id.replace(/-/g, "").slice(0, 8)}`;

  const basePayload = {
    id,
    slug,
    shop_name: detail.name,
    city: `${target.cityLabel}${detail.address ? ` ${(detail.address.match(/\b(\d{5})\b/) || [])[1] || ""}` : ""}`.trim(),
    formatted_address: detail.address,
    phone: detail.phone,
    rating: detail.rating,
    total_reviews: detail.reviewCount,
    latitude: detail.latitude,
    longitude: detail.longitude,
    business_status: "OPERATIONAL",
    google_images: cachedUrls,
  };

  const insertPayload = isShop
    ? { ...basePayload, place_types: "barber_shop | point_of_interest | establishment", hiring_need: false, booth_count_available: 0 }
    : { ...basePayload, place_types: "beauty_salon | point_of_interest | establishment" };

  const { error: insertError } = await supabase.from(target.table).insert(insertPayload);
  if (insertError) {
    console.error(`  Insert failed: ${insertError.message}`);
    return { target, imported: false, reason: insertError.message };
  }

  console.log(`  Imported as ${target.table} / slug: ${slug}`);
  return { target, imported: true, slug, id, photosRecovered: cachedUrls.length };
}

async function run() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36");
  await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });
  await page.setViewport({ width: 1366, height: 900 });

  // Pass A already succeeded on the prior run (found Katy's Barber
  // Parlor, both Diesel Barbershop locations, StudioBrowsEtc, Change
  // Barber Studio, etc. — folded into IMPORT_TARGETS below) — skipping
  // the re-search here so this run doesn't repeat 6 searches for no new
  // information and add unnecessary load.
  const RUN_PASS_A = process.argv.includes('--with-pass-a');
  console.log(RUN_PASS_A ? "=== PASS A: Retry ambiguous/not-found searches ===" : "=== PASS A skipped (already succeeded last run) ===");
  const retryResults = [];
  if (RUN_PASS_A) {
    for (const target of RETRY_TARGETS) {
      const matches = await retrySearch(page, target);
      retryResults.push({ ...target, matches });
    }
  }

  console.log("\n\n=== PASS B: Full detail extraction + import for confirmed businesses ===");
  // Each target gets its own fresh tab — reusing one tab across all of
  // Pass A's searches and into Pass B is what broke detail extraction
  // last run (every h1 came back null after ~6 navigations in the same
  // tab; a brand-new tab per search sidesteps whatever Maps session
  // state was causing that, at the cost of one extra newPage() call).
  const importResults = [];
  for (const target of IMPORT_TARGETS) {
    const importPage = await browser.newPage();
    await importPage.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36");
    await importPage.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });
    await importPage.setViewport({ width: 1366, height: 900 });
    // A timeout or any other error on one target used to crash the whole
    // batch and silently skip everything after it — confirmed live, the
    // last run died on target 8 of 14 and never attempted the other 6.
    try {
      const result = await importBusiness(importPage, target);
      importResults.push(result);
    } catch (err) {
      console.error(`  Error on "${target.searchName}": ${err.message}`);
      importResults.push({ target, imported: false, reason: err.message });
    }
    await importPage.close();
  }

  await browser.close();

  console.log("\n\n=== FINAL SUMMARY ===");
  console.log("\nRetry results:");
  console.log(JSON.stringify(retryResults, null, 2));
  console.log("\nImport results:");
  console.log(JSON.stringify(importResults, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
