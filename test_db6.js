const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('get_table_info', { p_table_name: 'agent_barbershop_leads' });
  console.log("RPC Error:", error);
  console.log("RPC Data:", data);
  
  // if no rpc, let's try just inserting a bogus phone and see if it fails
  const { error: e2 } = await supabase.from('agent_barbershop_leads').select('phone').eq('phone', 'abc');
  console.log("Error querying string against phone:", e2);
}
run();
