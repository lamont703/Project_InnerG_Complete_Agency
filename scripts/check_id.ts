import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts";

await config({ path: ".env.local", export: true });

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from("agent_barbershop_leads")
    .select("*")
    .eq("id", "72104ba4-d64e-47a3-aa87-2ece0cd8ea75")
    .single();

  console.log("Data:", data);
  console.log("Error:", error);
}

await check();
