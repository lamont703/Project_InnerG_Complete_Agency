import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

// Load env vars
dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  let hasMore = true
  let totalUpdated = 0

  while (hasMore) {
    console.log("Fetching batch of shops with missing URLs...")
    
    // Supabase defaults to 1000 limit, so we loop until all nulls are gone
    const { data: shops, error: fetchError } = await supabase
      .from("agent_barbershop_leads")
      .select("id, shop_name")
      .is("customizer_url", null)
      .limit(1000)

    if (fetchError) {
      console.error("Error fetching shops:", fetchError)
      process.exit(1)
    }

    if (!shops || shops.length === 0) {
      console.log("No more shops found missing a URL.")
      hasMore = false
      break
    }

  console.log(`Found ${shops.length} shops. Generating and updating customizer URLs in batches...`)

  let successCount = 0
  let errorCount = 0

  // Process in chunks of 50 to avoid rate limits and memory issues while remaining fast
  const chunkSize = 50
  for (let i = 0; i < shops.length; i += chunkSize) {
    const chunk = shops.slice(i, i + chunkSize)
    
    await Promise.all(
      chunk.map(async (shop) => {
        const customizerUrl = `https://agency.innergcomplete.com/tools/shop-site-template/shop-website-customizer/${shop.id}/customizer`
        
        const { error: updateError } = await supabase
          .from("agent_barbershop_leads")
          .update({ customizer_url: customizerUrl })
          .eq("id", shop.id)

        if (updateError) {
          console.error(`Failed to update shop ${shop.id} (${shop.shop_name}):`, updateError)
          errorCount++
        } else {
          successCount++
        }
      })
    )

    console.log(`Processed ${Math.min(i + chunkSize, shops.length)} / ${shops.length} shops...`)
  }

    console.log("-----------------------------------------")
    console.log(`Batch finished. Total updated so far: ${totalUpdated += successCount}`)
  }

  console.log("-----------------------------------------")
  console.log(`All done! Successfully generated URLs for ${totalUpdated} total shops.`)
}

run()
