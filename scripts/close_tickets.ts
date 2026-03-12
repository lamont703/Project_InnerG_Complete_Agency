import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const supabase = createClient(supabaseUrl, supabaseKey)

const ticketIds = [
    "0f390d49-cef0-46bb-bdb9-25f3cc6d33ed",
    "2b805868-d808-43ed-b435-131e6eff9d36",
    "77bcb521-0bd0-44d7-aed8-184b09878b5d"
]

console.log(`Attempting to close ${ticketIds.length} tickets...`)

const { data, error } = await supabase
    .from("software_tickets")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .in("id", ticketIds)
    .select()

if (error) {
    console.error("Error updating tickets:", error)
    Deno.exit(1)
}

console.log("Successfully updated tickets:", data)
