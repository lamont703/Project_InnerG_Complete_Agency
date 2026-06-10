import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const MOCK_IMAGE = "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=800&auto=format&fit=crop";

const { data, error } = await supabase
  .from('agent_barber_leads')
  .update({ passport_image_url: MOCK_IMAGE })
  .is('passport_image_url', null)
  .select('id');
  
console.log("Updated rows:", data?.length);
if (error) console.error(error);
