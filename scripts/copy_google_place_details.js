const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use service role key if available for updates, otherwise anon key (if RLS allows)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function copyDetails() {
  console.log("🚀 Starting data migration: Copying last_conversation_history to google_place_details...");
  
  // 1. Fetch all schools
  const { data: schools, error } = await supabase
    .from("agent_barber_school_leads")
    .select("id, last_conversation_history");

  if (error) {
    console.error("❌ Error fetching schools:", error);
    return;
  }

  console.log(`Found ${schools.length} total schools. Identifying ones with Google Place Details...`);

  let successCount = 0;
  
  // 2. Loop through and update if they contain Google Place Details
  for (const school of schools) {
    if (school.last_conversation_history && school.last_conversation_history.includes("Google Place Details:")) {
      
      const { error: updateError } = await supabase
        .from("agent_barber_school_leads")
        .update({ google_place_details: school.last_conversation_history })
        .eq("id", school.id);
        
      if (updateError) {
        console.error(`❌ Error updating school ${school.id}:`, updateError);
      } else {
        successCount++;
        process.stdout.write("."); // loading indicator
      }
    }
  }
  
  console.log(`\n✅ Migration Complete! Successfully copied data for ${successCount} schools.`);
}

copyDetails();
