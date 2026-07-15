// One-time backfill for the new nearby_areas column — computes real,
// distance-based "areas served" for every existing Houston-area shop/salon
// row from lib/nearby-areas.ts's verified neighborhood list. Mirrors that
// module's logic in CommonJS (scripts here are plain CommonJS, not the
// Next.js TS app) — see lib/nearby-areas.ts for the reasoning and sourced
// coordinates.
//
// Only Houston has a verified neighborhood list right now; rows in cities
// without one are left untouched (computeNearbyAreas returns [] for an
// unknown city, and this script skips writing an empty array so it's
// obvious which rows haven't been computed yet vs. genuinely have no
// nearby areas).
//
// Usage: node scripts/backfill_nearby_areas.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const NEIGHBORHOODS_BY_CITY = {
  houston: [
    { name: 'River Oaks', lat: 29.74794, lng: -95.42651 },
    { name: 'Uptown/Galleria', lat: 29.7407, lng: -95.4636 },
    { name: 'Rice Village', lat: 29.7179, lng: -95.418 },
    { name: 'Bellaire', lat: 29.716681, lng: -95.458145 },
    { name: 'The Heights', lat: 29.798005, lng: -95.397994 },
    { name: 'Downtown Houston', lat: 29.7629, lng: -95.3831 },
  ],
};
const MAX_DISTANCE_MILES = 2.5;
const EARTH_RADIUS_MILES = 3958.8;

function haversineMiles(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeNearbyAreas(lat, lng, cityKey) {
  if (lat == null || lng == null) return [];
  const neighborhoods = NEIGHBORHOODS_BY_CITY[(cityKey || '').toLowerCase()];
  if (!neighborhoods) return [];
  return neighborhoods
    .map((n) => ({ name: n.name, distance: haversineMiles(lat, lng, n.lat, n.lng) }))
    .filter((n) => n.distance <= MAX_DISTANCE_MILES)
    .sort((a, b) => a.distance - b.distance)
    .map((n) => n.name);
}

async function backfillTable(table) {
  console.log(`\n=== ${table} ===`);
  let from = 0;
  const PAGE = 500;
  let updated = 0;
  let skippedNoCity = 0;
  let skippedNoAreas = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('id, city, latitude, longitude, nearby_areas')
      .is('nearby_areas', null)
      .range(from, from + PAGE - 1);
    if (error) {
      console.error(`  Fetch failed: ${error.message}`);
      break;
    }
    if (!data || data.length === 0) break;

    for (const row of data) {
      if (!row.city || !NEIGHBORHOODS_BY_CITY[row.city.toLowerCase()]) {
        skippedNoCity++;
        continue;
      }
      const areas = computeNearbyAreas(row.latitude, row.longitude, row.city);
      if (areas.length === 0) {
        skippedNoAreas++;
        continue;
      }
      const { error: updateError } = await supabase.from(table).update({ nearby_areas: areas }).eq('id', row.id);
      if (updateError) {
        console.error(`  Update failed for ${row.id}: ${updateError.message}`);
        continue;
      }
      updated++;
      console.log(`  ${row.id} (${row.city}) -> [${areas.join(', ')}]`);
    }

    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`\n${table} summary: updated=${updated}, skipped (no matching city list)=${skippedNoCity}, skipped (no nearby areas within ${MAX_DISTANCE_MILES}mi)=${skippedNoAreas}`);
}

async function run() {
  await backfillTable('agent_barbershop_leads');
  await backfillTable('agent_salon_leads');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
