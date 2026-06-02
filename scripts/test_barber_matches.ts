import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts";

await config({ path: ".env.local", export: true });

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testBarberMatches() {
  console.log("🚀 Testing Real-Time Barber Matches (10-mile radius)...");
  
  const { data, error } = await supabase
    .from("barber_matched_shops")
    .select("*");

  if (error) {
    console.error("❌ Error fetching from view:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log("⚠️ No barbers found with 'interested_in_placement' or no shops within 10 miles.");
    return;
  }

  console.log(`\n✅ Successfully fetched ${data.length} barbers looking for placement!\n`);

  for (const barber of data) {
    console.log(`💈 Barber: ${barber.barber_name} (ID: ${barber.barber_id})`);
    
    // The view aggregates matches into a JSON array, but if there are no matches, it might contain a null object
    // or just an empty array depending on the LEFT JOIN behavior in jsonb_agg
    const matches = barber.matched_shops.filter((m: any) => m && m.shop_id !== null);
    
    if (matches.length === 0) {
      console.log(`   └─ No shops currently hiring within a 10-mile radius.`);
    } else {
      console.log(`   └─ 🗺️  Found ${matches.length} shops within 10 miles!`);
      matches.forEach((shop: any) => {
        console.log(`      • ${shop.shop_name} (${shop.distance_miles} miles away)`);
      });
    }
    console.log("");
  }
}

testBarberMatches();
