import "https://deno.land/std@0.167.0/dotenv/load.ts";

const GHL_API_KEY = Deno.env.get("GHL_API_KEY") || "";
const LOCATION_ID = "QLyYYRoOhCg65lKW9HDX";

async function run() {
  const res = await fetch(`https://services.leadconnectorhq.com/locations/${LOCATION_ID}/customFields`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${GHL_API_KEY}`,
      "Version": "2021-07-28",
      "Accept": "application/json"
    }
  });
  
  if (!res.ok) {
    console.error(await res.text());
    return;
  }
  
  const data = await res.json();
  const field = data.customFields?.find((f: any) => f.name.toLowerCase().includes("shop_profile_page_url") || f.fieldKey.includes("shop_profile_page_url"));
  console.log("Found Field:", field || "Not found in response");
}

run();
