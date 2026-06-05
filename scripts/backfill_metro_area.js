const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function extractMetroArea(address) {
  if (!address) return null;
  
  // Try comma-separated format: "123 Main St, Dallas, TX 75001"
  const parts = address.split(',');
  if (parts.length >= 2) {
    const city = parts[parts.length - 2].trim();
    const stateZipStr = parts[parts.length - 1].trim();
    const zipMatch = stateZipStr.match(/\b(\d{5})\b/);
    if (zipMatch && city) {
      return `${city} ${zipMatch[1]}`;
    }
  }
  
  // Fallback for no-comma formats: "123 Main St Dallas TX 75001"
  const fallbackRegex = /([a-zA-Z\s]+)\s+[a-zA-Z]{2}\s+(\d{5})(?:-\d{4})?$/;
  const fallbackMatch = address.trim().match(fallbackRegex);
  if (fallbackMatch) {
    const words = fallbackMatch[1].trim().split(/\s+/);
    // Take the last word, or last two words if they look like a city name
    let city = words.length > 1 ? words.slice(-2).join(' ') : words[0];
    
    // Clean up common street suffixes that might have been caught
    city = city.replace(/\b(St|Street|Rd|Road|Ave|Avenue|Blvd|Dr|Drive|Ct|Court|Ln|Lane)\b/gi, '').trim();
    if (!city && words.length > 0) {
      city = words[words.length - 1]; // fallback to just the last word
    }
    
    if (city) {
      return `${city} ${fallbackMatch[2]}`;
    }
  }
  
  return null;
}

async function run() {
  console.log("Fetching rows with missing metro_area...");
  const { data, error } = await supabase
    .from('agent_barber_leads')
    .select('id, address, metro_area')
    .is('metro_area', null);

  if (error) {
    console.error("Error fetching rows:", error);
    return;
  }

  if (!data || data.length === 0) {
    console.log("No rows need updating.");
    return;
  }

  console.log(`Found ${data.length} rows to update.`);
  let count = 0;
  for (const row of data) {
    const computed = extractMetroArea(row.address);
    if (computed) {
      const { error: updateError } = await supabase
        .from('agent_barber_leads')
        .update({ metro_area: computed })
        .eq('id', row.id);
      
      if (updateError) {
        console.error(`Error updating row ${row.id}:`, updateError);
      } else {
        count++;
        console.log(`Updated row ${row.id}: ${row.address} -> ${computed}`);
      }
    }
  }
  console.log(`Successfully backfilled ${count} rows!`);
}

run();
