require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service key for admin updates
);

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

async function fetchBeautySupplyStoreImages() {
  console.log("Fetching beauty supply stores missing photos...");
  const { data: stores, error } = await supabase
    .from('agent_beauty_supply_store_leads')
    .select('id, name, place_id')
    .not('place_id', 'is', null)
    .is('google_images', null);

  if (error) {
    console.error("Error fetching stores:", error);
    return;
  }

  console.log(`Found ${stores.length} stores.`);

  let successCount = 0;
  let skipCount = 0;

  for (const store of stores) {
    console.log(`\nProcessing: ${store.name}`);

    const detailsUrl = `https://places.googleapis.com/v1/places/${store.place_id}?fields=photos&key=${GOOGLE_API_KEY}`;
    const detailsRes = await fetch(detailsUrl);

    if (!detailsRes.ok) {
      console.log(`Failed to fetch from Google Places API for ${store.name}`);
      skipCount++;
      continue;
    }

    const detailsData = await detailsRes.json();
    const photos = detailsData.photos || [];

    if (photos.length === 0) {
      console.log(`No photos found for ${store.name}`);
      skipCount++;
      continue;
    }

    // Get up to 5 photos
    const topPhotos = photos.slice(0, 5);
    const imageUrls = topPhotos.map((photo) =>
      `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=1000&maxWidthPx=1000&key=${GOOGLE_API_KEY}`
    );

    console.log(`Saving ${imageUrls.length} images for ${store.name}`);

    const { error: updateError } = await supabase
      .from('agent_beauty_supply_store_leads')
      .update({ google_images: imageUrls })
      .eq('id', store.id);

    if (updateError) {
      console.error(`Failed to update ${store.name}:`, updateError);
      skipCount++;
    } else {
      console.log(`Successfully updated ${store.name}`);
      successCount++;
    }
  }

  console.log(`\nDone! Updated ${successCount} stores, skipped ${skipCount}.`);
}

fetchBeautySupplyStoreImages();
