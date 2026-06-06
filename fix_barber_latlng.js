require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: barbers } = await supabase
    .from("agent_barber_leads")
    .select("id, address")
    .is("latitude", null)
    .not("address", "is", null)
    .not("address", "eq", "");

  for (const barber of barbers || []) {
    if (barber.address) {
      const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(barber.address)}&key=${process.env.GOOGLE_MAPS_API_KEY}`);
      const geoData = await geoRes.json();
      if (geoData.status === 'OK' && geoData.results && geoData.results.length > 0) {
        const lat = geoData.results[0].geometry.location.lat.toString();
        const lng = geoData.results[0].geometry.location.lng.toString();
        
        console.log(`Updating ${barber.id} (${barber.address}) with Lat: ${lat}, Lng: ${lng}`);
        await supabase.from("agent_barber_leads").update({ latitude: lat, longitude: lng }).eq("id", barber.id);
      } else {
        console.log(`Geocoding failed for ${barber.id} (${barber.address})`);
      }
    }
  }
}
run();
