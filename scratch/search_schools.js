require('dotenv').config({ path: '.env.local' });

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchBarberSchools() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.error('\n❌ ERROR: Google Maps API Key not found in environment.');
    process.exit(1);
  }

  console.log('--- Google Places API (New) Texas Barber Schools Search ---');

  const cities = ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth', 'El Paso'];
  const allSchools = new Map(); // Prevent duplicates by Place ID

  for (const city of cities) {
    console.log(`🔍 Searching for barber schools in: ${city.toUpperCase()}, TX...`);
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
        const errText = await response.text();
        throw new Error(`Google API v1 Error: ${response.status} ${errText}`);
      }

      const data = await response.json();
      const results = data.places || [];

      results.forEach(place => {
        const name = place.displayName?.text || '';
        // Filtering to ensure we target barber schools/colleges primarily
        const lowerName = name.toLowerCase();
        if (
          lowerName.includes('barber') || 
          lowerName.includes('hair') || 
          lowerName.includes('beauty') || 
          lowerName.includes('cosmetology') || 
          lowerName.includes('college') ||
          lowerName.includes('academy') ||
          lowerName.includes('school')
        ) {
          allSchools.set(place.id, {
            placeId: place.id,
            name: name,
            address: place.formattedAddress || '',
            cityHub: city,
            phone: place.nationalPhoneNumber || 'N/A',
            website: place.websiteUri || 'N/A',
            rating: place.rating || 'N/A'
          });
        }
      });

      console.log(`   - Found ${results.length} results (Unique Cumulative Total: ${allSchools.size})`);
      await sleep(500); // polite throttling
    } catch (err) {
      console.error(`   ❌ Error querying ${city}:`, err.message);
    }
  }

  console.log(`\n🎉 SEARCH COMPLETE!`);
  console.log(`📊 Total Unique Barber Schools/Colleges found: ${allSchools.size}\n`);

  console.log('--- List of Identified Schools ---');
  let counter = 1;
  for (const school of allSchools.values()) {
    console.log(`${counter}. ${school.name}`);
    console.log(`   📍 Address: ${school.address}`);
    console.log(`   📞 Phone:   ${school.phone}`);
    console.log(`   🌐 Website: ${school.website}`);
    console.log(`   ⭐ Rating:  ${school.rating}`);
    console.log('------------------------------------------------');
    counter++;
  }
}

searchBarberSchools();
