import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service key for admin updates
);

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

async function fetchGoogleImages() {
  console.log("Fetching shops with hiring_need = true...");
  const { data: shops, error } = await supabase
    .from('agent_barbershop_leads')
    .select('id, shop_name, formatted_address, place_id')
    .eq('hiring_need', true);

  if (error) {
    console.error("Error fetching shops:", error);
    return;
  }

  console.log(`Found ${shops.length} shops.`);

  for (const shop of shops) {
    console.log(`\nProcessing: ${shop.shop_name}`);
    let placeId = shop.place_id;

    if (!placeId) {
      console.log(`No place_id for ${shop.shop_name}. Skipping.`);
      continue;
    }

    // Use New Places API
    const detailsUrl = `https://places.googleapis.com/v1/places/${placeId}?fields=photos&key=${GOOGLE_API_KEY}`;
    const detailsRes = await fetch(detailsUrl);
    
    if (!detailsRes.ok) {
      console.log(`Failed to fetch from Google Places API for ${shop.shop_name}`);
      continue;
    }

    const detailsData = await detailsRes.json();
    const photos = detailsData.photos || [];
    
    if (photos.length === 0) {
      console.log(`No photos found for ${shop.shop_name}`);
      continue;
    }

    // Get up to 5 photos
    const topPhotos = photos.slice(0, 5);
    const imageUrls = topPhotos.map((photo: any) => 
      `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=1000&maxWidthPx=1000&key=${GOOGLE_API_KEY}`
    );

    console.log(`Saving ${imageUrls.length} images for ${shop.shop_name}`);

    // Update DB
    const { error: updateError } = await supabase
      .from('agent_barbershop_leads')
      .update({ google_images: imageUrls })
      .eq('id', shop.id);

    if (updateError) {
      console.error(`Failed to update ${shop.shop_name}:`, updateError);
    } else {
      console.log(`Successfully updated ${shop.shop_name}`);
    }
  }

  console.log("\nDone!");
}

fetchGoogleImages();
