const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase URL or Service Role Key in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TARGETS = [
  { table: "agent_barbershop_leads", imgCol: "google_images", idCol: "id", nameCol: "shop_name", addressCol: "formatted_address", name: "shops" },
  { table: "agent_salon_leads", imgCol: "google_images", idCol: "id", nameCol: "shop_name", addressCol: "formatted_address", name: "salons" },
  { table: "agent_barber_school_leads", imgCol: "google_photos", idCol: "id", nameCol: "school_name", addressCol: "formatted_address", name: "schools" },
  { table: "agent_cosmetology_school_leads", imgCol: "google_photos", idCol: "id", nameCol: "school_name", addressCol: "formatted_address", name: "schools" },
  { table: "agent_barber_supply_store_leads", imgCol: "google_images", idCol: "id", nameCol: "name", addressCol: "formatted_address", name: "stores" },
  { table: "agent_beauty_supply_store_leads", imgCol: "google_images", idCol: "id", nameCol: "name", addressCol: "formatted_address", name: "stores" }
];

async function downloadImage(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer);
  } catch (err) {
    console.error(`  ⚠️ Download failed for ${url.slice(0, 60)}: ${err.message}`);
    return null;
  }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  const args = process.argv.slice(2);
  const limitArgIdx = args.indexOf('--limit');
  const limit = limitArgIdx !== -1 ? parseInt(args[limitArgIdx + 1], 10) : 5; 

  console.log("🚀 Launching Headless Google Maps Agent (Stealth Mode)...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  console.log(`\nProcessing up to ${limit} records missing cached images per table target...`);

  for (const target of TARGETS) {
    console.log(`\nChecking table: ${target.table}...`);
    
    const { data: rows, error } = await supabase
      .from(target.table)
      .select(`${target.idCol}, ${target.nameCol}, ${target.addressCol}, ${target.imgCol}`);

    if (error) {
      console.error(`❌ Error fetching from ${target.table}:`, error.message);
      continue;
    }

    let attempts = 0;

    for (const row of rows) {
      if (attempts >= limit) break;

      const id = row[target.idCol];
      const name = row[target.nameCol];
      const address = row[target.addressCol];
      const images = row[target.imgCol];

      const hasSupabaseImage = Array.isArray(images) && images.some(url => url && url.includes('supabase.co'));
      if (hasSupabaseImage) continue;

      attempts++; 
      console.log(`\n🔎 [Scraping] [Attempt ${attempts}/${limit}] Searching Maps for: "${name} - ${address || ''}"`);

      const query = `${name} ${address || ''}`.trim();
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
      
      const tryScrape = async (url) => {
        await sleep(3000); // Anti-bot pacing
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Wait an extra few seconds for the heavy maps DOM to render the side panel images
        await sleep(4000);
        
        return await page.evaluate(() => {
          const urls = new Set();
          
          document.querySelectorAll('img').forEach(img => {
            if (img.src && img.src.includes('googleusercontent.com/') && !img.src.includes('mapslogo')) {
              const highResSrc = img.src.split('=')[0] + '=w1000-h1000-k-no';
              urls.add(highResSrc);
            }
          });
          
          document.querySelectorAll('*').forEach(el => {
            const bg = window.getComputedStyle(el).backgroundImage;
            if (bg && bg.includes('googleusercontent.com/') && !bg.includes('mapslogo')) {
              const match = bg.match(/url\("?([^"=]+)/);
              if (match && match[1]) {
                const highResSrc = match[1] + '=w1000-h1000-k-no';
                urls.add(highResSrc);
              }
            }
          });
          
          return Array.from(urls).slice(0, 5);
        });
      };

      try {
        let scrapedUrls = await tryScrape(searchUrl);

        if (scrapedUrls.length === 0) {
          console.log(`  ⚠️ No images found for full address. Trying fallback query...`);
          // Fallback: Just the name and state (useful for schools and suites)
          const fallbackName = name.replace(/Cosmetology|High School|ISD/ig, '').trim();
          const fallbackQuery = `${fallbackName} Texas`;
          const fallbackUrl = `https://www.google.com/maps/search/${encodeURIComponent(fallbackQuery)}`;
          scrapedUrls = await tryScrape(fallbackUrl);
        }

        if (scrapedUrls.length === 0) {
          console.log(`  ⚠️ Still no images found on fallback. Skipping.`);
          continue;
        }

        console.log(`  Found ${scrapedUrls.length} high-res image candidates. Downloading...`);
        const cachedUrls = [];

        for (let i = 0; i < scrapedUrls.length; i++) {
          const imgBuffer = await downloadImage(scrapedUrls[i]);
          if (!imgBuffer) continue;

          const storagePath = `${target.name}/${id}_${i}.jpg`;
          console.log(`  Uploading to storage: entity-photos/${storagePath}`);

          const { error: uploadError } = await supabase.storage
            .from('entity-photos')
            .upload(storagePath, imgBuffer, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (uploadError) {
            console.error(`    ❌ Upload failed:`, uploadError.message);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('entity-photos')
            .getPublicUrl(storagePath);

          cachedUrls.push(publicUrl);
        }

        if (cachedUrls.length > 0) {
          const updatePayload = {};
          updatePayload[target.imgCol] = cachedUrls;

          const { error: updateError } = await supabase
            .from(target.table)
            .update(updatePayload)
            .eq(target.idCol, id);

          if (updateError) {
            console.error(`  ❌ Failed to update database row:`, updateError.message);
          } else {
            console.log(`  ✅ Successfully cached ${cachedUrls.length} Google Maps images for "${name}"!`);
          }
        }
      } catch (err) {
        console.error(`  ❌ Scraping error for ${name}:`, err.message);
      }
    }
  }

  await browser.close();
  console.log("\n🏁 Google Maps Scraping process completed.");
}

run();
