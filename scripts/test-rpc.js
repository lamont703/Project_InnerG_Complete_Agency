const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testRPC() {
  const { data, error } = await supabase.rpc('search_platform_tools_ranked', {
    query_text: 'clients',
    limit_val: 3
  });
  console.log("Error:", error);
  console.log("Data:", data);
}

testRPC();
