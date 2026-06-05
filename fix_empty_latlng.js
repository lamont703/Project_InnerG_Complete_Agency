require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: shops } = await supabase
    .from("agent_barbershop_leads")
    .select("id, formatted_address")
    .is("latitude", null)
    .not("formatted_address", "is", null);

  for (const shop of shops || []) {
    if (shop.formatted_address) {
      const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(shop.formatted_address)}&key=${process.env.GOOGLE_MAPS_API_KEY}`);
      const geoData = await geoRes.json();
      if (geoData.status === 'OK' && geoData.results && geoData.results.length > 0) {
        const lat = geoData.results[0].geometry.location.lat.toString();
        const lng = geoData.results[0].geometry.location.lng.toString();
        
        console.log(`Updating ${shop.id} (${shop.formatted_address}) with Lat: ${lat}, Lng: ${lng}`);
        await supabase.from("agent_barbershop_leads").update({ latitude: lat, longitude: lng }).eq("id", shop.id);
      } else {
        console.log(`Geocoding failed for ${shop.id} (${shop.formatted_address})`);
      }
    }
  }
}
run();
