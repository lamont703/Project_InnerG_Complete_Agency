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

// Require an explicit flag to prevent accidental deletion
const CONFIRM_DELETE = process.argv.includes('--confirm');

function calculateCompleteness(row, imagesField) {
  let score = 0;
  if (row.formatted_address) score += 2;
  if (row.city) score += 1;
  if (row.rating) score += 1;
  if (row.latitude && row.longitude) score += 2;
  
  const images = row[imagesField];
  if (Array.isArray(images) && images.length > 0) {
    score += images.length;
  }
  
  return score;
}

async function runDeletion() {
  console.log("🧹 Initializing Duplicate Entity Cleanup...\n");

  if (!CONFIRM_DELETE) {
    console.log("⚠️  DRY RUN MODE: No data will actually be deleted.");
    console.log("⚠️  Run with 'node scripts/delete_duplicate_entities.js --confirm' to execute the deletion.\n");
  } else {
    console.log("🚨 CONFIRM FLAG DETECTED: Proceeding with live database deletion!\n");
  }

  let totalDeleted = 0;

  for (const config of TABLES_TO_CHECK) {
    const { table, nameField, imagesField } = config;
    let tableDeletedCount = 0;

    const { data: rows, error } = await supabase
      .from(table)
      .select(`id, phone, created_at, ${nameField}, formatted_address, city, rating, latitude, longitude, ${imagesField}`)
      .not('phone', 'is', null);

    if (error) {
      console.error(`Error fetching from ${table}:`, error.message);
      continue;
    }

    const phoneGroups = {};
    for (const row of rows) {
      const normalizedPhone = row.phone.replace(/\\D/g, ''); 
      if (!phoneGroups[normalizedPhone]) {
        phoneGroups[normalizedPhone] = [];
      }
      phoneGroups[normalizedPhone].push(row);
    }

    const duplicateGroups = Object.entries(phoneGroups).filter(([phone, group]) => group.length > 1);

    if (duplicateGroups.length > 0) {
      console.log(`\n======================================================`);
      console.log(`📋 TABLE: ${table}`);
      console.log(`======================================================`);

      const idsToDelete = [];

      for (const [phone, group] of duplicateGroups) {
        const sortedGroup = group.map(row => ({
          ...row,
          completenessScore: calculateCompleteness(row, imagesField)
        })).sort((a, b) => {
          if (b.completenessScore !== a.completenessScore) {
            return b.completenessScore - a.completenessScore;
          }
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateA - dateB; 
        });

        const keeper = sortedGroup[0];
        const toDelete = sortedGroup.slice(1);

        console.log(`\n📞 Phone Group: ${group[0].phone}`);
        console.log(`  ✅ Keeping: ${keeper[nameField]} (Score: ${keeper.completenessScore})`);

        for (const del of toDelete) {
          console.log(`  🗑️  Deleting: ${del[nameField]} (Score: ${del.completenessScore})`);
          idsToDelete.push(del.id);
        }
      }

      if (idsToDelete.length > 0) {
        if (CONFIRM_DELETE) {
          // Supabase allows deleting in batches using .in()
          // We chunk it just in case there are hundreds of duplicates in one table
          const chunkSize = 100;
          for (let i = 0; i < idsToDelete.length; i += chunkSize) {
            const chunk = idsToDelete.slice(i, i + chunkSize);
            const { error: deleteError } = await supabase
              .from(table)
              .delete()
              .in('id', chunk);

            if (deleteError) {
              console.error(`❌ Failed to delete chunk in ${table}:`, deleteError.message);
            } else {
              tableDeletedCount += chunk.length;
            }
          }
          console.log(`\n✅ Successfully deleted ${tableDeletedCount} duplicate records from ${table}.`);
        } else {
          console.log(`\n[DRY RUN] Would have deleted ${idsToDelete.length} records from ${table}.`);
        }
      }
      totalDeleted += CONFIRM_DELETE ? tableDeletedCount : idsToDelete.length;
    }
  }

  console.log(`\n\n🎉 Cleanup complete!`);
  if (CONFIRM_DELETE) {
    console.log(`Successfully hard-deleted ${totalDeleted} duplicate records across all tables.`);
  } else {
    console.log(`[DRY RUN] Identified ${totalDeleted} records for deletion. Run with --confirm to execute.`);
  }
}

runDeletion().catch(console.error);
