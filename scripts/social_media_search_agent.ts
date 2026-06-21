import { createClient } from "npm:@supabase/supabase-js";

// Initialize Supabase Client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Gemini
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

async function findInstagramHandle(shopName: string, city: string, ownerName: string, phone: string): Promise<string | null> {
  const prompt = `
    Find the Instagram handle for a barbershop named "${shopName}" located in "${city}". 
    The owner is "${ownerName}" and their phone number is "${phone}".
    
    Search the web for their official Instagram profile.
    If you find it, reply ONLY with the handle (e.g., @examplehandle).
    If you cannot confidently find an exact match, reply ONLY with NOT_FOUND.
  `;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }] // Enable Google Search Grounding
      })
    });
    
    const data = await res.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (answer && answer.startsWith("@") && answer.split(" ").length === 1) {
      return answer;
    }
    
    return null;
  } catch (error) {
    console.error(`[Error] searching for ${shopName}:`, error);
    return null;
  }
}

async function runAgent() {
  console.log("🚀 Starting Social Media Handle Search Agent...");

  // 1. Fetch 10 shops with hiring needs and no IG handle
  const { data: shops, error } = await supabase
    .from("agent_barbershop_leads")
    .select("id, shop_name, city, owner_name, phone")
    .eq("hiring_need", true)
    .is("instagram_handle", null)
    .limit(10);

  if (error) {
    console.error("Failed to fetch shops:", error);
    return;
  }

  if (!shops || shops.length === 0) {
    console.log("✅ No shops found needing an Instagram search.");
    return;
  }

  console.log(`🔍 Found ${shops.length} shops to search. Beginning search loop...\n`);

  for (const shop of shops) {
    console.log(`⏳ Searching for: ${shop.shop_name} in ${shop.city}...`);
    
    const handle = await findInstagramHandle(
      shop.shop_name,
      shop.city,
      shop.owner_name || "",
      shop.phone || ""
    );

    if (handle) {
      console.log(`   🎉 FOUND: ${handle}`);
      
      // Update Database
      const { error: updateError } = await supabase
        .from("agent_barbershop_leads")
        .update({ instagram_handle: handle })
        .eq("id", shop.id);
        
      if (updateError) {
        console.error(`   ❌ Failed to update DB for ${shop.shop_name}:`, updateError);
      } else {
        console.log(`   💾 Saved ${handle} to database!`);
      }
    } else {
      console.log(`   🤷‍♂️ Not found or no confident match.`);
    }

    // Add a 3-second delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log("\n✅ Search Agent Complete.");
}

runAgent();
