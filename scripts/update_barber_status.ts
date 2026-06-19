import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts";

await config({ path: ".env.local", export: true });

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateBarberStatus() {
  const args = Deno.args;
  
  if (args.length === 0) {
    console.log("Usage: deno run -A scripts/update_barber_status.ts <phone_number_or_id_1> <phone_number_or_id_2> ...");
    console.log("Example: deno run -A scripts/update_barber_status.ts 555-555-5555 123-456-7890");
    return;
  }

  console.log(`🚀 Updating ${args.length} professionals to 'is_actively_looking = false'...`);

  let successCount = 0;
  let failCount = 0;

  for (const identifier of args) {
    // Check if it's an ID (UUID or GHL contact_id) or a phone number
    const isId = identifier.length >= 20 || identifier.includes('-');
    
    let query = supabase.from('agent_barber_leads').update({ is_actively_looking: false });
    
    if (isId) {
      // It's an ID or contact_id
      if (identifier.includes('-')) {
        query = query.eq('id', identifier);
      } else {
        query = query.eq('contact_id', identifier);
      }
    } else {
      const digitsOnly = identifier.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        console.error(`❌ Identifier '${identifier}' does not look like a valid phone number or ID.`);
        failCount++;
        continue; // skip this identifier so we don't accidentally update everyone
      }
      query = query.ilike('phone', `%${digitsOnly.slice(-10)}%`);
    }

    const { data, error } = await query.select('id, name, phone');

    if (error) {
      console.error(`❌ Error updating ${identifier}:`, error.message);
      failCount++;
    } else if (data && data.length > 0) {
      console.log(`✅ Success: ${data[0].name} (${data[0].phone}) is no longer looking.`);
      successCount += data.length;
    } else {
      console.log(`⚠️ Not found: Could not find professional matching '${identifier}'`);
      failCount++;
    }
  }

  console.log("\n================================================");
  console.log(`🏁 UPDATE COMPLETE`);
  console.log(`✅ Successfully Updated: ${successCount}`);
  console.log(`❌ Failed / Not Found: ${failCount}`);
  console.log("================================================\n");
}

updateBarberStatus();
