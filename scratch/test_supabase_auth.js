const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function test() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('Supabase URL:', url);
  console.log('Testing with Anon Key...');
  const supabaseAnon = createClient(url, anonKey);
  const { data: anonData, error: anonError } = await supabaseAnon
    .from('agent_barbershop_leads')
    .select('*')
    .limit(5);

  if (anonError) {
    console.error('Anon Fetch Error:', anonError);
  } else {
    console.log(`Anon Fetch Success: ${anonData.length} rows retrieved.`);
  }

  console.log('\nTesting with Service Role Key...');
  const supabaseService = createClient(url, serviceKey);
  const { data: serviceData, error: serviceError } = await supabaseService
    .from('agent_barbershop_leads')
    .select('*')
    .limit(5);

  if (serviceError) {
    console.error('Service Fetch Error:', serviceError);
  } else {
    console.log(`Service Fetch Success: ${serviceData.length} rows retrieved.`);
  }
}

test();
