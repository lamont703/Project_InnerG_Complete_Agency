require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

async function fetchSalonImages() {
  console.log("Fetching salons missing photos...");
  const { data: salons, error } = await supabase
    .from('agent_salon_leads')
    .select('id, shop_name, place_id')
    .not('place_id', 'is', null)
    .is('google_images', null);

  if (error) {
    console.error("Error fetching salons:", error);
    return;
  }

  console.log(`Found ${salons.length} salons.`);

  let successCount = 0;
  let skipCount = 0;

  for (const salon of salons) {
    console.log(`\nProcessing: ${salon.shop_name}`);

    const detailsUrl = `https://places.googleapis.com/v1/places/${salon.place_id}?fields=photos&key=${GOOGLE_API_KEY}`;
    const detailsRes = await fetch(detailsUrl);

    if (!detailsRes.ok) {
      console.log(`Failed to fetch from Google Places API for ${salon.shop_name}`);
      skipCount++;
      continue;
    }

    const detailsData = await detailsRes.json();
    const photos = detailsData.photos || [];

    if (photos.length === 0) {
      console.log(`No photos found for ${salon.shop_name}`);
      skipCount++;
      continue;
    }

    // Get up to 5 photos
    const topPhotos = photos.slice(0, 5);
    const imageUrls = topPhotos.map((photo) =>
      `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=1000&maxWidthPx=1000&key=${GOOGLE_API_KEY}`
    );

    console.log(`Saving ${imageUrls.length} images for ${salon.shop_name}`);

    const { error: updateError } = await supabase
      .from('agent_salon_leads')
      .update({ google_images: imageUrls })
      .eq('id', salon.id);

    if (updateError) {
      console.error(`Failed to update ${salon.shop_name}:`, updateError);
      skipCount++;
    } else {
      console.log(`Successfully updated ${salon.shop_name}`);
      successCount++;
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nDone! Updated ${successCount} salons, skipped ${skipCount}.`);
}

fetchSalonImages();
