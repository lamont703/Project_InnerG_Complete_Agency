import { createClient } from "npm:@supabase/supabase-js";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function check() {
  const { data, error } = await supabase.from('agent_barbershop_leads').select('*').limit(1);
  if (error) console.error("Error:", error);
  if (data && data.length > 0) {
    console.log("Barbershop Columns:", Object.keys(data[0]));
    console.log("Has instagram_handle?", Object.keys(data[0]).includes("instagram_handle"));
  }
}
check();
