import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts";

await config({ path: ".env.local", export: true });

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_PROFILE_URL = "https://agency.innergcomplete.com/shop/";
const BASE_CUSTOMIZER_URL = "https://agency.innergcomplete.com/tools/shop-site-template/shop-website-customizer/";

async function populateShopUrls() {
  console.log("🚀 Starting to append tracking IDs to shop_profile_page_url and customizer_url for all shops...");

  let hasMore = true;
  let totalSuccessCount = 0;
  let totalErrorCount = 0;

  while (hasMore) {
    // Fetch shops that haven't been updated with tracking yet
    const { data: shops, error: fetchError } = await supabase
      .from("agent_barbershop_leads")
      .select("id, shop_name, shop_profile_page_url, customizer_url, contact_id")
      .not("customizer_url", "like", "%ghl_contact_id%")
      .limit(1000);

    if (fetchError) {
      console.error("❌ Error fetching shops:", fetchError.message);
      Deno.exit(1);
    }

    if (!shops || shops.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`📡 Found batch of ${shops.length} shops needing URL population. Beginning updates...`);

    let batchSuccessCount = 0;

    for (const shop of shops) {
      const contactTracking = shop.contact_id ? `?ghl_contact_id=${shop.contact_id}` : `?ghl_contact_id={{contact.id}}`;

      let newProfileUrl = `${BASE_PROFILE_URL}${shop.id}`;
      let newCustomizerUrl = `${BASE_CUSTOMIZER_URL}${shop.id}/customizer`;

      newProfileUrl += contactTracking;
      newCustomizerUrl += contactTracking;

      const { error: updateError } = await supabase
        .from("agent_barbershop_leads")
        .update({ 
          shop_profile_page_url: newProfileUrl,
          customizer_url: newCustomizerUrl
        })
        .eq("id", shop.id);

      if (updateError) {
        console.error(`❌ Error updating ${shop.shop_name} (${shop.id}):`, updateError.message);
        totalErrorCount++;
      } else {
        batchSuccessCount++;
      }
      
      // Small delay to be polite to the database
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    totalSuccessCount += batchSuccessCount;
    console.log(`✅ Batch complete. Updated ${batchSuccessCount} shops in this pass.`);
  }

  console.log("\n================================================");
  console.log("🏁 URL TRACKING POPULATION COMPLETE");
  console.log(`✅ Successfully Updated: ${totalSuccessCount}`);
  console.log(`❌ Failed Updates: ${totalErrorCount}`);
  console.log("================================================");
}

populateShopUrls();
