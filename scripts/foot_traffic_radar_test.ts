import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts";

await config({ path: ".env.local", export: true });

const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");

if (!GOOGLE_MAPS_API_KEY) {
  console.error("Missing GOOGLE_MAPS_API_KEY in .env.local");
  Deno.exit(1);
}

// Target Shop: Signature Fadez
const SHOP_LAT = 29.552846;
const SHOP_LNG = -95.11901739999999;
const SHOP_PLACE_ID = "ChIJldR92B6bQIYRKZpa5n-QqAg"; // From DB
const RADIUS_METERS = 800; // ~0.5 miles

async function fetchGooglePlaces(includedTypes: string[], maxResults: number) {
  const url = "https://places.googleapis.com/v1/places:searchNearby";
  const body = {
    includedTypes: includedTypes,
    maxResultCount: maxResults,
    locationRestriction: {
      circle: {
        center: { latitude: SHOP_LAT, longitude: SHOP_LNG },
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
  return await res.json();
}

// Very basic local keyword-based "AI" sentiment for the script
function analyzeVibe(reviews: any[]) {
  if (!reviews || reviews.length === 0) return "Not enough reviews to determine shop culture.";
  
  const allText = reviews.map(r => r.text?.text || "").join(" ").toLowerCase();
  
  let vibe = "";
  if (allText.includes("kid") || allText.includes("family") || allText.includes("son")) {
    vibe += "Family-Friendly | ";
  }
  if (allText.includes("music") || allText.includes("vibe") || allText.includes("chill")) {
    vibe += "Relaxed & Chill Vibe | ";
  }
  if (allText.includes("fast") || allText.includes("quick") || allText.includes("walk-in")) {
    vibe += "Fast-Paced / High Volume | ";
  }
  if (allText.includes("detail") || allText.includes("fresh") || allText.includes("clean fade")) {
    vibe += "High-Quality Precision Fades | ";
  }
  if (allText.includes("expensive") || allText.includes("premium")) {
    vibe += "Premium Pricing | ";
  }
  
  if (!vibe) vibe = "Standard Professional Barbershop";
  
  return vibe.replace(/ \| $/, "");
}

function getPriceSymbol(level: string) {
  if (level === "PRICE_LEVEL_INEXPENSIVE") return "$";
  if (level === "PRICE_LEVEL_MODERATE") return "$$";
  if (level === "PRICE_LEVEL_EXPENSIVE") return "$$$";
  if (level === "PRICE_LEVEL_VERY_EXPENSIVE") return "$$$$";
  return "?";
}

function calculateMomentum(reviews: any[]) {
  if (!reviews || reviews.length === 0) return { status: "UNKNOWN", message: "No review dates available." };

  const now = new Date();
  let recentCount = 0;
  let oldCount = 0;

  reviews.forEach(r => {
    if (!r.publishTime) return;
    const reviewDate = new Date(r.publishTime);
    const monthsAgo = (now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsAgo <= 6) {
      recentCount++;
    } else {
      oldCount++;
    }
  });

  if (recentCount >= 3) {
    return { status: "🚀 EXPLODING", message: `They have received multiple high-rating reviews in the last 6 months. Momentum and walk-in traffic is accelerating.` };
  } else if (recentCount > 0) {
    return { status: "🟢 STABLE", message: `Consistent recent reviews. The shop maintains a steady flow of clientele.` };
  } else {
    return { status: "⚠️ STAGNANT / DECLINING", message: `Warning: High historical reviews, but their most "relevant" reviews are over 6 months old. Walk-in traffic may be declining or moving to newer competitors.` };
  }
}

async function runAnalysis() {
  console.log(`\n📡 Scanning Foot Traffic & Competitor Radar for "Signature Fadez" (Radius: ${RADIUS_METERS}m)...\n`);

  // 1. Fetch Anchor Tenants (Added Price Level)
  const anchorTypes = ["gym", "cafe", "supermarket", "restaurant", "shopping_mall", "fast_food_restaurant", "coffee_shop"];
  const anchors = await fetchGooglePlaces(anchorTypes, 15);
  
  let priceScoreTotal = 0;
  let priceScoreCount = 0;

  anchors.sort((a: any, b: any) => (b.userRatingCount || 0) - (a.userRatingCount || 0));

  console.log("🎯 TOP ANCHOR TENANTS DETECTED NEARBY:");
  console.log("==================================================");
  anchors.slice(0, 5).forEach((anchor: any) => {
    const priceStr = getPriceSymbol(anchor.priceLevel);
    
    if (anchor.priceLevel === "PRICE_LEVEL_INEXPENSIVE") { priceScoreTotal += 1; priceScoreCount++; }
    if (anchor.priceLevel === "PRICE_LEVEL_MODERATE") { priceScoreTotal += 2; priceScoreCount++; }
    if (anchor.priceLevel === "PRICE_LEVEL_EXPENSIVE") { priceScoreTotal += 3; priceScoreCount++; }
    if (anchor.priceLevel === "PRICE_LEVEL_VERY_EXPENSIVE") { priceScoreTotal += 4; priceScoreCount++; }

    console.log(`- ${anchor.displayName?.text || "Unknown"} (${anchor.primaryType?.toUpperCase() || "RETAIL"})`);
    console.log(`  Volume: ⭐ ${anchor.rating || "N/A"} (${anchor.userRatingCount || 0} reviews)`);
    console.log(`  Pricing: ${priceStr === "?" ? "Unknown" : priceStr}`);
    console.log(`  Address: ${anchor.formattedAddress}\n`);
  });

  // 2. Local Wealth Indicator
  console.log("💰 LOCAL WEALTH INDICATOR (THE PRICE CEILING):");
  console.log("==================================================");
  let avgPriceScore = priceScoreCount > 0 ? priceScoreTotal / priceScoreCount : 0;
  
  if (avgPriceScore >= 2.5) {
    console.log("STATUS: $$$ AFFLUENT ZONE DETECTED");
    console.log("Surrounding businesses charge premium rates. High likelihood of supporting premium haircut pricing ($45 - $70+).");
  } else if (avgPriceScore >= 1.5) {
    console.log("STATUS: $$ MIDDLE-INCOME ZONE");
    console.log("Standard retail pricing. A good fit for standard market-rate haircuts ($30 - $45).");
  } else if (avgPriceScore > 0) {
    console.log("STATUS: $ VALUE/VOLUME ZONE");
    console.log("Surrounded by fast food and discount retail. Success here depends on high-volume, affordable cuts ($20 - $30).");
  } else {
    console.log("STATUS: UNKNOWN PRICING");
  }
  console.log("\n");

  // Fetch shop details for both Vibe and Momentum Check
  const shopDetails = await fetchShopDetails(SHOP_PLACE_ID);

  // 3. Review Momentum Tracker
  console.log("📈 REVIEW MOMENTUM TRACKER (GROWTH VELOCITY):");
  console.log("==================================================");
  if (shopDetails.reviews && shopDetails.reviews.length > 0) {
    const momentum = calculateMomentum(shopDetails.reviews);
    console.log(`STATUS: ${momentum.status}`);
    console.log(momentum.message);
  } else {
    console.log("No reviews available to calculate momentum.");
  }
  console.log("\n");

  // 4. Shop Vibe / Sentiment
  console.log("🧠 AI REVIEW SENTIMENT 'VIBE CHECK':");
  console.log("==================================================");
  
  if (shopDetails.reviews && shopDetails.reviews.length > 0) {
    console.log(`Analyzing recent reviews for ${shopDetails.displayName?.text}...`);
    const vibe = analyzeVibe(shopDetails.reviews);
    
    console.log(`\nCULTURE SUMMARY: ✨ [ ${vibe} ] ✨`);
    console.log("\nTop Review Snippet:");
    const bestReview = shopDetails.reviews.sort((a: any, b: any) => b.rating - a.rating)[0];
    console.log(`"${bestReview.text?.text.substring(0, 150)}..." - ⭐ ${bestReview.rating}/5`);
  } else {
    console.log("No reviews available for vibe check.");
  }
  console.log("\n");
}

runAnalysis();
