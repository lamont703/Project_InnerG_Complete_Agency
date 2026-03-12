
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = "https://senkwhdxgtypcrtoggyf.supabase.co"
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

if (!supabaseKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY not found in environment.")
    Deno.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log("Checking linkedin_pages table...")

const { data, error } = await supabase
    .from("linkedin_pages")
    .select("*, projects(name)")

if (error) {
    console.error("Error fetching linkedin_pages:", error)
    Deno.exit(1)
}

console.log(JSON.stringify(data, null, 2))
