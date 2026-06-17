import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts";

await config({ path: ".env.local", export: true });

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: schools, error } = await supabase
    .from("agent_barber_school_leads")
    .select("*")
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
    console.log("No duplicates found.");
    return;
  }

  let totalDeleted = 0;

  for (const [addr, list] of duplicates) {
    console.log(`\n📍 Processing duplicate address: ${list[0].formatted_address}`);

    // Score each record by counting non-null, non-empty fields
    const scoredList = list.map(school => {
      let score = 0;
      for (const [key, value] of Object.entries(school)) {
        if (value !== null && value !== "" && value !== undefined) {
          score++;
        }
      }
      return { ...school, _score: score };
    });

    // Sort descending by score
    scoredList.sort((a, b) => b._score - a._score);

    const winner = scoredList[0];
    const losers = scoredList.slice(1);

    console.log(`   Keeping: ${winner.school_name} (ID: ${winner.id}) with score: ${winner._score}`);
    
    for (const loser of losers) {
      console.log(`   Deleting: ${loser.school_name} (ID: ${loser.id}) with score: ${loser._score}`);
      
      const { error: deleteError } = await supabase
        .from("agent_barber_school_leads")
        .delete()
        .eq("id", loser.id);
        
      if (deleteError) {
        console.error(`   ❌ Failed to delete ${loser.id}: ${deleteError.message}`);
      } else {
        console.log(`   ✅ Successfully deleted ${loser.id}`);
        totalDeleted++;
      }
    }
  }

  console.log(`\n🎉 Cleanup complete! Deleted ${totalDeleted} duplicate records.`);
}

run();
