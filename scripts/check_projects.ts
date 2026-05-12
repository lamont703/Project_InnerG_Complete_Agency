import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const supabase = createClient(supabaseUrl, supabaseKey)

const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, slug")

if (error) {
    console.error("Error fetching projects:", error)
    Deno.exit(1)
}

console.log("Projects in DB:")
projects.forEach(p => console.log(`- ${p.name} (slug: ${p.slug}, id: ${p.id})`))
