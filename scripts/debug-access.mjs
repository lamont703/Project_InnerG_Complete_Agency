import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function debugAccess() {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const email = "lamont703@gmail.com"

    console.log(`\n--- Debugging Access for: ${email} ---\n`)

    // 1. Get User Profile
    const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, email, role")
        .eq("email", email)
        .single()

    if (userError) {
        console.error("User not found in public.users table:", userError.message)
        return
    }
    console.log("User Profile:", user)

    // 2. Check project_user_access
    const { data: access, error: accessError } = await supabase
        .from("project_user_access")
        .select("project_id")
        .eq("user_id", user.id)

    if (accessError) {
        console.error("Error fetching access records:", accessError.message)
    } else {
        console.log(`Access Records Count: ${access?.length || 0}`)
        console.log("Access Records:", access)
    }

    // 3. Check Projects they SHOULD see (regardless of status for debug)
    const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("id, name, status, client_id")

    if (projectsError) {
        console.error("Error fetching projects:", projectsError.message)
    } else {
        const myProjects = projects?.filter(p => access?.some(a => a.project_id === p.id))
        console.log("Projects User has access to in DB:", myProjects)
    }
}

debugAccess()
