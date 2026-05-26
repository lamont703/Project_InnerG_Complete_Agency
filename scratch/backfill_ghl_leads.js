const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function backfillExistingLeads() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const webhookUrl = 'https://services.leadconnectorhq.com/hooks/QLyYYRoOhCg65lKW9HDX/webhook-trigger/f5baeadc-38a5-411a-80dc-079b86ca44c3';

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERROR: Supabase credentials not found in .env.local.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('==================================================================');
  console.log('🚀 INNER G COMPLETE AGENCY — RETROACTIVE GHL BACKFILL PROCESSOR');
  console.log('==================================================================\n');

  // Step 1: Query all records that currently meet the criteria
  console.log('📡 Querying database for barbershops that are hiring or have chairs available...');
  const { data: matchingLeads, error } = await supabase
    .from('agent_barbershop_leads')
    .select('*')
    .or('hiring_need.eq.true,booth_count_available.gte.1')
    .not('contact_id', 'is', null);

  if (error) {
    console.error('❌ Database query failed:', error.message);
    process.exit(1);
  }

  if (!matchingLeads || matchingLeads.length === 0) {
    console.log('✅ No existing records meet the criteria. Nothing to backfill!');
    process.exit(0);
  }

  console.log(`✅ Identified ${matchingLeads.length} existing shops that meet the GHL trigger criteria.`);

  // Step 2: Loop and send each record to GHL Custom Webhook with throttling
  let successCount = 0;
  let failCount = 0;

  console.log('\n⚡ Dispatching retroactive webhook payloads to GoHighLevel...');

  for (const shop of matchingLeads) {
    console.log(`   👉 Sending payload for: ${shop.shop_name} (Chairs: ${shop.booth_count_available}, Hiring: ${shop.hiring_need})`);

    const payload = {
      contact_id: shop.contact_id,
      new_record: shop
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        successCount++;
      } else {
        console.error(`      ⚠️ GHL Webhook returned status ${response.status} for ${shop.shop_name}`);
        failCount++;
      }
    } catch (err) {
      console.error(`      ❌ Network error for ${shop.shop_name}:`, err.message);
      failCount++;
    }

    // Gentle throttling to ensure GHL isn't overloaded
    await sleep(200);
  }

  console.log('\n==================================================');
  console.log('🏁 RETROACTIVE BACKFILL PROCESS COMPLETE');
  console.log(`✅ Successfully Synced with GHL:  ${successCount}`);
  console.log(`❌ Failed Syncs:                  ${failCount}`);
  console.log('==================================================\n');
}

backfillExistingLeads();
