const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fix() {
  const { error } = await supabase
    .from("barber_registrations")
    .update({ 
      project_id: '1d76c24e-e695-4c70-ba44-137c7b269e49',
      status: 'deployed'
    })
    .eq('id', 'e4227ca3-5045-44db-8652-671a8d910b0c');

  if (error) console.error(error);
  else console.log("Fixed!");
}

fix();
