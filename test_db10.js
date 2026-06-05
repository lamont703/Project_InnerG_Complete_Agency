require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from("agent_barbershop_leads")
    .select("shop_name, outreach_status, hiring_need, booth_count_available")
    .ilike("outreach_status", "%claim%");
    
  console.log("Error:", error);
  console.log("Data:", data);
}

run();
