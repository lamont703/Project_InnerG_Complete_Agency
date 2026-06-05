import { createClient } from "@supabase/supabase-js";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('agent_barber_leads')
    .select('*')
    .limit(1);
    
  console.log("agent_barber_leads columns:");
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  } else {
    console.log(error || "No data");
  }
}

main().catch(console.error);
