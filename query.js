import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await supabase.from('agent_barbershop_leads').select('id, shop_name, phone, outreach_status, contact_id').ilike('shop_name', '%Klippin%');
console.log(JSON.stringify(data, null, 2));
