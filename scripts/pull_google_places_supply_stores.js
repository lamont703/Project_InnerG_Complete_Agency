require('dotenv').config({ path: '.env.local' });

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

async function pullGooglePlacesSupplyStores() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error('\n❌ ERROR: Google Maps API Key not found in environment.');
    process.exit(1);
  }

  console.log('--- Google Places API (New) v1 Houston Barber Supply Store Extractor ---\n');

  // Comprehensive list of major Houston zip codes (same sweep used for barbershops)
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
  const allPlaces = new Map(); // Prevent duplicates by place id

  for (const zipCode of zipCodes) {
    console.log(`🔍 Querying supply stores for: ${zipCode}...`);

    const url = 'https://places.googleapis.com/v1/places:searchText';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.businessStatus,places.nationalPhoneNumber,places.websiteUri,places.priceLevel,places.regularOpeningHours'
        },
        body: JSON.stringify({
          textQuery: `barber supply store in ${zipCode}`,
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
        const lat = place.location?.latitude ?? null;
        const lng = place.location?.longitude ?? null;
        const hours = place.regularOpeningHours?.weekdayDescriptions
          ? place.regularOpeningHours.weekdayDescriptions
          : null;

        allPlaces.set(place.id, {
          placeId: place.id,
          name,
          address: place.formattedAddress || null,
          cityHub: `Houston ${zipCode}`,
          phone: place.nationalPhoneNumber || null,
          website: place.websiteUri || null,
          lat,
          lng,
          rating: place.rating ?? null,
          reviews: place.userRatingCount || 0,
          types: (place.types || []).join(' | '),
          status: place.businessStatus || 'OPERATIONAL',
          priceLevel: place.priceLevel || null,
          hours
        });
      });

      console.log(`   - Retrieved ${results.length} venues (Cumulative Total: ${allPlaces.size})`);

      // Throttle slightly to respect API limits
      await sleep(1000);

    } catch (err) {
      console.error(`   ❌ Failed querying ${zipCode}:`, err.message);
    }
  }

  console.log(`\n💾 Total unique Houston barber supply stores compiled: ${allPlaces.size}`);

  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials missing. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in .env.local');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`\n🚀 Starting Direct Upsert to Supabase...`);
  let successCount = 0;
  let errorCount = 0;

  for (const [, place] of allPlaces.entries()) {
    let cleanPhone = place.phone ? place.phone.replace(/[^\d]/g, "") : "";
    if (cleanPhone.length === 10) cleanPhone = "+1" + cleanPhone;
    else if (cleanPhone.length === 11 && cleanPhone.startsWith("1")) cleanPhone = "+" + cleanPhone;

    const { data: row, error } = await supabase
      .from("agent_barber_supply_store_leads")
      .upsert({
        place_id: place.placeId,
        name: place.name,
        formatted_address: place.address,
        city: place.cityHub,
        phone: cleanPhone || null,
        website: place.website,
        latitude: place.lat,
        longitude: place.lng,
        rating: place.rating,
        total_reviews: place.reviews,
        place_types: place.types || null,
        business_status: place.status,
        price_level: place.priceLevel,
        hours: place.hours,
        updated_at: new Date().toISOString()
      }, { onConflict: 'place_id' })
      .select('id, slug')
      .single();

    if (!error && row && !row.slug) {
      const slug = buildSlug(place.name, place.cityHub, row.id);
      await supabase.from("agent_barber_supply_store_leads").update({ slug }).eq('id', row.id);
    }

    if (error) {
      console.error(`❌ Error upserting ${place.name}:`, error.message);
      errorCount++;
    } else {
      successCount++;
      if (successCount % 10 === 0) {
        console.log(`✅ Upserted ${successCount} stores so far...`);
      }
    }
  }

  console.log("\n================================================");
  console.log(`🏁 DIRECT IMPORT COMPLETE`);
  console.log(`✅ Successfully Upserted: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log("================================================\n");
}

pullGooglePlacesSupplyStores();
