import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts";

await config({ path: ".env.local", export: true });

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const mapboxKey = Deno.env.get("NEXT_PUBLIC_MAPBOX_API_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function geocodeSchools() {
  console.log("🚀 Starting Geocoding for Barber Schools...");
  
  const { data: schools, error } = await supabase
    .from("agent_barber_school_leads")
    .select("id, school_name, city, formatted_address");

  if (error) {
    console.error("❌ Error fetching schools:", error);
    return;
  }

  console.log(`📡 Found ${schools.length} schools. Geocoding via Mapbox...`);

  let successCount = 0;
  let skipCount = 0;

  for (const school of schools) {
    const queryStr = `${school.school_name}, ${school.city}, TX`;
    const query = encodeURIComponent(queryStr);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${mapboxKey}&limit=1`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.features && data.features.length > 0) {
        const [lon, lat] = data.features[0].center;
        const formatted_address = data.features[0].place_name;

        const { error: updateError } = await supabase
          .from("agent_barber_school_leads")
          .update({ 
            latitude: lat, 
            longitude: lon,
            formatted_address: formatted_address
          })
          .eq("id", school.id);

        if (updateError) {
          console.error(`❌ Error updating ${school.school_name}:`, updateError.message);
        } else {
          successCount++;
          console.log(`✅ Geocoded: ${school.school_name} -> [${lat}, ${lon}]`);
        }
      } else {
        skipCount++;
        console.log(`⏭️  Could not find location for: ${school.school_name}`);
      }
    } catch (e) {
      console.error(`Error geocoding ${school.school_name}:`, e);
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 100));
  }

  console.log("\n================================================");
  console.log(`🏁 GEOCODING COMPLETE`);
  console.log(`✅ Successfully Geocoded: ${successCount}`);
  console.log(`⏭️  Could not locate: ${skipCount}`);
  console.log("================================================\n");
}

geocodeSchools();
