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
  { table: "agent_barbershop_leads", imgCol: "google_images", idCol: "id" },
  { table: "agent_salon_leads", imgCol: "google_images", idCol: "id" },
  { table: "agent_barber_school_leads", imgCol: "google_photos", idCol: "id" },
  { table: "agent_cosmetology_school_leads", imgCol: "google_photos", idCol: "id" },
  { table: "agent_barber_supply_store_leads", imgCol: "google_images", idCol: "id" },
  { table: "agent_beauty_supply_store_leads", imgCol: "google_images", idCol: "id" }
];

async function run() {
  console.log("🧹 Starting cleanup of scraped Supabase images from database...\n");

  for (const target of TARGETS) {
    console.log(`Checking table: ${target.table}...`);
    
    const { data: rows, error } = await supabase
      .from(target.table)
      .select(`${target.idCol}, ${target.imgCol}`);

    if (error) {
      console.error(`  ❌ Error fetching from ${target.table}:`, error.message);
      continue;
    }

    let clearedCount = 0;

    for (const row of rows) {
      const images = row[target.imgCol];
      
      const hasSupabaseImage = Array.isArray(images) && images.some(url => url && url.includes('supabase.co'));
      
      if (hasSupabaseImage) {
        const updatePayload = {};
        updatePayload[target.imgCol] = []; // Clear the images array

        const { error: updateError } = await supabase
          .from(target.table)
          .update(updatePayload)
          .eq(target.idCol, row[target.idCol]);

        if (updateError) {
          console.error(`    ❌ Failed to clear row ${row[target.idCol]}:`, updateError.message);
        } else {
          clearedCount++;
        }
      }
    }
    console.log(`  ✅ Cleared Supabase images from ${clearedCount} rows in ${target.table}.`);
  }

  console.log("\n🏁 Cleanup completed. You can now safely delete the images from your Supabase storage bucket.");
}

run();
