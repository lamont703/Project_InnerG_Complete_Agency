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
  { table: "agent_barbershop_leads", imgCol: "google_images", nameCol: "shop_name" },
  { table: "agent_salon_leads", imgCol: "google_images", nameCol: "shop_name" },
  { table: "agent_barber_school_leads", imgCol: "google_photos", nameCol: "school_name" },
  { table: "agent_cosmetology_school_leads", imgCol: "google_photos", nameCol: "school_name" },
  { table: "agent_barber_supply_store_leads", imgCol: "google_images", nameCol: "name" },
  { table: "agent_beauty_supply_store_leads", imgCol: "google_images", nameCol: "name" }
];

async function run() {
  console.log("📊 Running Audit: Entities Missing Cached Google Maps Photos\n");
  
  let totalMissing = 0;
  let totalRows = 0;

  for (const target of TARGETS) {
    const { data: rows, error } = await supabase
      .from(target.table)
      .select(`id, ${target.nameCol}, ${target.imgCol}`);

    if (error) {
      console.error(`❌ Error fetching from ${target.table}:`, error.message);
      continue;
    }

    let tableMissing = [];

    for (const row of rows) {
      const images = row[target.imgCol];
      const hasSupabaseImage = Array.isArray(images) && images.some(url => url && url.includes('supabase.co'));
      
      if (!hasSupabaseImage) {
        tableMissing.push(row[target.nameCol]);
      }
    }

    console.log(`-- Table: ${target.table} --`);
    console.log(`Total Records: ${rows.length}`);
    console.log(`Missing Photos: ${tableMissing.length}`);
    
    if (tableMissing.length > 0) {
      console.log(`Sample missing: ${tableMissing.slice(0, 5).join(', ')}${tableMissing.length > 5 ? ', ...' : ''}`);
    }
    console.log();

    totalRows += rows.length;
    totalMissing += tableMissing.length;
  }

  console.log("=========================================");
  console.log(`Total Database Entities: ${totalRows}`);
  console.log(`Total Missing Photos: ${totalMissing} (${((totalMissing/totalRows)*100).toFixed(2)}%)`);
  console.log("=========================================\n");
}

run();
