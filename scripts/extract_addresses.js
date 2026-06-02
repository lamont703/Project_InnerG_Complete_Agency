const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use service role key if available for updates, otherwise anon key (if RLS allows)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function extractAddresses() {
  console.log("🚀 Starting data migration: Extracting Addresses from google_place_details...");
  
  // 1. Clean the formatted_address column for all schools
  console.log("🧹 Step 1: Cleaning existing formatted_address column...");
  const { error: clearError } = await supabase
    .from("agent_barber_school_leads")
    .update({ formatted_address: null })
    .neq("id", "00000000-0000-0000-0000-000000000000"); // Dummy condition to update all rows (since empty filters block bulk updates)

  if (clearError) {
    console.error("❌ Error clearing formatted_address:", clearError);
    return;
  }
  
  console.log("✅ formatted_address column cleaned.");

  // 2. Fetch schools with google_place_details
  const { data: schools, error } = await supabase
    .from("agent_barber_school_leads")
    .select("id, google_place_details")
    .not("google_place_details", "is", null);

  if (error) {
    console.error("❌ Error fetching schools:", error);
    return;
  }

  console.log(`\n🔍 Step 2: Found ${schools.length} schools with Google Place Details. Extracting addresses...`);

  let successCount = 0;
  
  for (const school of schools) {
    if (school.google_place_details) {
      // Look for "Address: <anything up to a pipe or end of string>"
      const match = school.google_place_details.match(/Address:\s*([^|]+)/i);
      
      if (match && match[1]) {
        const extractedAddress = match[1].trim();
        
        const { error: updateError } = await supabase
          .from("agent_barber_school_leads")
          .update({ formatted_address: extractedAddress })
          .eq("id", school.id);
          
        if (updateError) {
          console.error(`❌ Error updating school ${school.id}:`, updateError);
        } else {
          successCount++;
          process.stdout.write("."); // loading indicator
        }
      }
    }
  }
  
  console.log(`\n✅ Extraction Complete! Successfully extracted addresses for ${successCount} schools.`);
}

extractAddresses();
