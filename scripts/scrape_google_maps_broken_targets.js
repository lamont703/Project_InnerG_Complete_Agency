// Targeted rewrite of scrape_google_maps_actual.js — instead of walking
// every row per table and skipping whatever already has a supabase.co
// image (which mostly wastes attempts on rows with a real cached image
// or rows that were never actually broken), this queries specifically
// for rows still storing a live places.googleapis.com photo URL — the
// same 105-row set surfaced in the broken-image audit (7 barber schools,
// 25 cosmetology schools, 73 salons; shops/supply stores are excluded
// entirely since 0 of them are affected).
//
// Usage: node scripts/scrape_google_maps_broken_targets.js [--limit N] [--headful]

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Service Role Key in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_TABLES = [
  { table: "agent_barber_school_leads", imgCol: "google_photos", nameCol: "school_name", cityCol: "city", storageDir: "schools", label: "Barber School" },
  { table: "agent_cosmetology_school_leads", imgCol: "google_photos", nameCol: "school_name", cityCol: "city", storageDir: "schools", label: "Cosmetology School" },
  { table: "agent_salon_leads", imgCol: "google_images", nameCol: "shop_name", cityCol: "city", storageDir: "salons", label: "Salon" },
];

async function downloadImage(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer);
  } catch (err) {
    console.error(`  Download failed for ${url.slice(0, 60)}: ${err.message}`);
    return null;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchBrokenRows(target) {
  const { data, error } = await supabase
    .from(target.table)
    .select(`id, ${target.nameCol}, ${target.cityCol}, formatted_address, ${target.imgCol}`);
  if (error) {
    console.error(`Error fetching ${target.table}:`, error.message);
    return [];
  }
  return (data || []).filter((row) => {
    const arr = row[target.imgCol];
    return Array.isArray(arr) && arr.length > 0 && typeof arr[0] === "string" && arr[0].includes("places.googleapis.com");
  });
}

async function run() {
  const args = process.argv.slice(2);
  const limitArgIdx = args.indexOf('--limit');
  const limit = limitArgIdx !== -1 ? parseInt(args[limitArgIdx + 1], 10) : Infinity;
  const headful = args.includes('--headful');

  console.log("Launching Headless Google Maps Agent (Stealth Mode), targeting confirmed-broken rows only...");
  const browser = await puppeteer.launch({
    headless: !headful,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36");
  await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });
  await page.setViewport({ width: 1366, height: 900 });

  let attempted = 0;
  let recovered = 0;
  const stillBroken = [];

  for (const target of TARGET_TABLES) {
    const rows = await fetchBrokenRows(target);
    console.log(`\n${target.label}: ${rows.length} confirmed-broken rows`);

    for (const row of rows) {
      if (attempted >= limit) break;
      attempted++;

      const name = row[target.nameCol];
      const city = row[target.cityCol];
      const address = row.formatted_address || city;
      console.log(`\n[${attempted}] ${target.label}: "${name}" — ${address}`);

      const query = `${name} ${address || ''}`.trim();
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

      try {
        await sleep(2500); // anti-bot pacing
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(4000);

        // Open the real photo gallery rather than reading only the header
        // banner — the header can show a generic illustration even when
        // real photos exist elsewhere on the page.
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

        if (images.length === 0) {
          console.log(`  No real photos visible to this session — leaving row untouched.`);
          stillBroken.push({ table: target.table, id: row.id, name });
          continue;
        }

        console.log(`  Found ${images.length} real photo(s). Downloading...`);
        const cachedUrls = [];
        for (let i = 0; i < images.length; i++) {
          const buf = await downloadImage(images[i]);
          if (!buf) continue;
          const storagePath = `${target.storageDir}/${row.id}_${i}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from('entity-photos')
            .upload(storagePath, buf, { contentType: 'image/jpeg', upsert: true });
          if (uploadError) {
            console.error(`  Upload failed: ${uploadError.message}`);
            continue;
          }
          const { data: { publicUrl } } = supabase.storage.from('entity-photos').getPublicUrl(storagePath);
          cachedUrls.push(publicUrl);
        }

        if (cachedUrls.length > 0) {
          const { error: updateError } = await supabase
            .from(target.table)
            .update({ [target.imgCol]: cachedUrls })
            .eq('id', row.id);
          if (updateError) {
            console.error(`  DB update failed: ${updateError.message}`);
          } else {
            console.log(`  Recovered and re-hosted ${cachedUrls.length} photo(s) for "${name}".`);
            recovered++;
          }
        } else {
          stillBroken.push({ table: target.table, id: row.id, name });
        }
      } catch (err) {
        console.error(`  Scraping error for "${name}": ${err.message}`);
        stillBroken.push({ table: target.table, id: row.id, name });
      }
    }
    if (attempted >= limit) break;
  }

  await browser.close();
  console.log(`\nDone. Attempted: ${attempted}, recovered: ${recovered}, still broken: ${stillBroken.length}`);
  if (stillBroken.length > 0) {
    console.log("\nStill broken (no real photos visible to this scraping session):");
    for (const s of stillBroken) console.log(`  - [${s.table}] ${s.name} (${s.id})`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
