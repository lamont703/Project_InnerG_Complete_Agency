import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts";

await config({ path: ".env.local", export: true });

const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

if (!GOOGLE_MAPS_API_KEY) {
  console.error("Missing GOOGLE_MAPS_API_KEY in .env.local");
  Deno.exit(1);
}

const RADIUS_METERS = 800;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function fetchGooglePlacesNearby(lat: number, lng: number, includedTypes: string[], maxResults: number) {
  const url = "https://places.googleapis.com/v1/places:searchNearby";
  const body = {
    includedTypes,
    maxResultCount: maxResults,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: RADIUS_METERS
      }
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY as string,
      "X-Goog-FieldMask": "places.displayName,places.primaryType,places.rating,places.userRatingCount,places.formattedAddress,places.priceLevel"
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  return data.places || [];
}

async function fetchShopDetails(placeId: string) {
  const url = `https://places.googleapis.com/v1/places/${placeId}?fields=reviews,displayName`;
  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY as string,
    }
  });
  const data = await res.json();
  return data;
}

function analyzeVibe(reviews: any[]) {
  if (!reviews || reviews.length === 0) return "Not enough reviews to determine shop culture.";
  const allText = reviews.map(r => r.text?.text || "").join(" ").toLowerCase();
  
  let vibe = "";
  if (allText.includes("kid") || allText.includes("family") || allText.includes("son")) vibe += "Family-Friendly | ";
  if (allText.includes("music") || allText.includes("vibe") || allText.includes("chill")) vibe += "Relaxed & Chill Vibe | ";
  if (allText.includes("fast") || allText.includes("quick") || allText.includes("walk-in")) vibe += "Fast-Paced / High Volume | ";
  if (allText.includes("detail") || allText.includes("fresh") || allText.includes("clean fade")) vibe += "High-Quality Precision Fades | ";
  if (allText.includes("expensive") || allText.includes("premium")) vibe += "Premium Pricing | ";
  
  if (!vibe) vibe = "Standard Professional Barbershop";
  return vibe.replace(/ \| $/, "");
}

function calculateMomentum(reviews: any[]) {
  if (!reviews || reviews.length === 0) return "⚪ NO RECENT DATA";

  const now = new Date();
  let recentCount = 0;

  reviews.forEach(r => {
    if (!r.publishTime) return;
    const reviewDate = new Date(r.publishTime);
    const monthsAgo = (now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsAgo <= 6) recentCount++;
  });

  if (recentCount >= 3) return "🚀 EXPLODING";
  if (recentCount > 0) return "🟢 STABLE";
  return "⚠️ DECLINING / STAGNANT";
}

async function processShop(shop: any) {
  try {
    const lat = parseFloat(shop.latitude);
    const lng = parseFloat(shop.longitude);
    const placeId = shop.place_id;

    if (isNaN(lat) || isNaN(lng) || !placeId) {
      console.log(`Skipping ${shop.shop_name} due to missing lat/lng/place_id`);
      return;
    }

    console.log(`Analyzing: ${shop.shop_name}`);

    // 1. Anchors
    const anchorTypes = ["gym", "supermarket", "restaurant", "shopping_mall", "fast_food_restaurant", "coffee_shop"];
    const anchors = await fetchGooglePlacesNearby(lat, lng, anchorTypes, 20);
    anchors.sort((a: any, b: any) => (b.userRatingCount || 0) - (a.userRatingCount || 0));

    // 2. Competitors
    const compTypes = ["barber_shop", "hair_salon", "beauty_salon"];
    const competitors = await fetchGooglePlacesNearby(lat, lng, compTypes, 20);

    // 3. Shop Details (Reviews)
    const shopDetails = await fetchShopDetails(placeId);

    // Calculate metrics
    const competitorCount = competitors.length;
    const topAnchors = anchors.slice(0, 4).map((a: any) => ({
      name: a.displayName?.text,
      type: a.primaryType,
      rating: a.rating,
      reviews: a.userRatingCount
    }));

    let priceScoreTotal = 0;
    let priceScoreCount = 0;
    anchors.forEach((a: any) => {
      if (a.priceLevel === "PRICE_LEVEL_INEXPENSIVE") { priceScoreTotal += 1; priceScoreCount++; }
      if (a.priceLevel === "PRICE_LEVEL_MODERATE") { priceScoreTotal += 2; priceScoreCount++; }
      if (a.priceLevel === "PRICE_LEVEL_EXPENSIVE") { priceScoreTotal += 3; priceScoreCount++; }
      if (a.priceLevel === "PRICE_LEVEL_VERY_EXPENSIVE") { priceScoreTotal += 4; priceScoreCount++; }
    });

    let wealthIndicator = "UNKNOWN PRICING";
    const avgPrice = priceScoreCount > 0 ? priceScoreTotal / priceScoreCount : 0;
    if (avgPrice >= 2.5) wealthIndicator = "$$$ AFFLUENT ZONE";
    else if (avgPrice >= 1.5) wealthIndicator = "$$ MIDDLE-INCOME ZONE";
    else if (avgPrice > 0) wealthIndicator = "$ VALUE/VOLUME ZONE";

    const momentum = calculateMomentum(shopDetails?.reviews || []);
    const vibe = analyzeVibe(shopDetails?.reviews || []);

    let oppStatus = "🔵 STANDARD MARKET ZONE";
    if (anchors.length > 8 && competitorCount < 3) oppStatus = "🦄 UNICORN ZONE";
    else if (anchors.length > 8 && competitorCount > 8) oppStatus = "⚔️ BATTLEGROUND ZONE";
    else if (anchors.length < 4 && competitorCount > 5) oppStatus = "⚠️ HIGH RISK ZONE";

    // Update DB
    await supabase.from('agent_barbershop_leads').update({
      opportunity_status: oppStatus,
      top_anchor_tenants: topAnchors,
      competitor_count_800m: competitorCount,
      local_wealth_indicator: wealthIndicator,
      review_momentum_status: momentum,
      ai_culture_summary: vibe,
      radar_last_updated_at: new Date().toISOString()
    }).eq('id', shop.id);

    console.log(`✅ Completed: ${shop.shop_name} (${oppStatus})`);

  } catch (error) {
    console.error(`❌ Error processing ${shop.shop_name}:`, error);
  }
}

async function main() {
  console.log("Fetching shops with hiring_need = true...");
  const { data: shops, error } = await supabase
    .from('agent_barbershop_leads')
    .select('id, shop_name, latitude, longitude, place_id')
    .eq('hiring_need', true)
    // .limit(3); // Uncomment to test a small batch first

  if (error || !shops) {
    console.error("Failed to fetch shops:", error);
    Deno.exit(1);
  }

  console.log(`Found ${shops.length} shops. Starting batch update...`);

  for (const shop of shops) {
    await processShop(shop);
    await delay(1000); // 1 second delay between shops to respect API rate limits
  }

  console.log("🎉 Batch update complete!");
}

main();
