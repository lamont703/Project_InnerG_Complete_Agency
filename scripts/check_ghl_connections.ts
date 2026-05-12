import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const supabase = createClient(supabaseUrl, supabaseKey)

const { data: connections, error } = await supabase
    .from("client_db_connections")
    .select(`
        *,
        connector_types(provider)
    `)

if (error) {
    console.error("Error fetching connections:", error)
    Deno.exit(1)
}

const ghlConnections = connections.filter(c => c.connector_types?.provider === "ghl")
console.log(`Found ${ghlConnections.length} GHL connections`)

for (const conn of ghlConnections) {
    console.log(`Connection ID: ${conn.id}`)
    console.log(`Sync Config Keys: ${Object.keys(conn.sync_config || {})}`)
    if (conn.sync_config?.api_key) {
        console.log(`API Key starts with: ${conn.sync_config.api_key.substring(0, 10)}`)
    }
}
