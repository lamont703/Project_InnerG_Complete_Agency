import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const fileContent = fs.readFileSync('temp_image.jpg');
  
  // Upload to storage
  const fileName = `shop-images/1780940799715-converted.jpg`;
  const { data, error } = await supabase.storage.from('shop-images').upload(fileName, fileContent, {
    contentType: 'image/jpeg',
    upsert: true
  });
  
  if (error) {
    console.error("Upload error:", error);
    return;
  }
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage.from('shop-images').getPublicUrl(fileName);
  console.log("Public URL:", publicUrl);
  
  // Update DB
  const oldUrl = "https://senkwhdxgtypcrtoggyf.supabase.co/storage/v1/object/public/shop-images/shop-images/1780940799715-8970b5ba-ebb2-4879-b4d1-2e0180db54d9-1_all_2579.heif?t=1780940800523";
  // The database URL actually might not have the ?t query param in the DB, let's use like query
  
  const { data: dbData, error: dbError } = await supabase
    .from('agent_barbershop_leads')
    .update({ shop_image_url: publicUrl })
    .ilike('shop_image_url', '%1_all_2579.heif%')
    .select();
    
  if (dbError) {
    console.error("DB Update Error:", dbError);
  } else {
    console.log("Updated rows:", dbData.length);
  }
}

run();
