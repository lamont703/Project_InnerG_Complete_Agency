import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await supabase
  .from('agent_barbershop_leads')
  .update({ outreach_status: 'shop claimed' })
  .eq('id', '3944de67-8cf5-4b37-b38e-734be7fe66c9');
  
console.log("Error:", JSON.stringify(error, null, 2));
console.log("Data:", JSON.stringify(data, null, 2));
