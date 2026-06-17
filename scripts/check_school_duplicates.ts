import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts";

await config({ path: ".env.local", export: true });

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
  const { data: schools, error } = await supabase
    .from("agent_barber_school_leads")
    .select("id, school_name, formatted_address, city")
    .not("formatted_address", "is", null);

  if (error) {
    console.error("Error fetching schools:", error);
    return;
  }

  const addressGroups: Record<string, typeof schools> = {};

  for (const school of schools) {
    const addr = school.formatted_address.trim().toLowerCase();
    if (!addressGroups[addr]) {
      addressGroups[addr] = [];
    }
    addressGroups[addr].push(school);
  }

  const duplicates = Object.entries(addressGroups).filter(([addr, list]) => list.length > 1);

  if (duplicates.length === 0) {
    console.log("No duplicates found based on formatted_address.");
  } else {
    console.log(`Found ${duplicates.length} duplicate addresses!`);
    for (const [addr, list] of duplicates) {
      console.log(`\n📍 Address: ${list[0].formatted_address}`);
      list.forEach((school, index) => {
        console.log(`   ${index + 1}. ${school.school_name} (ID: ${school.id})`);
      });
    }
  }
}

checkDuplicates();
