const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('shop_day_invites')
    .insert([{
        shop_name: 'Test Shop',
        shop_phone: '(504) 264-3327',
        formatted_address: '123 Test St',
        owner_name: 'Test Owner',
        professional_id: '1',
        professionals_name: 'Test Prof',
        professionals_phone_number: '1234567890',
        professionals_address: 'Test Addr',
        invite_date: new Date().toISOString(),
        notes: 'Test Notes',
        status: 'pending'
    }]);
    
  console.log("Insert error:", error);
}
run();
