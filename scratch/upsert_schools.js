const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Mirrors lib/slug.ts — scripts run as plain CommonJS and can't import from lib/.
function slugify(input) {
  return (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
function buildSlug(name, city, id) {
  return `${slugify(name || 'entity')}-${slugify(city || 'tx')}-${id.replace(/-/g, '').slice(0, 8)}`;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Normalize strings for similarity matching (strips spaces, punctuation, case)
function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace('school', '')
    .replace('college', '')
    .replace('academy', '')
    .replace('institute', '')
    .trim();
}

async function upsertBarberSchools() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey || !supabaseUrl || !supabaseKey) {
    console.error('\n❌ ERROR: Missing credentials in .env.local.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('==================================================================');
  console.log('🚀 INNER G COMPLETE AGENCY — BARBER SCHOOLS INTEL INTEGRATOR (V3)');
  console.log('==================================================================\n');

  // Step 1: Fetch all existing schools from the Supabase table
  console.log('📡 Fetching existing school records from database...');
  const { data: existingRecords, error: fetchError } = await supabase
    .from('agent_barber_school_leads')
    .select('*');

  if (fetchError) {
    console.error('❌ Failed to fetch existing records:', fetchError.message);
    process.exit(1);
  }

  console.log(`✅ Loaded ${existingRecords.length} existing records from database.`);

  // Build lookup maps
  const existingMap = new Map();
  const existingContactIdSet = new Set();
  
  existingRecords.forEach(rec => {
    const key = `${normalizeName(rec.school_name)}_${rec.city.toLowerCase()}`;
    existingMap.set(key, rec);
    if (rec.contact_id) {
      existingContactIdSet.add(rec.contact_id);
    }
  });

  // Step 2: Query Google Places API across Texas cities
  const cities = ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth', 'El Paso'];
  const fetchedSchools = [];

  console.log('\n🔍 Fetching latest Google Places Texas Barber Schools data...');
  for (const city of cities) {
    console.log(`   - Querying schools in ${city}, TX...`);
    const url = 'https://places.googleapis.com/v1/places:searchText';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.rating'
        },
        body: JSON.stringify({
          textQuery: `barber school OR barber college in ${city}, TX`,
          languageCode: 'en'
        })
      });

      if (!response.ok) {
        throw new Error(`Places API status ${response.status}`);
      }

      const data = await response.json();
      const places = data.places || [];

      places.forEach(place => {
        const name = place.displayName?.text || '';
        const lowerName = name.toLowerCase();

        // Filtering to target barber/beauty/cosmetology/hair schools
        if (
          lowerName.includes('barber') || 
          lowerName.includes('hair') || 
          lowerName.includes('beauty') || 
          lowerName.includes('cosmetology') || 
          lowerName.includes('college') ||
          lowerName.includes('academy') ||
          lowerName.includes('school')
        ) {
          fetchedSchools.push({
            placeId: place.id,
            name: name,
            address: place.formattedAddress || '',
            city: city,
            phone: place.nationalPhoneNumber || null,
            website: place.websiteUri || null,
            rating: place.rating ? String(place.rating) : null
          });
        }
      });
      await sleep(200);
    } catch (err) {
      console.error(`   ⚠️ Failed querying ${city}:`, err.message);
    }
  }

  console.log(`✅ Google query complete. Found ${fetchedSchools.length} schools.`);

  // Step 3: Compare and perform upsert/update operations
  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  console.log('\n🔄 Integrating datasets into new schema columns...');

  for (const school of fetchedSchools) {
    const normKey = `${normalizeName(school.name)}_${school.city.toLowerCase()}`;

    // Skip if we already processed a duplicate Google Place ID in this run or if it's already in the DB
    if (existingContactIdSet.has(school.placeId)) {
      skippedCount++;
      continue;
    }

    if (existingMap.has(normKey)) {
      // School already exists - Safe update (merge new details directly into new columns!)
      const existing = existingMap.get(normKey);
      
      if (!existing.id) {
        skippedCount++;
        continue;
      }

      const newPhone = school.phone || existing.phone;
      const newWebsite = school.website || existing.website;
      const newRating = school.rating || existing.rating;
      const newAddress = school.address || existing.formatted_address;

      const { error: updateErr } = await supabase
        .from('agent_barber_school_leads')
        .update({
          phone: newPhone,
          website: newWebsite,
          rating: newRating,
          formatted_address: newAddress,
          place_id: school.placeId,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateErr) {
        console.error(`   ❌ Failed to update ${school.name}:`, updateErr.message);
      } else {
        updatedCount++;
        existingContactIdSet.add(school.placeId);
      }
    } else {
      // School is new - Insert record directly using new columns!
      const { data: insertedData, error: insertErr } = await supabase
        .from('agent_barber_school_leads')
        .insert({
          school_name: school.name,
          admissions_rep_name: 'Unknown Director',
          city: school.city,
          accreditation_status: 'Accredited',
          phone: school.phone,
          email: null,
          contact_id: school.placeId, // Unique Place ID serves as contact_id perfectly
          
          // Dedicated Google Places Columns!
          place_id: school.placeId,
          website: school.website,
          rating: school.rating,
          formatted_address: school.address,
          
          // Existing CRM Columns
          placement_rate_deficit: false,
          interested_in_placement: false,
          current_student_count: 0,
          system_used: null,
          
          // AI Context & Telemetry
          last_conversation_history: 'Google Places Sync',
          conversation_turns: [],
          outreach_status: 'pending',
          outreach_attempts: 0
        })
        .select('id');

      if (insertErr) {
        if (insertErr.message?.includes('unique_school_city') || insertErr.message?.includes('contact_id_key')) {
          skippedCount++;
        } else {
          console.error(`   ❌ Failed to insert new school ${school.name}:`, insertErr.message);
        }
      } else {
        insertedCount++;
        const newId = insertedData?.[0]?.id;
        if (newId) {
          const slug = buildSlug(school.name, school.city, newId);
          await supabase.from('agent_barber_school_leads').update({ slug }).eq('id', newId);
        }
        existingMap.set(normKey, { ...school, id: newId });
        existingContactIdSet.add(school.placeId);
      }
    }
  }

  console.log('\n==================================================');
  console.log('🏁 SCHEMA ENRICHMENT COMPLETE');
  console.log(`✅ New Barber Schools Inserted:    ${insertedCount}`);
  console.log(`🔄 Existing Records Enriched/Merged: ${updatedCount}`);
  console.log(`⏭️  Duplicate Venues Handled:       ${skippedCount}`);
  console.log('==================================================\n');
}

upsertBarberSchools();
