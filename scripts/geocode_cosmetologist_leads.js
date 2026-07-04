/**
 * agent_cosmetologist_leads has real street addresses but none were ever
 * geocoded (latitude/longitude all null), so none show up on the Shop Day
 * Map. This uses the Google Geocoding API (not Places Text Search — these
 * are already precise street addresses, not business names to search for)
 * to fill in latitude/longitude for every row missing them.
 *
 * Usage: node geocode_cosmetologist_leads.js
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocodeAddress(address) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== 'OK' || !data.results?.[0]) return null;
  return data.results[0].geometry.location; // { lat, lng }
}

async function run() {
  if (!GOOGLE_API_KEY) {
    console.error('Missing GOOGLE_MAPS_API_KEY in .env.local');
    process.exit(1);
  }

  const { data: rows, error } = await supabase
    .from('agent_cosmetologist_leads')
    .select('id, name, address')
    .is('latitude', null)
    .not('address', 'is', null);

  if (error) {
    console.error('Failed to load rows:', error.message);
    process.exit(1);
  }

  console.log(`Geocoding ${rows.length} cosmetologist address(es)...`);

  let geocoded = 0, notFound = 0, failed = 0;
  for (let i = 0; i < rows.length; i++) {
    const { id, name, address } = rows[i];
    process.stdout.write(`[${i + 1}/${rows.length}] ${name}... `);
    try {
      const location = await geocodeAddress(address);
      if (!location) {
        console.log('no geocode match');
        notFound++;
        await sleep(200);
        continue;
      }
      const { error: updateErr } = await supabase
        .from('agent_cosmetologist_leads')
        .update({ latitude: location.lat, longitude: location.lng })
        .eq('id', id);
      if (updateErr) {
        console.log(`update failed: ${updateErr.message}`);
        failed++;
      } else {
        console.log(`(${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`);
        geocoded++;
      }
    } catch (e) {
      console.log(`failed: ${e.message}`);
      failed++;
    }
    await sleep(200);
  }

  console.log('\n================================================');
  console.log(`Geocoded: ${geocoded}`);
  console.log(`No match: ${notFound}`);
  console.log(`Failed: ${failed}`);
  console.log('================================================');
}

run();
