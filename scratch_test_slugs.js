const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://senkwhdxgtypcrtoggyf.supabase.co";
const supabaseKey = "sb_publishable_p_NpO_FTkr2K6n0OXIgjPQ_KB12Ld7A";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: shops, error: error1 } = await supabase
    .from("agent_barbershop_leads")
    .select("slug, shop_name")
    .limit(3);
  
  console.log("Shops:", shops, "Error:", error1);

  const { data: schools, error: error2 } = await supabase
    .from("agent_barber_school_leads")
    .select("slug, school_name")
    .limit(3);

  console.log("Schools:", schools, "Error:", error2);
}

run();
