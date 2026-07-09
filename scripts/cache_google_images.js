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
    imgCol: "google_images",
    isArray: true
  },
  {
    name: "salons",
    table: "agent_salon_leads",
    idCol: "id",
    imgCol: "google_images",
    isArray: true
  },
  {
    name: "schools",
    table: "agent_barber_school_leads",
    idCol: "id",
    imgCol: "google_photos",
    isArray: true
  },
  {
    name: "schools",
    table: "agent_cosmetology_school_leads",
    idCol: "id",
    imgCol: "google_photos",
    isArray: true
  },
  {
    name: "stores",
    table: "agent_barber_supply_store_leads",
    idCol: "id",
    imgCol: "google_images",
    isArray: true
  },
  {
    name: "stores",
    table: "agent_beauty_supply_store_leads",
    idCol: "id",
    imgCol: "google_images",
    isArray: true
  },
  {
    name: "events",
    table: "events",
    idCol: "id",
    imgCol: "image_url",
    isArray: false
  }
];

// Helper to download image binary
async function downloadImage(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer);
  } catch (err) {
    console.error(`  ⚠️ Download failed for ${url.slice(0, 80)}... Error: ${err.message}`);
    return null;
  }
}

// Main logic
async function run() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArgIdx = args.indexOf('--limit');
  const limit = limitArgIdx !== -1 ? parseInt(args[limitArgIdx + 1], 10) : null;

  if (dryRun) {
    console.log("🧪 DRY RUN MODE — No uploads or database writes will be executed.\n");
  }

  console.log("🚀 Starting Google Images cache sequence...");

  for (const target of TARGETS) {
    console.log(`\nChecking table: ${target.table} (${target.name})...`);

    // Fetch rows
    const { data: rows, error } = await supabase
      .from(target.table)
      .select(`${target.idCol}, ${target.imgCol}`);

    if (error) {
      console.error(`❌ Error fetching from ${target.table}:`, error.message);
      continue;
    }

    let processedCount = 0;

    for (const row of rows) {
      if (limit && processedCount >= limit) break;

      const id = row[target.idCol];
      const imgVal = row[target.imgCol];

      if (!imgVal) continue;

      let urls = target.isArray ? imgVal : [imgVal];
      if (!Array.isArray(urls)) urls = [];

      let updatedUrls = [...urls];
      let needsUpdate = false;

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];

        // Skip empty, invalid, or already cached URLs
        if (!url || typeof url !== 'string' || url.includes('supabase.co') || url.includes('d2zdpiztbgorvt.cloudfront.net') || url.includes('d220aniogakg8b.cloudfront.net')) {
          continue;
        }

        // We only cache Google Places / Maps / external source URLs
        if (url.includes('google') || url.includes('googleapis') || url.includes('googleusercontent') || url.includes('evbuc.com') || url.startsWith('http')) {
          console.log(`Found external image: ${url.slice(0, 60)}...`);
          console.log(`  Processing image ${i + 1} of ${urls.length} for ${target.name} ID: ${id}`);

          if (dryRun) {
            needsUpdate = true;
            processedCount++;
            continue;
          }

          // Download image
          const imageBuffer = await downloadImage(url);
          if (!imageBuffer) continue;

          // Upload to Supabase Storage
          const ext = 'jpg'; // We output as standard jpeg
          const storagePath = `${target.name}/${id}_${i}.${ext}`;
          
          console.log(`  Uploading to storage path: entity-photos/${storagePath}`);
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('entity-photos')
            .upload(storagePath, imageBuffer, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (uploadError) {
            console.error(`  ❌ Supabase storage upload failed:`, uploadError.message);
            continue;
          }

          // Generate public URL
          const { data: { publicUrl } } = supabase.storage
            .from('entity-photos')
            .getPublicUrl(storagePath);

          console.log(`  Uploaded successfully! Public URL: ${publicUrl}`);
          updatedUrls[i] = publicUrl;
          needsUpdate = true;
        }
      }

      if (needsUpdate && !dryRun) {
        const updatePayload = {};
        updatePayload[target.imgCol] = target.isArray ? updatedUrls : updatedUrls[0];

        const { error: updateError } = await supabase
          .from(target.table)
          .update(updatePayload)
          .eq(target.idCol, id);

        if (updateError) {
          console.error(`  ❌ Database update failed for ${target.table} ID ${id}:`, updateError.message);
        } else {
          console.log(`  ✅ Database record updated!`);
          processedCount++;
        }
      }
    }

    console.log(`Table ${target.table} processing completed. Processed/Updated: ${processedCount} records.`);
  }

  console.log("\n🏁 Caching execution completed successfully.");
}

run();
