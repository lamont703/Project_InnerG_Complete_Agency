import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts";

await config({ path: ".env.local", export: true });

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const GHL_API_KEY = process.env.GHL_API_KEY || "pit-96f9b0b9-c512-4066-81b6-d74ac075d8d4";
const CUSTOM_FIELD_ID = "cCoAAjVEaqRmeQ0fAfl8";

async function syncUrlsToGhl() {
  console.log("🚀 Starting GHL Contact Sync for Shop Profile URLs...");

  // Fetch shops that have a contact_id AND a shop_profile_page_url
  const { data: shops, error: fetchError } = await supabase
    .from("agent_barbershop_leads")
    .select("id, shop_name, contact_id, shop_profile_page_url")
    .not("contact_id", "is", null)
    .not("shop_profile_page_url", "is", null);

  if (fetchError) {
    console.error("❌ Error fetching shops:", fetchError.message);
    Deno.exit(1);
  }

  if (!shops || shops.length === 0) {
    console.log("✅ No shops found that have both a contact_id and a shop_profile_page_url. Nothing to update.");
    Deno.exit(0);
  }

  console.log(`📡 Found ${shops.length} contacts needing URL sync. Beginning updates...`);

  let successCount = 0;
  let errorCount = 0;

  for (const shop of shops) {
    try {
      const res = await fetch(`https://services.leadconnectorhq.com/contacts/${shop.contact_id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${GHL_API_KEY}`,
          "Version": "2021-07-28",
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          customFields: [
            {
              id: CUSTOM_FIELD_ID,
              key: "contact.shop_profile_page_url",
              field_value: shop.shop_profile_page_url
            }
          ]
        })
      });

      if (!res.ok) {
        const errorData = await res.text();
        console.error(`❌ GHL Error for ${shop.shop_name} (${shop.contact_id}):`, errorData);
        errorCount++;
      } else {
        console.log(`✅ Synced GHL Contact for ${shop.shop_name}`);
        successCount++;
      }
    } catch (err: any) {
      console.error(`❌ Catch Error for ${shop.shop_name}:`, err.message);
      errorCount++;
    }
    
    // Rate limit prevention (GHL limits API requests)
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  console.log("\n================================================");
  console.log("🏁 GHL URL SYNC COMPLETE");
  console.log(`✅ Successfully Synced: ${successCount}`);
  console.log(`❌ Failed Syncs: ${errorCount}`);
  console.log("================================================");
}

syncUrlsToGhl();
