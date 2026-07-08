const supabaseUrl = "https://senkwhdxgtypcrtoggyf.supabase.co";
const supabaseKey = "sb_publishable_p_NpO_FTkr2K6n0OXIgjPQ_KB12Ld7A";

async function testFetch() {
  const slug = "magic-touch-barbershop-brownsville-2aa1c958";
  const url = `${supabaseUrl}/rest/v1/agent_barbershop_leads?slug=eq.${slug}&select=*`;
  
  try {
    const res = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data length:", data.length);
    console.log("First shop name:", data[0]?.shop_name);
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

testFetch();
