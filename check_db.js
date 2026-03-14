const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('project_knowledge')
    .select('count', { count: 'exact', head: true });
  
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Success:', data);
  }
}

check();
