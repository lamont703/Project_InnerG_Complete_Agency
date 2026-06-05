const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { error: e1 } = await supabase.from('shop_day_invites').select('*').eq('shop_phone', '(504) 264-3327');
  console.log("shop_day_invites shop_phone error:", e1);

  const { error: e2 } = await supabase.from('shop_day_invites').select('*').eq('professional_id', '(504) 264-3327');
  console.log("shop_day_invites professional_id error:", e2);
  
  const { error: e3 } = await supabase.from('shop_day_invites').select('*').eq('professionals_phone_number', '(504) 264-3327');
  console.log("shop_day_invites professionals_phone_number error:", e3);
}
run();
