const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testFilter() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('Testing OR filter query with Anon Key...');
  const client = createClient(url, anonKey);
  
  // Query: hiring_need = true OR booth_count_available >= 1
  const { data, error } = await client
    .from('agent_barbershop_leads')
    .select('*')
    .or('hiring_need.eq.true,booth_count_available.gte.1')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Filter Query Error:', error);
  } else {
    console.log(`Filter Query Success! Retrieved ${data.length} rows.`);
    if (data.length > 0) {
      console.log('Sample rows matching criteria:');
      data.slice(0, 3).forEach(r => {
        console.log(`- Shop: ${r.shop_name}, Hiring Need: ${r.hiring_need}, Booth Count Available: ${r.booth_count_available}`);
      });
    }
  }
}

testFilter();
