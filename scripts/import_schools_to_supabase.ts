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
  console.log("🚀 Starting Bulk Import of Barber Schools to Supabase...")
  const filePath = "public/Texas Accredited Barber Schools/2026 Texas Accredited Barber Schools.csv"
  
  try {
    const content = await Deno.readTextFile(filePath)
    const rows = parse(content, { skipFirstRow: true }) as any[]
    
    console.log(`📡 Parsed ${rows.length} rows from CSV. Proceeding with upsert...`)

    let successCount = 0
    let skipCount = 0
    let errorCount = 0
    
    for (const r of rows) {
      // The CSV columns: School, Contact, City, Status
      const schoolName = r.School?.trim()
      const contactName = r.Contact?.trim() || "Unknown"
      let city = r.City?.trim() || "Unknown"
      const status = r.Status?.trim() || "Unknown"

      // Strip the ', TX' off the city if it exists for cleaner data
      if (city.endsWith(", TX")) {
        city = city.replace(", TX", "")
      }

      if (!schoolName) {
        skipCount++
        continue
      }

      // Check if school already exists by name and city to prevent duplicates
      const { data: existing } = await supabase
        .from("agent_barber_school_leads")
        .select("id")
        .eq("school_name", schoolName)
        .eq("city", city)
        .maybeSingle()

      if (existing) {
         skipCount++
         continue
      }

      // Insert new school lead record
      const { data: row, error } = await supabase
        .from("agent_barber_school_leads")
        .insert({
          school_name: schoolName,
          admissions_rep_name: contactName,
          city: city,
          accreditation_status: status,
          contact_id: crypto.randomUUID(),

          // Existing CRM Columns (initialized)
          placement_rate_deficit: false,
          interested_in_placement: false,
          current_student_count: 0,
          system_used: null,
          email: null,

          // AI Context
          last_conversation_history: "",
          conversation_turns: [],

          // Telemetry Tracking
          outreach_status: "pending",
          outreach_attempts: 0
        })
        .select("id")
        .single()

      if (error) {
        console.error(`❌ Error inserting ${schoolName}:`, error.message)
        errorCount++
      } else {
        if (row) {
          const slug = buildSlug(schoolName, city, row.id)
          await supabase.from("agent_barber_school_leads").update({ slug }).eq("id", row.id)
        }
        successCount++
      }
    }

    console.log("\n================================================")
    console.log(`🏁 SCHOOL IMPORT COMPLETE`)
    console.log(`✅ Successfully Inserted: ${successCount}`)
    console.log(`⏭️  Skipped (Missing Name or Duplicate): ${skipCount}`)
    console.log(`❌ Errors: ${errorCount}`)
    console.log("================================================\n")

  } catch (err: any) {
    console.error("Critical Failure reading or parsing CSV:", err.message)
  }
}

importCSV()
