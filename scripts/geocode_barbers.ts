import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts";

await config({ path: ".env.local", export: true });

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const mapboxKey = Deno.env.get("NEXT_PUBLIC_MAPBOX_API_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function geocodeBarberLeads() {
  console.log("🚀 Starting Geocoding for Barber Leads...");
  
  // Fetch only barbers that do not have coordinates yet
  const { data: barbers, error } = await supabase
    .from("agent_barber_leads")
    .select("id, name, address")
    .is("latitude", null);

  if (error) {
    console.error("❌ Error fetching barber leads:", error);
    return;
  }

  if (!barbers || barbers.length === 0) {
    console.log("✨ All barber leads are already geocoded!");
    return;
  }

  console.log(`📡 Found ${barbers.length} barber leads needing coordinates. Geocoding via Mapbox...`);

  let successCount = 0;
  let skipCount = 0;

  for (const barber of barbers) {
    if (!barber.address) {
      skipCount++;
      continue;
    }

    const query = encodeURIComponent(barber.address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${mapboxKey}&limit=1`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.features && data.features.length > 0) {
        const [lon, lat] = data.features[0].center;

        const { error: updateError } = await supabase
          .from("agent_barber_leads")
          .update({ 
            latitude: lat, 
            longitude: lon
          })
          .eq("id", barber.id);

        if (updateError) {
          console.error(`❌ Error updating ${barber.name}:`, updateError.message);
        } else {
          successCount++;
          console.log(`✅ Geocoded: ${barber.name} -> [${lat}, ${lon}]`);
        }
      } else {
        skipCount++;
        console.log(`⏭️  Could not find location for: ${barber.name} (${barber.address})`);
      }
    } catch (e) {
      console.error(`Error geocoding ${barber.name}:`, e);
    }

    // Rate limit sleep to avoid hitting Mapbox 429 errors
    await new Promise(r => setTimeout(r, 100));
  }

  console.log("\n================================================");
  console.log(`🏁 GEOCODING COMPLETE FOR BARBER LEADS`);
  console.log(`✅ Successfully Geocoded: ${successCount}`);
  console.log(`⏭️  Could not locate: ${skipCount}`);
  console.log("================================================\n");
}

geocodeBarberLeads();
