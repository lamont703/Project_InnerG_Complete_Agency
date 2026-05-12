
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import "https://deno.land/x/dotenv@v3.2.2/load.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

if (!supabaseUrl || !supabaseKey) {
    console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in environment.")
    Deno.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log("Checking LinkedIn connections...")

const { data, error } = await supabase
    .from("client_db_connections")
    .select("id, project_id, connector_types!inner(provider)")
    .eq("connector_types.provider", "linkedin")

if (error) {
    console.error("Error fetching connections:", error)
    Deno.exit(1)
}

console.log(JSON.stringify(data, null, 2))
