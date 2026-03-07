import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function checkInfrastructure() {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    console.log(`\n--- Infrastructure Audit ---\n`)

    // 1. Clients
    const { data: clients, error: clientsErr } = await supabase.from("clients").select("id, name")
    console.log("Clients in DB:", clients || "None (or RLS blocked)")
    if (clientsErr) console.error("Clients Err:", clientsErr.message)

    // 2. Projects
    const { data: projects, error: projectsErr } = await supabase.from("projects").select("id, name, client_id, status, slug")
    console.log("Projects in DB:", projects || "None (or RLS blocked)")
    if (projectsErr) console.error("Projects Err:", projectsErr.message)

    // 3. Project User Access
    const { data: access, error: accessErr } = await supabase.from("project_user_access").select("project_id, user_id")
    console.log("Access Records in DB:", access || "None (or RLS blocked)")
    if (accessErr) console.error("Access Err:", accessErr.message)
}

checkInfrastructure()
