const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Mirrors lib/slug.ts — scripts run as plain CommonJS and can't import from lib/.
function slugify(input) {
  return (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function shortIdSuffix(id, length = 8) {
  return id.replace(/-/g, '').slice(0, length);
}

function buildSlug(name, city, id, suffixLength = 8) {
  return `${slugify(name || 'entity')}-${slugify(city || 'tx')}-${shortIdSuffix(id, suffixLength)}`;
}

async function slugExistsInTable(table, slug) {
  const { data } = await supabase.from(table).select('id').eq('slug', slug).limit(1);
  return !!(data && data.length > 0);
}

async function backfillTable(table, nameField, cityField, { checkAgainstTable } = {}) {
  console.log(`\n=== ${table} ===`);
  let processed = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: rows, error } = await supabase
      .from(table)
      .select(`id, ${nameField}, ${cityField}`)
      .is('slug', null)
      .limit(100);

    if (error) {
      console.error(`Error fetching ${table}:`, error.message);
      break;
    }
    if (!rows || rows.length === 0) {
      hasMore = false;
      break;
    }

    for (const row of rows) {
      let suffixLength = 8;
      let slug = buildSlug(row[nameField], row[cityField], row.id, suffixLength);

      if (checkAgainstTable) {
        const collides = await slugExistsInTable(checkAgainstTable, slug);
        if (collides) {
          suffixLength = 16;
          slug = buildSlug(row[nameField], row[cityField], row.id, suffixLength);
        }
      }

      const { error: updateError } = await supabase.from(table).update({ slug }).eq('id', row.id);
      if (updateError) {
        console.error(`  Failed to set slug for ${row.id}:`, updateError.message);
      } else {
        processed++;
      }
    }

    console.log(`  Processed ${processed} rows so far...`);
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`${table} done: ${processed} rows slugged.`);
}

async function main() {
  await backfillTable('agent_barber_school_leads', 'school_name', 'city');
  await backfillTable('agent_cosmetology_school_leads', 'school_name', 'city', {
    checkAgainstTable: 'agent_barber_school_leads',
  });
  await backfillTable('agent_barber_leads', 'name', 'metro_area');
  await backfillTable('agent_barbershop_leads', 'shop_name', 'city');
  await backfillTable('agent_barber_supply_store_leads', 'name', 'city');
  await backfillTable('agent_beauty_supply_store_leads', 'name', 'city', {
    checkAgainstTable: 'agent_barber_supply_store_leads',
  });
  await backfillTable('agent_salon_leads', 'shop_name', 'city');
  await backfillTable('agent_cosmetologist_leads', 'name', 'metro_area');
  await backfillTable('events', 'title', 'city');

  console.log('\nAll tables backfilled.');
}

main();
