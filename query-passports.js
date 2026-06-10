import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await supabase.from('agent_barber_leads').select('id, name, passport_image_url');
console.log(JSON.stringify(data, null, 2));
