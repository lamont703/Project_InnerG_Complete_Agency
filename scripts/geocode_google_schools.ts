import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts";

await config({ path: ".env.local", export: true });

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const googleMapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function geocodeGoogleSchools() {
  console.log("🚀 Starting Google Places API (New) Geocoding for Barber Schools...");
  
  const { data: schools, error } = await supabase
    .from("agent_barber_school_leads")
    .select("id, school_name, city")
    .is("formatted_address", null);

  if (error) {
    console.error("❌ Error fetching schools:", error);
    return;
  }

  if (!schools || schools.length === 0) {
    console.log("✨ All schools already have a formatted_address!");
    return;
  }

  console.log(`📡 Found ${schools.length} schools missing formatted_address. Querying Google Places API (New)...`);

  let successCount = 0;
  let skipCount = 0;

  for (const school of schools) {
    const queryStr = `${school.school_name} in ${school.city}, TX`;
    const url = `https://places.googleapis.com/v1/places:searchText`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googleMapsKey,
          'X-Goog-FieldMask': 'places.formattedAddress,places.location'
        },
        body: JSON.stringify({
          textQuery: queryStr
        })
      });
      const data = await res.json();

      if (data.places && data.places.length > 0) {
        const place = data.places[0];
        const formattedAddress = place.formattedAddress;
        const lat = place.location.latitude;
        const lng = place.location.longitude;
        
        const { error: updateError } = await supabase
          .from("agent_barber_school_leads")
          .update({ 
            formatted_address: formattedAddress,
            latitude: lat, 
            longitude: lng
          })
          .eq("id", school.id);

        if (updateError) {
          console.error(`❌ Error updating ${school.school_name}:`, updateError.message);
        } else {
          successCount++;
          console.log(`✅ Geocoded: ${school.school_name} -> ${formattedAddress}`);
        }
      } else {
        skipCount++;
        console.log(`⏭️  Google could not find location for: ${school.school_name}`);
      }
    } catch (e) {
      console.error(`Error geocoding ${school.school_name}:`, e);
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 200));
  }

  console.log("\n================================================");
  console.log(`🏁 GOOGLE GEOCODING COMPLETE`);
  console.log(`✅ Successfully Geocoded & Updated: ${successCount}`);
  console.log(`⏭️  Could not locate: ${skipCount}`);
  console.log("================================================\n");
}

geocodeGoogleSchools();
