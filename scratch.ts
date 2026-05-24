import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts"

await config({ path: ".env.local", export: true })
const supabase = createClient(
  Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
)
const { data } = await supabase.from("agent_barbershop_leads").select("shop_name, conversation_turns, last_conversation_history").eq("shop_name", "Sauccy Fades Dallas Barbershop")
console.log(JSON.stringify(data, null, 2))
