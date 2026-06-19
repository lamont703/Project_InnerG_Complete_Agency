import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts";

await config({ path: ".env.local", export: true });

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function reverseBarberStatus() {
  console.log("🚀 Reversing all 'is_actively_looking = false' back to true...");

  // Since the column was just added, any 'false' value was set by the script error.
  const { data, error } = await supabase
    .from('agent_barber_leads')
    .update({ is_actively_looking: true })
    .eq('is_actively_looking', false)
    .select('id');

  if (error) {
    console.error(`❌ Error reversing statuses:`, error.message);
  } else {
    console.log(`\n================================================`);
    console.log(`🏁 REVERSE COMPLETE`);
    console.log(`✅ Successfully Reverted: ${data?.length || 0} professionals back to true.`);
    console.log(`================================================\n`);
  }
}

reverseBarberStatus();
