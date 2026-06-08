import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await supabase.from('agent_barbershop_leads').select('id, shop_name, phone, outreach_status, contact_id').eq('contact_id', 'uVExYdshXw8SxgwNSAxu');
console.log("By contact_id:");
console.log(JSON.stringify(data, null, 2));

const { data: data2 } = await supabase.from('agent_barbershop_leads').select('id, shop_name, phone, outreach_status, contact_id').eq('phone', '7135624158');
console.log("By phone 7135624158:");
console.log(JSON.stringify(data2, null, 2));
