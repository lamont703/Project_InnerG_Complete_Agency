/**
 * Imports active Texas cosmetology school licenses (TDLR dataset, cached in
 * public/Texas_API_All_Schools.json) into agent_cosmetology_school_leads.
 *
 * Usage:
 *   node import_cosmetology_schools.js            (insert)
 *   node import_cosmetology_schools.js --dry-run  (parse + log only, no writes)
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY_RUN = process.argv.includes('--dry-run');
const TODAY = new Date();

function titleCase(str) {
  if (!str) return str;
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    // Keep common acronyms/roman numerals capitalized
    .replace(/\bLlc\b/g, 'LLC')
    .replace(/\bIi\b/g, 'II')
    .replace(/\bIii\b/g, 'III');
}

function formatPhone(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 10) return raw;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function parseExpiration(mmddccyy) {
  if (!mmddccyy) return null;
  const [m, d, y] = mmddccyy.split('/').map(Number);
  if (!m || !d || !y) return null;
  return new Date(y, m - 1, d);
}

function toISODate(dateObj) {
  if (!dateObj) return null;
  return dateObj.toISOString().slice(0, 10);
}

function parseCityStateZip(str) {
  // e.g. "AUSTIN TX 78756-2002"
  if (!str) return { city: null, zip: null };
  const match = str.match(/^(.*)\s+([A-Z]{2})\s+(\d{5})(-\d{4})?$/);
  if (!match) return { city: titleCase(str), zip: null };
  return { city: titleCase(match[1].trim()), zip: match[3] };
}

async function run() {
  const raw = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'public', 'Texas_API_All_Schools.json'), 'utf-8')
  );

  const cosmetology = raw.filter((r) => r.license_type !== 'Barber School');

  const active = cosmetology.filter((r) => {
    const exp = parseExpiration(r.license_expiration_date_mmddccyy);
    return exp && exp >= TODAY;
  });

  // Dedupe on business_name + address (a handful of exact duplicate rows exist in the source).
  const seen = new Set();
  const deduped = [];
  for (const r of active) {
    const key = `${(r.business_name || '').toLowerCase().trim()}|${(r.business_address_line1 || '').toLowerCase().trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
  }

  console.log(`Source records: ${raw.length}`);
  console.log(`Cosmetology-type: ${cosmetology.length}`);
  console.log(`Active (unexpired): ${active.length}`);
  console.log(`After dedupe: ${deduped.length}`);

  const rows = deduped.map((r) => {
    const { city } = parseCityStateZip(r.business_city_state_zip);
    return {
      school_name: titleCase(r.business_name),
      license_type: r.license_type,
      license_subtype: r.license_subtype,
      license_number: r.license_number,
      license_expiration_date: toISODate(parseExpiration(r.license_expiration_date_mmddccyy)),
      county: r.business_county ? titleCase(r.business_county) : null,
      city,
      phone: formatPhone(r.business_telephone),
      // formatted_address here is just a search hint for the Google Places enrichment pass;
      // the TDLR source's own lat/lng are unreliable (e.g. some TX cities resolve to
      // same-named cities in other states), so leave coordinates for Google to fill in.
      formatted_address: [titleCase(r.business_address_line1), r.business_city_state_zip]
        .filter(Boolean)
        .join(', '),
      latitude: null,
      longitude: null,
      accreditation_status: 'State Licensed',
    };
  });

  if (DRY_RUN) {
    console.log('\n[dry-run] Sample rows:');
    console.log(JSON.stringify(rows.slice(0, 5), null, 2));
    console.log(`\n[dry-run] Would insert ${rows.length} rows. No writes performed.`);
    return;
  }

  console.log(`\nInserting ${rows.length} rows...`);
  const BATCH_SIZE = 100;
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error, count } = await supabase
      .from('agent_cosmetology_school_leads')
      .upsert(batch, { onConflict: 'license_number', count: 'exact' });

    if (error) {
      console.error(`Batch ${i}-${i + batch.length} failed:`, error.message);
      failed += batch.length;
    } else {
      inserted += batch.length;
      console.log(`Inserted batch ${i + 1}-${i + batch.length}`);
    }
  }

  console.log(`\nDone. Inserted/updated: ${inserted}, Failed: ${failed}`);
}

run();
