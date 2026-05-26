const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testSchools() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('Testing select(*) on agent_barber_school_leads with Anon Key...');
  const client = createClient(url, anonKey);
  const { data, error } = await client
    .from('agent_barber_school_leads')
    .select('*')
    .order('school_name', { ascending: true });

  if (error) {
    console.error('Schools Error:', error);
  } else {
    console.log(`Schools Success! Retrieved ${data.length} rows.`);
    if (data.length > 0) {
      console.log('Sample schools matching criteria:');
      data.slice(0, 5).forEach(r => {
        console.log(`- School: ${r.school_name}, City: ${r.city}, Accreditation: ${r.accreditation_status}`);
      });
    }
  }
}

testSchools();
