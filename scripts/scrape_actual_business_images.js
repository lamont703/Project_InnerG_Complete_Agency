const puppeteer = require('puppeteer');
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
  {
    name: "shops",
    table: "agent_barbershop_leads",
    idCol: "id",
    nameCol: "shop_name",
    addressCol: "formatted_address",
    imgCol: "google_images",
    isArray: true
  },
  {
    name: "salons",
    table: "agent_salon_leads",
    idCol: "id",
    nameCol: "shop_name",
    addressCol: "formatted_address",
    imgCol: "google_images",
    isArray: true
  },
  {
    name: "schools",
    table: "agent_barber_school_leads",
    idCol: "id",
    nameCol: "school_name",
    addressCol: "formatted_address",
    imgCol: "google_photos",
    isArray: true
  },
  {
    name: "schools",
    table: "agent_cosmetology_school_leads",
    idCol: "id",
    nameCol: "school_name",
    addressCol: "formatted_address",
    imgCol: "google_photos",
    isArray: true
  },
  {
    name: "stores",
    table: "agent_barber_supply_store_leads",
    idCol: "id",
    nameCol: "name",
    addressCol: "formatted_address",
    imgCol: "google_images",
    isArray: true
  },
  {
    name: "stores",
    table: "agent_beauty_supply_store_leads",
    idCol: "id",
    nameCol: "name",
    addressCol: "formatted_address",
    imgCol: "google_images",
    isArray: true
  }
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

async function run() {
  const args = process.argv.slice(2);
  const limitArgIdx = args.indexOf('--limit');
  const limit = limitArgIdx !== -1 ? parseInt(args[limitArgIdx + 1], 10) : 5; // Default to 5 records for safety

  console.log("🚀 Launching Headless Browser Agent...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

  console.log(`\nProcessing up to ${limit} records missing cached images...`);

  for (const target of TARGETS) {
    console.log(`\nChecking table: ${target.table}...`);
    
    const { data: rows, error } = await supabase
      .from(target.table)
      .select(`${target.idCol}, ${target.nameCol}, ${target.addressCol}, ${target.imgCol}`);

    if (error) {
      console.error(`❌ Error fetching from ${target.table}:`, error.message);
      continue;
    }

    let processed = 0;

    for (const row of rows) {
      if (processed >= limit) break;

      const id = row[target.idCol];
      const name = row[target.nameCol];
      const address = row[target.addressCol];
      const images = row[target.imgCol];

      // Skip if already populated with cached images (supabase URLs)
      const hasSupabaseImage = Array.isArray(images) && images.some(url => url && url.includes('supabase.co'));
      if (hasSupabaseImage) continue;

      console.log(`\n🔎 [Scraping] Searching for: "${name} - ${address || ''}"`);

      // Search Bing Images with Name + Address to target the actual business location
      const query = `${name} ${address || ''}`.trim();
      const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}`;
      
      try {
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Extract image urls from Bing search results page
        const scrapedUrls = await page.evaluate(() => {
          const imgElements = document.querySelectorAll('img.mimg');
          const urls = [];
          for (const img of imgElements) {
            const src = img.src || img.getAttribute('data-src') || img.getAttribute('src2');
            if (src && src.startsWith('http')) {
              urls.push(src);
            }
            if (urls.length >= 3) break; // Limit to 3 images per business
          }
          return urls;
        });

        if (scrapedUrls.length === 0) {
          console.log(`  ⚠️ No images found on search frontpage for this business.`);
          continue;
        }

        console.log(`  Found ${scrapedUrls.length} image candidates. Downloading...`);
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
            console.log(`  ✅ Successfully cached ${cachedUrls.length} images for "${name}"!`);
            processed++;
          }
        }
      } catch (err) {
        console.error(`  ❌ Scraping error for ${name}:`, err.message);
      }
    }
  }

  await browser.close();
  console.log("\n🏁 Scraping process completed.");
}

run();
