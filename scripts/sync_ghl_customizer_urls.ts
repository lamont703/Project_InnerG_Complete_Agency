import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseKey)

const GHL_API_KEY = process.env.GHL_API_KEY || ""
const LOCATION_ID = process.env.GHL_LOCATION_ID || "QLyYYRoOhCg65lKW9HDX"

async function run() {
  console.log("🚀 Starting GHL Sync for Customizer and Profile URLs...")

  // 1. Fetch custom fields from GHL
  console.log("Fetching custom fields from GHL...")
  const fieldsRes = await fetch(`https://services.leadconnectorhq.com/locations/${LOCATION_ID}/customFields`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${GHL_API_KEY}`,
      "Version": "2021-07-28",
      "Accept": "application/json"
    }
  })

  if (!fieldsRes.ok) {
    console.error("❌ Failed to fetch GHL custom fields:", await fieldsRes.text())
    process.exit(1)
  }

  const fieldsData = await fieldsRes.json()
  
  const customizerField = fieldsData.customFields?.find((f: any) => 
    f.name.toLowerCase().includes("customizer_url") || f.fieldKey.includes("customizer_url")
  )
  
  const profileField = fieldsData.customFields?.find((f: any) => 
    f.name.toLowerCase().includes("shop_profile_page_url") || f.fieldKey.includes("shop_profile_page_url")
  )

  if (!customizerField) {
    console.error("❌ Could not find a custom field named 'customizer_url' in GHL!")
    process.exit(1)
  }
  
  if (!profileField) {
    console.error("❌ Could not find a custom field named 'shop_profile_page_url' in GHL!")
    process.exit(1)
  }

  console.log(`✅ Found 'customizer_url' custom field! ID: ${customizerField.id}`)
  console.log(`✅ Found 'shop_profile_page_url' custom field! ID: ${profileField.id}`)

  // 2. Fetch shops with contact_id
  console.log("Fetching shops from database...")
  const { data: shops, error: fetchError } = await supabase
    .from("agent_barbershop_leads")
    .select("id, shop_name, contact_id, customizer_url, shop_profile_page_url")
    .not("contact_id", "is", null)

  if (fetchError) {
    console.error("❌ Error fetching shops:", fetchError.message)
    process.exit(1)
  }

  if (!shops || shops.length === 0) {
    console.log("✅ No shops found with a contact_id. Nothing to sync.")
    process.exit(0)
  }

  console.log(`📡 Found ${shops.length} contacts. Beginning sync...`)

  let successCount = 0
  let errorCount = 0

  // 3. Process individually with delay to respect GHL rate limits
  for (const shop of shops) {
    try {
      const customFieldsArray = []
      
      if (shop.customizer_url) {
        customFieldsArray.push({
          id: customizerField.id,
          key: customizerField.fieldKey,
          field_value: shop.customizer_url
        })
      }
      
      if (shop.shop_profile_page_url) {
        customFieldsArray.push({
          id: profileField.id,
          key: profileField.fieldKey,
          field_value: shop.shop_profile_page_url
        })
      }
      
      if (customFieldsArray.length === 0) {
        continue // Nothing to sync for this shop
      }

      const res = await fetch(`https://services.leadconnectorhq.com/contacts/${shop.contact_id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${GHL_API_KEY}`,
          "Version": "2021-07-28",
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          customFields: customFieldsArray
        })
      })

      if (!res.ok) {
        const errorData = await res.text()
        console.error(`❌ GHL Error for ${shop.shop_name} (${shop.contact_id}):`, errorData)
        errorCount++
      } else {
        console.log(`✅ Synced URLs to GHL for ${shop.shop_name}`)
        successCount++
      }
    } catch (err: any) {
      console.error(`❌ Catch Error for ${shop.shop_name}:`, err.message)
      errorCount++
    }
    
    // GHL rate limit is typically 100 requests per 10 seconds.
    // 150ms delay = max ~6-7 requests per second, very safe.
    await new Promise(resolve => setTimeout(resolve, 150))
  }

  console.log("\n================================================")
  console.log("🏁 GHL URL SYNC COMPLETE")
  console.log(`✅ Successfully Synced: ${successCount}`)
  console.log(`❌ Failed Syncs: ${errorCount}`)
  console.log("================================================")
}

run()
