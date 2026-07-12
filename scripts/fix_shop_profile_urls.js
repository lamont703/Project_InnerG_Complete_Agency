// One-time correction for scripts/populate_shop_urls.ts's two bugs:
// (1) it built URLs from the raw shop id, never updated after the slug
// migration, and (2) it wrote the literal string "{{contact.id}}" into
// the stored URL whenever contact_id was null, assuming GHL would
// resolve it later — GHL only resolves merge tags that appear inside its
// own message templates, not ones already baked into a stored data
// value, so those 392 rows were permanently broken. Confirmed live via
// /shop-day-map, which renders shop_profile_page_url directly as a link
// — that's how Google found and indexed the broken URLs.
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BASE_PROFILE_URL = "https://agency.innergcomplete.com/shop/";
const BASE_CUSTOMIZER_URL = "https://agency.innergcomplete.com/tools/shop-site-template/shop-website-customizer/";

async function fixShopProfileUrls() {
  let from = 0;
  const pageSize = 500;
  let totalFixed = 0;
  let totalErrors = 0;

  while (true) {
    const { data: shops, error } = await supabase
      .from("agent_barbershop_leads")
      .select("id, slug, shop_name, contact_id, shop_profile_page_url, customizer_url")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Fetch error:", error.message);
      process.exit(1);
    }
    if (!shops || shops.length === 0) break;

    for (const shop of shops) {
      if (!shop.slug) {
        console.warn(`Skipping ${shop.shop_name} (${shop.id}) — no slug assigned`);
        continue;
      }

      const tracking = shop.contact_id ? `?ghl_contact_id=${shop.contact_id}` : "";
      const newProfileUrl = `${BASE_PROFILE_URL}${shop.slug}${tracking}`;
      const newCustomizerUrl = `${BASE_CUSTOMIZER_URL}${shop.slug}/customizer${tracking}`;

      if (shop.shop_profile_page_url === newProfileUrl && shop.customizer_url === newCustomizerUrl) {
        continue; // already correct
      }

      const { error: updateError } = await supabase
        .from("agent_barbershop_leads")
        .update({ shop_profile_page_url: newProfileUrl, customizer_url: newCustomizerUrl })
        .eq("id", shop.id);

      if (updateError) {
        console.error(`Error updating ${shop.shop_name} (${shop.id}):`, updateError.message);
        totalErrors++;
      } else {
        totalFixed++;
      }
    }

    from += pageSize;
  }

  console.log(`Done. Fixed: ${totalFixed}. Errors: ${totalErrors}.`);
}

fixShopProfileUrls();
