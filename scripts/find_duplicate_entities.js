require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES_TO_CHECK = [
  { table: 'agent_barbershop_leads', nameField: 'shop_name', imagesField: 'google_images' },
  { table: 'agent_salon_leads', nameField: 'shop_name', imagesField: 'google_images' },
  { table: 'agent_barber_school_leads', nameField: 'school_name', imagesField: 'google_photos' },
  { table: 'agent_cosmetology_school_leads', nameField: 'school_name', imagesField: 'google_photos' },
  { table: 'agent_barber_supply_store_leads', nameField: 'name', imagesField: 'google_images' },
  { table: 'agent_beauty_supply_store_leads', nameField: 'name', imagesField: 'google_images' }
];

// Helper to calculate a "completeness" score for an entity.
function calculateCompleteness(row, imagesField) {
  let score = 0;
  if (row.formatted_address) score += 2;
  if (row.city) score += 1;
  if (row.rating) score += 1;
  if (row.latitude && row.longitude) score += 2;
  
  const images = row[imagesField];
  if (Array.isArray(images) && images.length > 0) {
    score += images.length; // More images = better data
  }
  
  return score;
}

async function findDuplicates() {
  console.log("🔍 Scanning entity tables for duplicate phone numbers...\n");

  let totalDuplicatesFound = 0;

  for (const config of TABLES_TO_CHECK) {
    const { table, nameField, imagesField } = config;

    // Fetch all rows with a phone number
    const { data: rows, error } = await supabase
      .from(table)
      .select(`id, phone, created_at, ${nameField}, formatted_address, city, rating, latitude, longitude, ${imagesField}`)
      .not('phone', 'is', null);

    if (error) {
      console.error(`Error fetching from ${table}:`, error.message);
      continue;
    }

    // Group by phone number
    const phoneGroups = {};
    for (const row of rows) {
      // Normalize phone number slightly (e.g. strip non-digits) just to be safe, 
      // but if the data is strictly formatted, exact match is fine.
      const normalizedPhone = row.phone.replace(/\\D/g, ''); 
      if (!phoneGroups[normalizedPhone]) {
        phoneGroups[normalizedPhone] = [];
      }
      phoneGroups[normalizedPhone].push(row);
    }

    // Filter to only groups with duplicates
    const duplicateGroups = Object.entries(phoneGroups).filter(([phone, group]) => group.length > 1);

    if (duplicateGroups.length > 0) {
      console.log(`\n======================================================`);
      console.log(`📋 TABLE: ${table}`);
      console.log(`======================================================`);

      for (const [phone, group] of duplicateGroups) {
        totalDuplicatesFound += (group.length - 1);
        
        console.log(`\n📞 Phone Duplicate Group: ${group[0].phone} (${group.length} records found)`);

        // Sort the group by completeness (descending), then by created_at (ascending - older is better)
        const sortedGroup = group.map(row => ({
          ...row,
          completenessScore: calculateCompleteness(row, imagesField)
        })).sort((a, b) => {
          if (b.completenessScore !== a.completenessScore) {
            return b.completenessScore - a.completenessScore; // Highest score first
          }
          // If scores are equal, prefer the older one
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateA - dateB; 
        });

        const keeper = sortedGroup[0];
        const toDelete = sortedGroup.slice(1);

        console.log(`  ✅ RECOMMEND KEEPING:`);
        console.log(`     ID: ${keeper.id}`);
        console.log(`     Name: ${keeper[nameField]}`);
        console.log(`     Created: ${new Date(keeper.created_at).toLocaleDateString()}`);
        console.log(`     Completeness Score: ${keeper.completenessScore}`);

        console.log(`\n  🗑️  RECOMMEND DELETING:`);
        for (const del of toDelete) {
          console.log(`     - ID: ${del.id} | Name: ${del[nameField]} | Score: ${del.completenessScore} | Created: ${new Date(del.created_at).toLocaleDateString()}`);
        }
      }
    }
  }

  console.log(`\n\n🎉 Scan complete. Found ${totalDuplicatesFound} total duplicate records that should be removed.`);
  console.log(`Note: No data was deleted. This is a read-only recommendation script.`);
}

findDuplicates().catch(console.error);
