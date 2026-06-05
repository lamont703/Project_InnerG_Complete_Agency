require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function extractMetroArea(address) {
  if (!address) return null;
  const parts = address.split(',');
  if (parts.length >= 2) {
    const city = parts[parts.length - 2].trim();
    const stateZipStr = parts[parts.length - 1].trim();
    const zipMatch = stateZipStr.match(/\b(\d{5})\b/);
    if (zipMatch && city) return `${city} ${zipMatch[1]}`;
  }
  
  const fallbackRegex = /([a-zA-Z\s]+)\s+[a-zA-Z]+\s+(\d{5})(?:-\d{4})?$/;
  const fallbackMatch = address.trim().match(fallbackRegex);
  if (fallbackMatch) {
    const words = fallbackMatch[1].trim().split(/\s+/);
    let city = words.length > 1 ? words.slice(-2).join(' ') : words[0];
    city = city.replace(/\b(St|Street|Rd|Road|Ave|Avenue|Blvd|Dr|Drive|Ct|Court|Ln|Lane)\b/gi, '').trim();
    if (!city && words.length > 0) city = words[words.length - 1];
    if (city) return `${city} ${fallbackMatch[2]}`;
  }
  return null;
}

async function run() {
  const { data: shops } = await supabase
    .from("agent_barbershop_leads")
    .select("id, formatted_address")
    .eq("city", "");

  for (const shop of shops || []) {
    const city = extractMetroArea(shop.formatted_address);
    if (city) {
      console.log(`Updating ${shop.id} with city: ${city}`);
      await supabase.from("agent_barbershop_leads").update({ city }).eq("id", shop.id);
    }
  }
}
run();
