import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await supabase.from('agent_barbershop_leads').select('shop_name, shop_image_url').not('shop_image_url', 'is', null);
console.log(data);
