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

async function pullGooglePlacesSalons() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error('\n❌ ERROR: Google Maps API Key not found in environment.');
    process.exit(1);
  }

  console.log('--- Google Places API (New) v1 Houston Hair & Beauty Salon Extractor ---\n');

  // Same Houston zip code sweep used for barbershops and supply stores, so
  // coverage stays consistent across all directories.
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

  // Two text queries per zip so we catch both "hair salon" and "beauty salon"
  // storefronts (many salons brand themselves under either term).
  const searchTerms = ['hair salon', 'beauty salon'];

  for (const zipCode of zipCodes) {
    for (const term of searchTerms) {
      console.log(`🔍 Querying "${term}" for: ${zipCode}...`);

      const url = 'https://places.googleapis.com/v1/places:searchText';

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.businessStatus,places.nationalPhoneNumber,places.websiteUri,places.regularOpeningHours'
          },
          body: JSON.stringify({
            textQuery: `${term} in ${zipCode}`,
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
            cityHub: `Houston`,
            phone: place.nationalPhoneNumber || null,
            website: place.websiteUri || null,
            lat,
            lng,
            rating: place.rating ?? null,
            reviews: place.userRatingCount || 0,
            types: (place.types || []).join(' | '),
            status: place.businessStatus || 'OPERATIONAL',
            hours
          });
        });

        console.log(`   - Retrieved ${results.length} venues (Cumulative Total: ${allPlaces.size})`);

        // Throttle slightly to respect API limits
        await sleep(1000);

      } catch (err) {
        console.error(`   ❌ Failed querying ${zipCode} ("${term}"):`, err.message);
      }
    }
  }

  console.log(`\n💾 Total unique Houston hair & beauty salons compiled: ${allPlaces.size}`);

  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials missing. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in .env.local');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // --- Dedup guard against the barbershop table ---
  // A "hair salon" search can surface businesses already tracked as
  // barbershops (some shops offer both barbering and broader hair/beauty
  // services). Per the same product requirement used for supply stores, any
  // place already tracked as a barbershop should NOT also be added here.
  console.log(`\n🔎 Checking for overlap with agent_barbershop_leads...`);
  const existingBarbershopPlaceIds = new Set();
  {
    const PAGE_SIZE = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('agent_barbershop_leads')
        .select('place_id')
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error('❌ Failed to fetch existing barbershop place_ids:', error.message);
        break;
      }
      if (!data || data.length === 0) break;

      data.forEach(row => { if (row.place_id) existingBarbershopPlaceIds.add(row.place_id); });
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }
  console.log(`   - Found ${existingBarbershopPlaceIds.size} existing barbershop place_id(s) to exclude.`);

  let duplicateSkipCount = 0;
  const placesToImport = [];
  for (const [placeId, place] of allPlaces.entries()) {
    if (existingBarbershopPlaceIds.has(placeId)) {
      duplicateSkipCount++;
      continue;
    }
    placesToImport.push(place);
  }
  console.log(`   - Skipping ${duplicateSkipCount} salon(s) already tracked as barbershops.`);

  console.log(`\n🚀 Starting Direct Upsert to Supabase (${placesToImport.length} salon(s))...`);
  let successCount = 0;
  let errorCount = 0;

  for (const place of placesToImport) {
    let cleanPhone = place.phone ? place.phone.replace(/[^\d]/g, "") : "";
    if (cleanPhone.length === 10) cleanPhone = "+1" + cleanPhone;
    else if (cleanPhone.length === 11 && cleanPhone.startsWith("1")) cleanPhone = "+" + cleanPhone;

    const { data: row, error } = await supabase
      .from("agent_salon_leads")
      .upsert({
        place_id: place.placeId,
        shop_name: place.name,
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
        site_config: place.hours ? { hours: place.hours } : null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'place_id' })
      .select('id, slug')
      .single();

    if (!error && row && !row.slug) {
      const slug = buildSlug(place.name, place.cityHub, row.id);
      await supabase.from("agent_salon_leads").update({ slug }).eq('id', row.id);
    }

    if (error) {
      console.error(`❌ Error upserting ${place.name}:`, error.message);
      errorCount++;
    } else {
      successCount++;
      if (successCount % 10 === 0) {
        console.log(`✅ Upserted ${successCount} salons so far...`);
      }
    }
  }

  console.log("\n================================================");
  console.log(`🏁 DIRECT IMPORT COMPLETE`);
  console.log(`✅ Successfully Upserted: ${successCount}`);
  console.log(`⏭️  Skipped (Duplicate of Barbershop): ${duplicateSkipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log("================================================\n");
}

pullGooglePlacesSalons();
