import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts";

await config({ path: ".env.local", export: true });

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { count: total } = await supabase.from('agent_barbershop_leads').select('*', { count: 'exact', head: true });
  const { count: nullUrls } = await supabase.from('agent_barbershop_leads').select('*', { count: 'exact', head: true }).is('shop_profile_page_url', null);
  const { count: totalWithContactId } = await supabase.from('agent_barbershop_leads').select('*', { count: 'exact', head: true }).not('contact_id', 'is', null);
  const { count: unsyncedGhl } = await supabase.from('agent_barbershop_leads').select('*', { count: 'exact', head: true }).not('contact_id', 'is', null).is('shop_profile_page_url', null);

  console.log("Total Shops:", total);
  console.log("Shops missing URL in DB:", nullUrls);
  console.log("Shops with GHL contact_id:", totalWithContactId);
  console.log("Shops with GHL contact_id but missing URL in DB:", unsyncedGhl);
}
run();
