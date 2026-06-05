const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('get_column_type', { table_name: 'agent_barbershop_leads', column_name: 'phone' });
  console.log("RPC Error:", error);
  console.log("RPC Data:", data);
  
  // Alternative way to check type if RPC fails
  const { data: d2 } = await supabase.from('agent_barbershop_leads').select('phone').limit(1);
  console.log("Type of phone value:", typeof d2[0].phone);
}
run();
