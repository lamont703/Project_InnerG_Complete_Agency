import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts";

await config({ path: ".env.local", export: true });

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data } = await supabase
    .from('agent_barber_school_leads')
    .select('school_name, last_conversation_history, google_place_details, formatted_address')
    .is('formatted_address', null);
    
  console.log(`Found ${data?.length} schools with no formatted_address.`);
  if (data && data.length > 0) {
    let nullGoogleDetails = 0;
    let missingAddressField = 0;
    let nullConversationHistory = 0;

    for (const s of data) {
      if (!s.google_place_details) nullGoogleDetails++;
      else if (!s.google_place_details.match(/Address:\s*([^|]+)/i)) missingAddressField++;

      if (!s.last_conversation_history) nullConversationHistory++;
    }

    console.log(`- ${nullGoogleDetails} have NULL google_place_details.`);
    console.log(`- ${missingAddressField} have google_place_details but no 'Address:' string inside it.`);
    console.log(`- ${nullConversationHistory} have NULL last_conversation_history.`);

    console.log("\nSample of 3 schools with no formatted address:");
    console.log(JSON.stringify(data.slice(0, 3), null, 2));
  }
}
run();
