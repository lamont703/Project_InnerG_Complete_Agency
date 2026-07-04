/**
 * For cosmetology schools that appear in the TDLR Cosmetology Operator exam
 * roster but aren't in our agent_cosmetology_school_leads table, look them
 * up via Google Places and add them. Mirror image of
 * backfill_unmatched_barber_schools.js — checks place_id against BOTH
 * school tables before inserting (avoids duplicates for dual-licensed
 * schools), and inserts new schools into agent_cosmetology_school_leads
 * (not agent_barber_school_leads) since these are cosmetology-exam takers.
 *
 * Usage:
 *   node backfill_unmatched_cosmetology_schools.js
 *   node backfill_unmatched_cosmetology_schools.js --limit=10
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const SCRATCHPAD = '/private/tmp/claude-502/-Users-lamontevans-Desktop-AI-Blockchain-Enterprise-Services/76b49128-14b9-4dfc-8547-027b7a33f313/scratchpad';

const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1], 10) : null;

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function titleCase(str) {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bLlc\b/g, 'LLC');
}

async function searchSchool(name) {
  const query = `${titleCase(name)}, Texas`;
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
  return photos.slice(0, 5).map((p) => `https://places.googleapis.com/v1/${p.name}/media?maxHeightPx=1200&maxWidthPx=1200&key=${GOOGLE_API_KEY}`);
}

async function run() {
  if (!GOOGLE_API_KEY) {
    console.error('Missing GOOGLE_MAPS_API_KEY in .env.local');
    process.exit(1);
  }

  let unmatched = JSON.parse(require('fs').readFileSync(`${SCRATCHPAD}/unmatched_cosmetology_schools.json`, 'utf-8'));
  if (LIMIT) unmatched = unmatched.slice(0, LIMIT);
  console.log(`Looking up ${unmatched.length} unmatched school(s) via Google Places...`);

  const { data: existingBarber } = await supabase.from('agent_barber_school_leads').select('id, place_id');
  const { data: existingCosmet } = await supabase.from('agent_cosmetology_school_leads').select('id, place_id');
  const barberByPlaceId = new Map((existingBarber || []).filter((r) => r.place_id).map((r) => [r.place_id, r.id]));
  const cosmetByPlaceId = new Map((existingCosmet || []).filter((r) => r.place_id).map((r) => [r.place_id, r.id]));

  let added = 0, linkedExistingBarber = 0, linkedExistingCosmet = 0, notFound = 0, failed = 0;
  const codeToSchool = new Map(); // code -> { id, type }

  for (let i = 0; i < unmatched.length; i++) {
    const { school_code, school_name } = unmatched[i];
    process.stdout.write(`[${i + 1}/${unmatched.length}] ${school_name}... `);

    try {
      const place = await searchSchool(school_name);
      if (!place) {
        console.log('no Google Places match found');
        notFound++;
        await sleep(700);
        continue;
      }

      if (place.id && cosmetByPlaceId.has(place.id)) {
        console.log('matches an existing cosmetology school by place_id, linking');
        codeToSchool.set(school_code, { id: cosmetByPlaceId.get(place.id), type: 'cosmetology' });
        linkedExistingCosmet++;
        await sleep(700);
        continue;
      }

      if (place.id && barberByPlaceId.has(place.id)) {
        console.log('matches an existing barber school by place_id, linking');
        codeToSchool.set(school_code, { id: barberByPlaceId.get(place.id), type: 'barber' });
        linkedExistingBarber++;
        await sleep(700);
        continue;
      }

      const cityMatch = (place.formattedAddress || '').match(/,\s*([A-Za-z\s]+),\s*[A-Z]{2}\s*\d{5}/);

      const insertRow = {
        school_name: titleCase(school_name),
        city: cityMatch ? cityMatch[1].trim() : null,
        place_id: place.id || null,
        formatted_address: place.formattedAddress || null,
        latitude: place.location?.latitude ?? null,
        longitude: place.location?.longitude ?? null,
        phone: place.nationalPhoneNumber || null,
        website: place.websiteUri || null,
        rating: place.rating != null ? String(place.rating) : null,
        google_review_count: place.userRatingCount ?? null,
        google_hours: place.regularOpeningHours?.weekdayDescriptions || null,
        google_business_status: place.businessStatus || null,
        google_types: place.types || null,
        google_photos: buildPhotoUrls(place.photos),
        google_scraped_at: new Date().toISOString(),
        accreditation_status: 'State Licensed',
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('agent_cosmetology_school_leads')
        .insert(insertRow)
        .select('id')
        .single();

      if (insertErr) {
        console.log(`insert failed: ${insertErr.message}`);
        failed++;
      } else {
        codeToSchool.set(school_code, { id: inserted.id, type: 'cosmetology' });
        console.log(`added (${insertRow.google_photos.length} photos, rating ${insertRow.rating ?? 'n/a'})`);
        added++;
      }
    } catch (e) {
      console.log(`failed: ${e.message}`);
      failed++;
    }

    await sleep(700);
  }

  console.log('\n================================================');
  console.log(`Added new: ${added}`);
  console.log(`Linked to existing cosmetology school (by place_id): ${linkedExistingCosmet}`);
  console.log(`Linked to existing barber school (by place_id): ${linkedExistingBarber}`);
  console.log(`No Google match: ${notFound}, Failed: ${failed}`);
  console.log('================================================');

  if (codeToSchool.size > 0) {
    console.log(`\nRe-linking student records for ${codeToSchool.size} school(s)...`);
    let relinked = 0;
    for (const [code, { id, type }] of codeToSchool.entries()) {
      const { error, count } = await supabase
        .from('agent_cosmetology_student_leads')
        .update({ matched_school_id: id, matched_school_type: type, school_match_confidence: 'exact' }, { count: 'exact' })
        .eq('school_code', code);
      if (!error) relinked += count || 0;
    }
    console.log(`Re-linked ${relinked} student record(s).`);
  }
}

run();
