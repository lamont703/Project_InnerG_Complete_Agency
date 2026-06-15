import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts";

await config({ path: ".env.local", export: true });

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data } = await supabase
    .from('agent_barbershop_leads')
    .select('shop_name, city, booth_count_available')
    .ilike('city', '%Houston%')
    .gt('booth_count_available', 0)
    .limit(10);
  
  console.log(data?.map(d => d.shop_name).join("\n"));
}
run();
