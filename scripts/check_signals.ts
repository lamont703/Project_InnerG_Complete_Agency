import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const supabase = createClient(supabaseUrl, supabaseKey)

const { data: signals, error } = await supabase
    .from("ai_signals")
    .select("id, title, project_id, is_resolved")
    .eq("is_resolved", false)

if (error) {
    console.error("Error fetching signals:", error)
    Deno.exit(1)
}

console.log(`Found ${signals.length} unresolved signals in DB:`)
signals.forEach(s => console.log(`- [${s.id}] ${s.title} (Project: ${s.project_id})`))
