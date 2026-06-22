import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts";

await config({ path: ".env.local", export: true });

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function mockData() {
  const shopId = "b345763a-551e-4dc5-8506-e6469c57d13e"; // Signature Fadez
  
  const { data, error } = await supabase
    .from("agent_barbershop_leads")
    .update({
      opportunity_status: "BATTLEGROUND ZONE",
      top_anchor_tenants: [
        { name: "McDonald's", type: "Fast Food", reviews: 1379, rating: 3.6 },
        { name: "Taco Bell", type: "Fast Food", reviews: 1310, rating: 3.8 },
        { name: "888 Chinese Bistro", type: "Restaurant", reviews: 1119, rating: 4.2 },
        { name: "ALDI", type: "Supermarket", reviews: 661, rating: 4.5 }
      ],
      competitor_count_800m: 10,
      local_wealth_indicator: "$ VALUE/VOLUME ZONE",
      review_momentum_status: "🟢 STABLE",
      ai_culture_summary: "Family-Friendly | High-Quality Precision Fades",
      radar_last_updated_at: new Date().toISOString()
    })
    .eq("id", shopId)
    .select();
    
  if (error) console.error("Error:", error);
  else console.log("Success! Updated data for Signature Fadez:", data);
}

mockData();
