require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Simple CSV line parser that respects quotes
function parseCSVLine(line) {
  const row = [];
  let inQuotes = false;
  let currentField = '';

  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }
  row.push(currentField.trim());
  return row;
}

// CSV row formatting utility
function formatCSVRow(columns) {
  return columns.map(col => {
    const val = col !== undefined && col !== null ? String(col).trim() : '';
    const escaped = val.replace(/"/g, '""');
    return `"${escaped}"`;
  }).join(',');
}

async function enrichSchools() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('\n❌ ERROR: Google Maps API Key not found in environment.');
    process.exit(1);
  }

  const inputPath = path.join(__dirname, '../public/Texas Accredited Barber Schools/2026 Texas Accredited Barber Schools.csv');
  const outputPath = path.join(__dirname, '../public/2026 Texas Accredited Schools Plus Google Places Data.csv');

  console.log('--- Texas Accredited Schools Google Places Enricher ---');
  
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input CSV not found at: ${inputPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(inputPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() !== '');
  
  // Parse Headers
  const baseHeaders = parseCSVLine(lines[0]);
  
  // Prepare Output Headers (Base + Google Places Premium Data)
  const outputHeaders = [
    ...baseHeaders,
    'Google_PlaceID',
    'Google_Name',
    'Google_Address',
    'Latitude',
    'Longitude',
    'Telephone',
    'Website',
    'Rating',
    'TotalReviews',
    'Types',
    'BusinessStatus',
    'OpeningHours'
  ];
  
  const csvLines = [outputHeaders.join(',')];

  // Process rows
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 3) continue;

    const schoolName = row[0];
    const city = row[2];
    
    const query = `${schoolName} in ${city}`;
    console.log(`🔍 [${i}/${lines.length - 1}] Querying Google Places for: ${query}`);

    const url = 'https://places.googleapis.com/v1/places:searchText';
    
    // Default empty google data
    let googleData = {
      id: 'N/A', name: 'N/A', address: 'N/A', lat: 'N/A', lng: 'N/A',
      phone: 'N/A', website: 'N/A', rating: 'N/A', reviews: 'N/A', types: 'N/A', status: 'N/A', hours: 'N/A'
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          // Extracting the absolute maximum data bank possible per location via Search API
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.businessStatus,places.nationalPhoneNumber,places.websiteUri,places.regularOpeningHours.weekdayDescriptions'
        },
        body: JSON.stringify({
          textQuery: query,
          languageCode: 'en'
        })
      });

      if (response.ok) {
        const data = await response.json();
        const place = data.places && data.places.length > 0 ? data.places[0] : null;

        if (place) {
          googleData = {
            id: place.id || 'N/A',
            name: place.displayName?.text || 'N/A',
            address: place.formattedAddress || 'N/A',
            lat: place.location?.latitude || 'N/A',
            lng: place.location?.longitude || 'N/A',
            phone: place.nationalPhoneNumber || 'N/A',
            website: place.websiteUri || 'N/A',
            rating: place.rating || 'N/A',
            reviews: place.userRatingCount || '0',
            types: (place.types || []).join(' | '),
            status: place.businessStatus || 'N/A',
            hours: place.regularOpeningHours?.weekdayDescriptions ? place.regularOpeningHours.weekdayDescriptions.join('; ') : 'N/A'
          };
          console.log(`   ✅ Match found: ${googleData.name}`);
        } else {
          console.log(`   ⚠️ No match found in Google database.`);
        }
      } else {
        console.error(`   ❌ API Error: ${response.status}`);
      }
    } catch (err) {
      console.error(`   ❌ Request Failed:`, err.message);
    }

    // Combine base row with Google data
    const outputRow = formatCSVRow([
      ...row,
      googleData.id,
      googleData.name,
      googleData.address,
      googleData.lat,
      googleData.lng,
      googleData.phone,
      googleData.website,
      googleData.rating,
      googleData.reviews,
      googleData.types,
      googleData.status,
      googleData.hours
    ]);
    
    csvLines.push(outputRow);
    
    // Mandatory Google API throttle to prevent QPS (Queries Per Second) limits
    await sleep(600);
  }

  // Save the final enriched CSV
  try {
    fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf-8');
    console.log(`\n🎉 SUCCESS: Data enrichment complete!`);
    console.log(`📁 File Saved: public/2026 Texas Accredited Schools Plus Google Places Data.csv`);
  } catch (err) {
    console.error('\n❌ Failed to save enriched CSV:', err.message);
  }
}

enrichSchools();
