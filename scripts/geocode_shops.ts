import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts";

await config({ path: ".env.local", export: true });

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const mapboxKey = Deno.env.get("NEXT_PUBLIC_MAPBOX_API_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function geocodeShops() {
  console.log("🚀 Starting Geocoding for Barber Shops...");
  
  // Fetch only shops that do not have coordinates yet
  const { data: shops, error } = await supabase
    .from("agent_barbershop_leads")
    .select("id, shop_name, formatted_address")
    .is("latitude", null);

  if (error) {
    console.error("❌ Error fetching shops:", error);
    return;
  }

  if (!shops || shops.length === 0) {
    console.log("✨ All shops are already geocoded!");
    return;
  }

  console.log(`📡 Found ${shops.length} shops needing coordinates. Geocoding via Mapbox...`);

  let successCount = 0;
  let skipCount = 0;

  for (const shop of shops) {
    if (!shop.formatted_address) {
      skipCount++;
      continue;
    }

    const query = encodeURIComponent(shop.formatted_address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${mapboxKey}&limit=1`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.features && data.features.length > 0) {
        const [lon, lat] = data.features[0].center;

        const { error: updateError } = await supabase
          .from("agent_barbershop_leads")
          .update({ 
            latitude: lat, 
            longitude: lon
          })
          .eq("id", shop.id);

        if (updateError) {
          console.error(`❌ Error updating ${shop.shop_name}:`, updateError.message);
        } else {
          successCount++;
          console.log(`✅ Geocoded: ${shop.shop_name} -> [${lat}, ${lon}]`);
        }
      } else {
        skipCount++;
        console.log(`⏭️  Could not find location for: ${shop.shop_name} (${shop.formatted_address})`);
      }
    } catch (e) {
      console.error(`Error geocoding ${shop.shop_name}:`, e);
    }

    // Rate limit sleep to avoid hitting Mapbox 429 errors
    await new Promise(r => setTimeout(r, 100));
  }

  console.log("\n================================================");
  console.log(`🏁 GEOCODING COMPLETE FOR BARBER SHOPS`);
  console.log(`✅ Successfully Geocoded: ${successCount}`);
  console.log(`⏭️  Could not locate: ${skipCount}`);
  console.log("================================================\n");
}

geocodeShops();
