import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts"
await config({ path: ".env.local", export: true })
const supabase = createClient(Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
const { error } = await supabase.from("agent_barber_school_leads").update({ latitude: 0, longitude: 0 }).eq("idx", 0)
console.log(error)
