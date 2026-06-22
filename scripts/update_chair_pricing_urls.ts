import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Make sure to load environment variables if not using --env-file
const supabaseUrl = process.env.SUPABASE_URL || "https://senkwhdxgtypcrtoggyf.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in environment variables.");
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Update this to match your actual production or staging domain
const BASE_URL = "https://agency.innergcomplete.com/tools/ai-booth-station"; 

async function updateUrls() {
  console.log("Fetching shops...");
  const { data: shops, error } = await supabase
    .from("agent_barbershop_leads")
    .select("id, shop_name, contact_id");

  if (error) {
    console.error("Error fetching shops:", error);
    return;
  }

  console.log(`Found ${shops.length} shops. Updating chair_pricing_tool_url...`);

  let successCount = 0;
  for (const shop of shops) {
    if (!shop.shop_name) continue;
    
    // Create URL-friendly slug (lowercase, replace non-alphanumeric with hyphens)
    const slug = shop.shop_name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    let url = `${BASE_URL}/${slug}`;
    
    // Add GHL tracking parameters
    if (shop.contact_id) {
      url += `?ghl_contact_id=${shop.contact_id}`;
    } else {
      url += `?ghl_contact_id={{contact.id}}`;
    }

    const { error: updateError } = await supabase
      .from("agent_barbershop_leads")
      .update({ chair_pricing_tool_url: url })
      .eq("id", shop.id);

    if (updateError) {
      console.error(`Error updating shop ${shop.id}:`, updateError);
    } else {
      successCount++;
      console.log(`Updated [${shop.shop_name}] -> ${url}`);
    }
  }

  console.log(`\nDone! Successfully updated ${successCount} out of ${shops.length} shops.`);
}

updateUrls();
