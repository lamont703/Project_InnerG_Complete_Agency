const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('agent_barber_school_leads')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching:', error.message);
  } else {
    console.log('Columns in agent_barber_school_leads:', data.length > 0 ? Object.keys(data[0]) : 'No rows found');
    console.log('Sample row:', data[0]);
  }
}

check();
