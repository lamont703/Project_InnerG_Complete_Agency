const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testSelect() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('Testing select(*) with Anon Key...');
  const client = createClient(url, anonKey);
  const { data, error } = await client
    .from('agent_barbershop_leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Select(*) Error:', error);
  } else {
    console.log(`Select(*) Success! Retrieved ${data.length} rows.`);
    if (data.length > 0) {
      console.log('First row columns:', Object.keys(data[0]));
    }
  }
}

testSelect();
