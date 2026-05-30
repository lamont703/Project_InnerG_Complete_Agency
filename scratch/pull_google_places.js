require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Simple CSV row formatting utility
function formatCSVRow(columns) {
  return columns.map(col => {
    const val = col !== undefined && col !== null ? String(col).trim() : '';
    // Escape double quotes and wrap in quotes if it contains commas or quotes
    const escaped = val.replace(/"/g, '""');
    return `"${escaped}"`;
  }).join(',');
}

async function pullGooglePlacesNewWithContacts() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.error('\n❌ ERROR: Google Maps API Key not found in environment.');
    process.exit(1);
  }

  const outputPath = path.join(__dirname, '../public/Google_Texas_Barbershops.csv');
  console.log('--- Google Places API (New) v1 Texas Contact Data Extractor ---');
  console.log(`Target Output: ${outputPath}\n`);

  // Comprehensive list of major Houston zip codes
  const zipCodes = [
    '77002', '77003', '77004', '77005', '77006', '77007', '77008', '77009', '77010', '77011',
    '77012', '77013', '77014', '77016', '77017', '77018', '77019', '77020', '77021', '77022',
    '77023', '77024', '77025', '77026', '77027', '77028', '77029', '77030', '77031', '77032',
    '77033', '77034', '77035', '77036', '77037', '77038', '77039', '77040', '77041', '77042',
    '77043', '77044', '77045', '77046', '77047', '77048', '77049', '77050', '77051', '77053',
    '77054', '77055', '77056', '77057', '77058', '77059', '77060', '77061', '77062', '77063',
    '77064', '77065', '77066', '77067', '77068', '77069', '77070', '77071', '77072', '77073',
    '77074', '77075', '77076', '77077', '77078', '77079', '77080', '77081', '77082', '77083',
    '77084', '77085', '77086', '77087', '77088', '77089', '77090', '77091', '77092', '77093',
    '77094', '77095', '77096', '77098', '77099'
  ];
  const allPlaces = new Map(); // Prevent duplicates

  // CSV Columns Setup (now with Phone Number and Website fields!)
  const headers = [
    'PlaceID',
    'BusinessName',
    'FormattedAddress',
    'CityHub',
    'Telephone',
    'Website',
    'Latitude',
    'Longitude',
    'Rating',
    'TotalReviews',
    'PlaceTypes',
    'BusinessStatus'
  ];

  for (const zipCode of zipCodes) {
    console.log(`🔍 Querying modern v1 Contact search for: ${zipCode}...`);
    
    // Places API (New) Text Search Endpoint
    const url = 'https://places.googleapis.com/v1/places:searchText';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          // Added places.nationalPhoneNumber and places.websiteUri to the field mask
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.businessStatus,places.nationalPhoneNumber,places.websiteUri'
        },
        body: JSON.stringify({
          textQuery: `barbers and barbershops in ${zipCode}`,
          languageCode: 'en'
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Google API v1 Error: ${response.status} ${errText}`);
      }

      const data = await response.json();
      const results = data.places || [];

      results.forEach(place => {
        const name = place.displayName?.text || '';
        const lat = place.location?.latitude || '';
        const lng = place.location?.longitude || '';

        allPlaces.set(place.id, {
          placeId: place.id,
          name: name,
          address: place.formattedAddress || '',
          cityHub: `Houston ${zipCode}`,
          phone: place.nationalPhoneNumber || 'N/A', // Captured phone field
          website: place.websiteUri || 'N/A',       // Captured website field
          lat: lat,
          lng: lng,
          rating: place.rating || '0.0',
          reviews: place.userRatingCount || 0,
          types: (place.types || []).join(' | '),
          status: place.businessStatus || 'OPERATIONAL'
        });
      });

      console.log(`   - Retrieved ${results.length} unique venues (Cumulative Total: ${allPlaces.size})`);
      
      // Throttle slightly to respect API limits
      await sleep(1000);

    } catch (err) {
      console.error(`   ❌ Failed querying ${zipCode}:`, err.message);
    }
  }

  console.log(`\n💾 Total unique Houston grooming businesses compiled with contacts: ${allPlaces.size}`);

  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials missing. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in .env.local');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`\n🚀 Starting Direct Import to Supabase...`);
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const [id, place] of allPlaces.entries()) {
    let cleanPhone = place.phone?.replace(/[^\d]/g, "") || "";
    if (cleanPhone.length === 10) cleanPhone = "+1" + cleanPhone;
    else if (cleanPhone.length === 11 && cleanPhone.startsWith("1")) cleanPhone = "+" + cleanPhone;

    if (!cleanPhone || cleanPhone === "+1") {
      skipCount++;
      continue;
    }

    // Check if shop already exists by phone to prevent duplicates
    const { data: existing } = await supabase
      .from("agent_barbershop_leads")
      .select("id")
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (existing) {
       skipCount++;
       continue;
    }

    const { error } = await supabase
      .from("agent_barbershop_leads")
      .insert({
        shop_name: place.name,
        owner_name: "Unknown Owner",
        phone: cleanPhone,
        city: place.cityHub || "Unknown",
        hiring_need: false,
        rent_type: "Unknown",
        rent_rate: null,
        specialty_desired: "Unknown",
        booth_count_available: 0,
        last_conversation_history: "",
        conversation_turns: [],
        outreach_status: "pending",
        outreach_attempts: 0,
        place_id: place.placeId || null,
        formatted_address: place.address || null,
        website: place.website || 'N/A',
        latitude: place.lat ? parseFloat(place.lat) : null,
        longitude: place.lng ? parseFloat(place.lng) : null,
        rating: place.rating ? parseFloat(place.rating) : null,
        total_reviews: place.reviews ? parseInt(place.reviews, 10) : 0,
        place_types: place.types || null,
        business_status: place.status || null
      });

    if (error) {
      console.error(`❌ Error inserting ${place.name}:`, error.message);
      errorCount++;
    } else {
      successCount++;
      if (successCount % 10 === 0) {
         console.log(`✅ Inserted ${successCount} shops so far...`);
      }
    }
  }

  console.log("\n================================================");
  console.log(`🏁 DIRECT IMPORT COMPLETE`);
  console.log(`✅ Successfully Inserted: ${successCount}`);
  console.log(`⏭️  Skipped (No Phone or Duplicate): ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log("================================================\n");
}

pullGooglePlacesNewWithContacts();
