import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: bData, error: bError } = await supabase.from('agent_barbershop_leads').select('*').limit(1);
  const { data: lData, error: lError } = await supabase.from('agent_barber_leads').select('*').limit(1);
  console.log("Barbershop Leads columns:", Object.keys(bData[0] || {}).join(", "));
  console.log("Barber Leads columns:", Object.keys(lData[0] || {}).join(", "));
}

run();
