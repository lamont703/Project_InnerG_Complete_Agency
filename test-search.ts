import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const searchTerm = '%Houston%';
  const { data, error } = await supabase
    .from('agent_barbershop_leads')
    .select('id, shop_name, city, formatted_address, services_offered, phone')
    .or(`shop_name.ilike.${searchTerm},city.ilike.${searchTerm}`)
    .limit(20);
  console.log("Data:", data?.length);
  console.log("Error:", error);
}
test();
