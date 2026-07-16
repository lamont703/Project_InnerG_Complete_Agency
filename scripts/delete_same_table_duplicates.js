require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Import the strict phone normalizer from your existing script
const { normalizePhone } = require('./deduplication_agent');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES_TO_CHECK = [
  { table: 'agent_barbershop_leads', nameField: 'shop_name' },
  { table: 'agent_salon_leads', nameField: 'shop_name' },
  { table: 'agent_barber_school_leads', nameField: 'school_name' },
  { table: 'agent_cosmetology_school_leads', nameField: 'school_name' },
  { table: 'agent_barber_supply_store_leads', nameField: 'name' },
  { table: 'agent_beauty_supply_store_leads', nameField: 'name' }
];

const CONFIRM_DELETE = process.argv.includes('--confirm');

async function runFuzzyDeletion() {
  console.log("🧹 Initializing Same-Table Exact Phone (Fuzzy Address) Cleanup...\n");

  if (!CONFIRM_DELETE) {
    console.log("⚠️  DRY RUN MODE: No data will actually be deleted.");
    console.log("⚠️  Run with 'node scripts/delete_same_table_duplicates.js --confirm' to execute the deletion.\n");
  } else {
    console.log("🚨 CONFIRM FLAG DETECTED: Proceeding with live database deletion!\n");
  }

  let totalDeleted = 0;

  for (const config of TABLES_TO_CHECK) {
    const { table, nameField } = config;
    let tableDeletedCount = 0;

    const { data: rows, error } = await supabase
      .from(table)
      .select(`id, phone, created_at, ${nameField}, formatted_address`)
      .not('phone', 'is', null);

    if (error) {
      console.error(`Error fetching from ${table}:`, error.message);
      continue;
    }

    const phoneGroups = {};
    for (const row of rows) {
      const normalizedPhone = normalizePhone(row.phone);
      // Skip if phone is invalid/null after strict normalization
      if (!normalizedPhone) continue; 

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
        // Sort strictly by created_at ascending (oldest first = keeper)
        const sortedGroup = group.sort((a, b) => {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

        const keeper = sortedGroup[0];
        const toDelete = sortedGroup.slice(1);

        console.log(`\n📞 Phone Group: ${phone}`);
        console.log(`  ✅ Keeping: ${keeper[nameField]} (Created: ${new Date(keeper.created_at).toLocaleDateString()}) - Addr: ${keeper.formatted_address}`);

        for (const del of toDelete) {
          console.log(`  🗑️  Deleting: ${del[nameField]} (Created: ${new Date(del.created_at).toLocaleDateString()}) - Addr: ${del.formatted_address}`);
          idsToDelete.push(del.id);
        }
      }

      if (idsToDelete.length > 0) {
        if (CONFIRM_DELETE) {
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

runFuzzyDeletion().catch(console.error);
