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

  // Target cities to query
  const cities = ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth', 'El Paso'];
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

  for (const city of cities) {
    console.log(`🔍 Querying modern v1 Contact search for: ${city.toUpperCase()}...`);
    
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
          textQuery: `barbers and barbershops in ${city}, TX`,
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
          cityHub: city,
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
      
      // Throttle slightly between metropolises
      await sleep(1000);

    } catch (err) {
      console.error(`   ❌ Failed querying ${city}:`, err.message);
    }
  }

  console.log(`\n💾 Total unique Texas grooming businesses compiled with contacts: ${allPlaces.size}`);

  try {
    // Generate CSV contents
    const csvLines = [headers.join(',')];
    
    for (const [id, place] of allPlaces.entries()) {
      const row = formatCSVRow([
        place.placeId,
        place.name,
        place.address,
        place.cityHub,
        place.phone,
        place.website,
        place.lat,
        place.lng,
        place.rating,
        place.reviews,
        place.types,
        place.status
      ]);
      csvLines.push(row);
    }

    fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf-8');
    console.log(`\n🎉 SUCCESS: Data with Phones & Websites serialized and saved!`);
    console.log(`📁 File Location: public/Google_Texas_Barbershops.csv`);

  } catch (err) {
    console.error('❌ Failed to serialize CSV output:', err.message);
  }
}

pullGooglePlacesNewWithContacts();
