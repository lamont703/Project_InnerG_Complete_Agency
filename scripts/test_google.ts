import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts";
await config({ path: ".env.local", export: true });
const googleMapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY")!;

async function test() {
  const queryStr = `NeeCee's Barber College in Abilene, TX`;
  const url = `https://places.googleapis.com/v1/places:searchText`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': googleMapsKey,
      'X-Goog-FieldMask': 'places.formattedAddress,places.location'
    },
    body: JSON.stringify({
      textQuery: queryStr
    })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
test();
