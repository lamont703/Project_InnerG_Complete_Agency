import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts";

await config({ path: ".env.local", export: true });

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCount() {
  const { count, error } = await supabase
    .from('agent_barbershop_leads')
    .select('*', { count: 'exact', head: true })
    .eq('hiring_need', true);
    
  console.log(`Shops with hiring_need = true: ${count}`);
}

checkCount();
