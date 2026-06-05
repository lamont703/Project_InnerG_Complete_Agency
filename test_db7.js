const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  let e1, e2;
  try {
    const r1 = await supabase.from('agent_barber_leads').select('name').eq('id', '(504) 264-3327').maybeSingle();
    e1 = r1.error;
  } catch(e) { e1 = e; }
  
  console.log("agent_barber_leads id error:", e1);
}
run();
