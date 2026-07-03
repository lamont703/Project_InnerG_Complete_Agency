/**
 * Enriches agent_barber_school_leads with Google Places (New) data:
 * place_id, rating, review count, phone, website, hours, business status,
 * types, and up to 5 photo URLs (Google's own top-ranked photos for the listing).
 *
 * Usage:
 *   node scrape_google_school_data.js            (only rows never scraped)
 *   node scrape_google_school_data.js --force    (re-scrape every row)
 *   node scrape_google_school_data.js --limit=10 (cap how many rows to process)
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const FORCE = process.argv.includes('--force');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;
const DELAY_MS = 700;

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.regularOpeningHours.weekdayDescriptions',
  'places.businessStatus',
  'places.types',
  'places.photos',
].join(',');

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function searchSchool(schoolName, address) {
  const query = address ? `${schoolName}, ${address}` : schoolName;

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: query, languageCode: 'en' }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.places && data.places.length > 0 ? data.places[0] : null;
}

function buildPhotoUrls(photos) {
  if (!Array.isArray(photos)) return [];
  return photos
    .slice(0, 5)
    .map((p) => `https://places.googleapis.com/v1/${p.name}/media?maxHeightPx=1200&maxWidthPx=1200&key=${GOOGLE_API_KEY}`);
}

async function run() {
  if (!GOOGLE_API_KEY) {
    console.error('Missing GOOGLE_MAPS_API_KEY in .env.local');
    process.exit(1);
  }

  let query = supabase
    .from('agent_barber_school_leads')
    .select('id, school_name, formatted_address, city');

  if (!FORCE) query = query.is('google_scraped_at', null);
  if (LIMIT) query = query.limit(LIMIT);

  const { data: schools, error } = await query;
  if (error) {
    console.error('Failed to load schools:', error.message);
    process.exit(1);
  }

  console.log(`Enriching ${schools.length} school(s) via Google Places...`);

  let succeeded = 0;
  let notFound = 0;
  let failed = 0;

  for (let i = 0; i < schools.length; i++) {
    const school = schools[i];
    process.stdout.write(`[${i + 1}/${schools.length}] ${school.school_name}... `);

    try {
      const place = await searchSchool(school.school_name, school.formatted_address || school.city);
      if (!place) {
        console.log('no match found');
        notFound++;
        await delay(DELAY_MS);
        continue;
      }

      const update = {
        place_id: place.id || null,
        formatted_address: place.formattedAddress || undefined,
        latitude: place.location?.latitude ?? undefined,
        longitude: place.location?.longitude ?? undefined,
        phone: place.nationalPhoneNumber || undefined,
        website: place.websiteUri || undefined,
        rating: place.rating != null ? String(place.rating) : undefined,
        google_review_count: place.userRatingCount ?? null,
        google_hours: place.regularOpeningHours?.weekdayDescriptions || null,
        google_business_status: place.businessStatus || null,
        google_types: place.types || null,
        google_photos: buildPhotoUrls(place.photos),
        google_scraped_at: new Date().toISOString(),
      };

      // Don't clobber existing good data with undefined (Supabase drops undefined keys automatically,
      // but be explicit: only overwrite address/lat/lng/phone/website/rating if Google actually returned one).
      Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

      const { error: updateErr } = await supabase
        .from('agent_barber_school_leads')
        .update(update)
        .eq('id', school.id);

      if (updateErr) {
        console.log(`update failed: ${updateErr.message}`);
        failed++;
      } else {
        console.log(`ok (${update.google_photos.length} photos, rating ${update.rating ?? 'n/a'})`);
        succeeded++;
      }
    } catch (e) {
      console.log(`failed: ${e.message}`);
      failed++;
    }

    await delay(DELAY_MS);
  }

  console.log(`\nDone. Success: ${succeeded}, Not found: ${notFound}, Failed: ${failed}`);
}

run();
