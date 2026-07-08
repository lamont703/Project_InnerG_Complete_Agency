const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://senkwhdxgtypcrtoggyf.supabase.co";
const supabaseKey = "sb_publishable_p_NpO_FTkr2K6n0OXIgjPQ_KB12Ld7A";
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectRPCs() {
  const { data: shops, error: err1 } = await supabase.rpc('search_barbershops_ranked', {
    query_text: "",
    is_hiring_filter: false,
    rent_type_filter: "",
    limit_val: 1,
    offset_val: 0,
    query_embedding: null
  });
  console.log("Shop Keys:", shops ? Object.keys(shops[0] || {}) : null, "Error:", err1);
  if (shops && shops[0]) console.log("Shop Slug:", shops[0].slug, "Shop ID:", shops[0].id);

  const { data: barbers, error: err2 } = await supabase.rpc('search_barbers_ranked', {
    query_text: "",
    query_embedding: null,
    limit_val: 1,
    offset_val: 0
  });
  console.log("Barber Keys:", barbers ? Object.keys(barbers[0] || {}) : null, "Error:", err2);
  if (barbers && barbers[0]) console.log("Barber Slug:", barbers[0].slug, "Barber ID:", barbers[0].id);

  const { data: schools, error: err3 } = await supabase.rpc('search_schools_ranked', {
    query_text: "",
    query_embedding: null,
    limit_val: 1,
    offset_val: 0
  });
  console.log("School Keys:", schools ? Object.keys(schools[0] || {}) : null, "Error:", err3);
  if (schools && schools[0]) console.log("School Slug:", schools[0].slug, "School ID:", schools[0].id);
}

inspectRPCs();
