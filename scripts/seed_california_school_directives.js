/**
 * Turns California schools that have real BBC pass-rate data (in
 * school_exam_stats) but no entity yet into STAGED agent_directives — the same
 * two-tier path the discovery agent uses (staged → human approves → live
 * entity), NOT bare rows dumped into the live school tables.
 *
 * Dedupes against BOTH live school entities AND existing agent_directives
 * (any status — a denied one means a human already said "no"), so nothing is
 * duplicated. Reports a 4-way breakdown: already a live entity / already a
 * pending directive / already approved-or-denied / genuinely new (seeded).
 *
 * Dry run by default (reports + writes a CSV, NO writes). Pass --commit to
 * insert the genuinely-new schools as pending directives.
 *
 *   node scripts/seed_california_school_directives.js            # PREVIEW
 *   node scripts/seed_california_school_directives.js --commit   # stage new directives
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const COMMIT = process.argv.includes('--commit');
const OUT_DIR = path.join(__dirname, '..', 'scratchpad_reports');

const AGENT_NAME = 'Website Business Discovery Agent';
const MISSION = 'Find real businesses missing from our database and stage them for review before anything goes live.';

// Same normalization the discovery agent uses to build subject_key (so dedup
// against existing directives is exact).
const normCmp = (name) => (name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function fetchAll(table, cols, f) {
  let out = [];
  let from = 0;
  while (true) {
    let q = supabase.from(table).select(cols).range(from, from + 999);
    if (f) q = f(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    out = out.concat(data);
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return out;
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Existing discovery directives (any status) -> subject_key + status.
  const dirs = await fetchAll('agent_directives', 'subject_key, status', (q) => q.eq('agent_name', AGENT_NAME));
  const dirStatusByKey = new Map(dirs.map((d) => [d.subject_key, d.status]));

  // Unmatched CA pass-rate rows (no entity yet), grouped to a distinct school.
  const stats = await fetchAll('school_exam_stats', 'source_school_name, source_city, license_type, test_takers, pass_count, pass_rate', (q) => q.eq('state', 'CA').is('school_id', null));
  const schools = new Map(); // `${name}::${city}` -> { name, city, licenses:{lt:{takers,pass}} }
  for (const r of stats) {
    const key = `${r.source_school_name}::${r.source_city}`;
    if (!schools.has(key)) schools.set(key, { name: r.source_school_name, city: r.source_city, licenses: {} });
    const s = schools.get(key);
    const l = (s.licenses[r.license_type] = s.licenses[r.license_type] || { takers: 0, pass: 0 });
    l.takers += r.test_takers; l.pass += r.pass_count;
  }

  const buckets = { pending_directive: [], approved_or_denied_directive: [], seed: [] };

  for (const s of schools.values()) {
    // Target school table: barber if it's a barber-only school, else the
    // cosmetology table (cosmetology schools also run esthetics/manicuring).
    const lts = Object.keys(s.licenses);
    const barberOnly = lts.length > 0 && lts.every((l) => l === 'barber');
    const table = barberOnly ? 'agent_barber_school_leads' : 'agent_cosmetology_school_leads';

    // Check BOTH possible tables' subject_keys against existing directives.
    const keyBarber = `new_business::agent_barber_school_leads::${normCmp(s.name)}::${s.city.toLowerCase()}`;
    const keyCosmet = `new_business::agent_cosmetology_school_leads::${normCmp(s.name)}::${s.city.toLowerCase()}`;
    const existingStatus = dirStatusByKey.get(keyBarber) || dirStatusByKey.get(keyCosmet);

    if (existingStatus === 'pending') { buckets.pending_directive.push(s); continue; }
    if (existingStatus === 'approved' || existingStatus === 'denied') { buckets.approved_or_denied_directive.push(s); continue; }

    // Genuinely new -> prepare a staged directive.
    const passSummary = Object.entries(s.licenses)
      .map(([lt, v]) => `${lt} ${Math.round((v.pass / v.takers) * 100)}% (${v.takers})`).join(', ');
    s._subjectKey = table === 'agent_barber_school_leads' ? keyBarber : keyCosmet;
    s._table = table;
    s._directiveText = `Publish new California ${barberOnly ? 'barber' : 'cosmetology'} school "${s.name}" in ${s.city}, CA — has real 2026 CA BBC first-time written pass-rate data (${passSummary}).`;
    s._evidence = {
      name: s.name,
      city: s.city,
      type: 'new_business_candidate',
      table,
      source: 'ca_bbc_pass_rates',
      period: 'Q1 2026',
      state: 'CA',
      formatted_address: null,
      latitude: null,
      longitude: null,
      ca_exam_pass_rates: Object.entries(s.licenses).map(([lt, v]) => ({
        license_type: lt, pass_count: v.pass, test_takers: v.takers,
        pass_rate: Math.round((v.pass / v.takers) * 10000) / 10000,
      })),
      needsEnrichment: true, // no Google data yet — pass rates are the signal
    };
    buckets.seed.push(s);
  }

  console.log('=== California pass-rate schools with no entity yet ===');
  console.log(`  distinct schools: ${schools.size}`);
  console.log(`  already a PENDING directive (approve these to get real Google-enriched entities): ${buckets.pending_directive.length}`);
  console.log(`  already approved/denied directive (skip — live or human-rejected): ${buckets.approved_or_denied_directive.length}`);
  console.log(`  GENUINELY NEW (would be staged as new pending directives): ${buckets.seed.length}`);

  console.log('\n  sample of genuinely-new schools to seed:');
  buckets.seed.slice(0, 12).forEach((s) => console.log(`    ${s.name} (${s.city}) [${s._table === 'agent_barber_school_leads' ? 'barber' : 'cosmetology'}] — ${Object.entries(s.licenses).map(([lt, v]) => `${lt} ${v.pass}/${v.takers}`).join(', ')}`));

  const csv = ['bucket,name,city,target_table,licenses',
    ...['pending_directive', 'approved_or_denied_directive', 'seed'].flatMap((b) =>
      buckets[b].map((s) => `"${b}","${s.name.replace(/"/g, '""')}","${s.city}","${s._table || ''}","${Object.entries(s.licenses).map(([lt, v]) => `${lt}:${v.pass}/${v.takers}`).join('; ')}"`))].join('\n');
  const csvPath = path.join(OUT_DIR, 'ca_school_seed_reconciliation.csv');
  fs.writeFileSync(csvPath, csv);
  console.log(`\n  Full reconciliation: ${csvPath}`);

  if (!COMMIT) {
    console.log('\nPREVIEW ONLY — nothing written. Recommended: approve the pending directives first (they carry Google data), then --commit to stage the genuinely-new ones.');
    return;
  }

  console.log(`\n--commit — staging ${buckets.seed.length} new schools as pending directives...`);
  let staged = 0;
  for (const s of buckets.seed) {
    const { error } = await supabase.from('agent_directives').insert({
      agent_name: AGENT_NAME, mission: MISSION, subject_key: s._subjectKey,
      directive_text: s._directiveText, evidence: s._evidence, status: 'pending',
    });
    if (error) { console.error(`\n  insert "${s.name}" failed: ${error.message}`); continue; }
    staged++;
    if (staged % 50 === 0) process.stdout.write(`\r  staged ${staged}/${buckets.seed.length}`);
  }
  console.log(`\nDONE. Staged ${staged} new California school directives (pending review at /admin/agent-directives).`);
}

run().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
