import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts"

await config({ path: ".env.local", export: true })

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || ""
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const supabase = createClient(supabaseUrl, supabaseKey)

const { data, error } = await supabase
  .from("agent_barber_school_leads")
  .select("last_conversation_history")
  .eq("email", "lamont703@gmail.com")

if (error) {
  console.error("Error:", error)
} else {
  console.log("Database history:\n", data?.[0]?.last_conversation_history)
}
