import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

async function check() {
  const placeId = 'ChIJczM3TVyfToYRKw1YXd5BepQ';
  const url = `https://places.googleapis.com/v1/places/${placeId}?fields=photos&key=${GOOGLE_API_KEY}`;
  console.log(url);
  const res = await fetch(url);
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
check();
