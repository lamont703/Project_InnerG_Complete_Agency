import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts";

await config({ path: ".env.local", export: true });

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = "https://agency.innergcomplete.com/shop/";

async function populateShopUrls() {
  console.log("🚀 Starting to populate shop_profile_page_url for all shops...");

  // Fetch ALL shops to regenerate URLs with tracking parameters
  const { data: shops, error: fetchError } = await supabase
    .from("agent_barbershop_leads")
    .select("id, shop_name, shop_profile_page_url, contact_id");

  if (fetchError) {
    console.error("❌ Error fetching shops:", fetchError.message);
    Deno.exit(1);
  }

  if (!shops || shops.length === 0) {
    console.log("✅ All shops already have a shop_profile_page_url. Nothing to update.");
    Deno.exit(0);
  }

  console.log(`📡 Found ${shops.length} shops needing URL population. Beginning updates...`);

  let successCount = 0;
  let errorCount = 0;

  for (const shop of shops) {
    let profileUrl = `${BASE_URL}${shop.id}`;
    if (shop.contact_id) {
       profileUrl += `?ghl_contact_id=${shop.contact_id}`;
    } else {
       profileUrl += `?ghl_contact_id={{contact.id}}`;
    }

    const { error: updateError } = await supabase
      .from("agent_barbershop_leads")
      .update({ shop_profile_page_url: profileUrl })
      .eq("id", shop.id);

    if (updateError) {
      console.error(`❌ Error updating ${shop.shop_name} (${shop.id}):`, updateError.message);
      errorCount++;
    } else {
      console.log(`✅ Updated: ${shop.shop_name} -> ${profileUrl}`);
      successCount++;
    }
    
    // Small delay to be polite to the database
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log("\n================================================");
  console.log("🏁 URL POPULATION COMPLETE");
  console.log(`✅ Successfully Updated: ${successCount}`);
  console.log(`❌ Failed Updates: ${errorCount}`);
  console.log("================================================");
}

populateShopUrls();
