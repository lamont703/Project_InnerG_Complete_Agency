import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import { parse } from "https://deno.land/std@0.167.0/encoding/csv.ts"
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts"

// Load .env.local specifically
await config({ path: ".env.local", export: true })

// --- Supabase Credentials ---
const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || ""
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const supabase = createClient(supabaseUrl, supabaseKey)

// Mirrors lib/slug.ts — this script runs under Deno, not the Next app, so it
// can't import from lib/.
function slugify(input: string): string {
  return (input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
}
function buildSlug(name: string, city: string, id: string): string {
  return `${slugify(name || "entity")}-${slugify(city || "tx")}-${id.replace(/-/g, "").slice(0, 8)}`
}

async function importCSV() {
  console.log("🚀 Starting Bulk Import of Google_Texas_Barbershops.csv to Supabase...")
  const filePath = "public/Google_Texas_Barbershops.csv"
  
  try {
    const content = await Deno.readTextFile(filePath)
    const rows = parse(content, { skipFirstRow: true }) as any[]
    
    console.log(`📡 Parsed ${rows.length} rows from CSV. Proceeding with upsert...`)

    let successCount = 0
    let skipCount = 0
    let errorCount = 0
    
    for (const r of rows) {
      let cleanPhone = r.Telephone?.replace(/[^\d]/g, "") || ""
      if (cleanPhone.length === 10) cleanPhone = "+1" + cleanPhone
      else if (cleanPhone.length === 11 && cleanPhone.startsWith("1")) cleanPhone = "+" + cleanPhone

      if (!cleanPhone) {
        skipCount++
        continue;
      }

      // Check if shop already exists by phone to prevent duplicates
      const { data: existing } = await supabase
        .from("agent_barbershop_leads")
        .select("id")
        .eq("phone", cleanPhone)
        .maybeSingle()

      if (existing) {
         skipCount++
         continue
      }

      // Insert new lead record
      const { data: row, error } = await supabase
        .from("agent_barbershop_leads")
        .insert({
          shop_name: r.BusinessName,
          owner_name: "Unknown Owner",
          phone: cleanPhone,
          city: r.CityHub || "Unknown",
          hiring_need: false,
          rent_type: "Unknown",
          rent_rate: null,
          specialty_desired: "Unknown",
          booth_count_available: 0,
          last_conversation_history: "",
          conversation_turns: [],
          // Telemetry
          outreach_status: "pending",
          outreach_attempts: 0,
          // CSV Rich Data
          place_id: r.PlaceID || null,
          formatted_address: r.FormattedAddress || null,
          website: r.Website || null,
          latitude: r.Latitude ? parseFloat(r.Latitude) : null,
          longitude: r.Longitude ? parseFloat(r.Longitude) : null,
          rating: r.Rating ? parseFloat(r.Rating) : null,
          total_reviews: r.TotalReviews ? parseInt(r.TotalReviews, 10) : 0,
          place_types: r.PlaceTypes || null,
          business_status: r.BusinessStatus || null
        })
        .select("id")
        .single()

      if (error) {
        console.error(`❌ Error inserting ${r.BusinessName}:`, error.message)
        errorCount++
      } else {
        if (row) {
          const slug = buildSlug(r.BusinessName, r.CityHub, row.id)
          await supabase.from("agent_barbershop_leads").update({ slug }).eq("id", row.id)
        }
        successCount++
        if (successCount % 10 === 0) {
           console.log(`✅ Inserted ${successCount} shops so far...`)
        }
      }
    }

    console.log("\n================================================")
    console.log(`🏁 IMPORT COMPLETE`)
    console.log(`✅ Successfully Inserted: ${successCount}`)
    console.log(`⏭️  Skipped (No Phone or Duplicate): ${skipCount}`)
    console.log(`❌ Errors: ${errorCount}`)
    console.log("================================================\n")

  } catch (err: any) {
    console.error("Critical Failure reading or parsing CSV:", err.message)
  }
}

importCSV()
