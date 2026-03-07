import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function checkUser() {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const userId = "559d8265-4cda-4721-afd9-cf3fc83b2bbc"

    console.log(`Checking user ${userId} in ${supabaseUrl}...`)

    const { data, error } = await supabase
        .from("users")
        .select("id, email, role")
        .eq("id", userId)
        .single()

    if (error) {
        console.error("Error fetching user:", error.message)
    } else {
        console.log("User found:", data)
    }
}

checkUser()
