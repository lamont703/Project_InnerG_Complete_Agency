const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('agent_barbershop_leads')
    .select('phone')
    .eq('phone', '(504) 264-3327');
    
  console.log("agent_barbershop_leads error:", error);

  const { data: d2, error: e2 } = await supabase
    .from('agent_barber_leads')
    .select('phone')
    .eq('phone', '(504) 264-3327');
    
  console.log("agent_barber_leads error:", e2);
}
run();
