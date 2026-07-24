/**
 * Bulk-approves pending California school directives by calling the REAL
 * publish endpoint (POST /api/agents/directives/update-status with
 * status:"approved"), which runs publishDiscoveredBusiness() — slug
 * generation, dedup, geocoding, per-table insert — exactly like clicking
 * Approve in /admin/agent-directives. It never flips status directly, so a
 * publish failure or duplicate leaves the directive pending (nothing lost).
 *
 * By default it targets only the DISCOVERED CA school directives (the ones
 * with real Google data — clean, rich entities). The thin pass-rate-seeded
 * directives (evidence.source = "ca_bbc_pass_rates", no Google data) are
 * SKIPPED unless --include-seeded, since they need enrichment first and the
 * barber-school table would reject them for a missing place_id anyway.
 *
 * Dry run by default. Needs the app running (default http://localhost:3000).
 *
 *   node scripts/bulk_approve_ca_school_directives.js                 # PREVIEW
 *   node scripts/bulk_approve_ca_school_directives.js --commit        # approve discovered
 *   node scripts/bulk_approve_ca_school_directives.js --commit --include-seeded
 *   BASE_URL=http://localhost:4000 node scripts/bulk_approve_ca_school_directives.js --commit
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const COMMIT = process.argv.includes('--commit');
const INCLUDE_SEEDED = process.argv.includes('--include-seeded');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.join(__dirname, '..', 'scratchpad_reports');
const AGENT_NAME = 'Website Business Discovery Agent';
const SCHOOL_TABLES = new Set(['agent_barber_school_leads', 'agent_cosmetology_school_leads']);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isCA = (ev) => ev && (ev.state === 'CA' || /,\s*CA\b|\bCA\s+\d{5}/i.test(ev.formatted_address || ''));

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

  const dirs = await fetchAll('agent_directives', 'id, evidence, status', (q) => q.eq('agent_name', AGENT_NAME).eq('status', 'pending'));
  const caSchool = dirs.filter((d) => d.evidence && SCHOOL_TABLES.has(d.evidence.table) && isCA(d.evidence));
  const seeded = caSchool.filter((d) => d.evidence.source === 'ca_bbc_pass_rates');
  const discovered = caSchool.filter((d) => d.evidence.source !== 'ca_bbc_pass_rates');

  const target = INCLUDE_SEEDED ? caSchool : discovered;
  const byTable = (arr) => arr.reduce((a, d) => ((a[d.evidence.table] = (a[d.evidence.table] || 0) + 1), a), {});

  console.log('=== Pending California school directives ===');
  console.log(`  discovered (real Google data): ${discovered.length}  ${JSON.stringify(byTable(discovered))}`);
  console.log(`  pass-rate-seeded (thin, needs enrichment): ${seeded.length}  ${JSON.stringify(byTable(seeded))}`);
  console.log(`\n  TARGET this run: ${target.length} directive(s)${INCLUDE_SEEDED ? ' (including seeded)' : ' (discovered only)'}`);
  console.log('  sample:');
  target.slice(0, 8).forEach((d) => console.log(`    ${d.evidence.name} (${d.evidence.city}) -> ${d.evidence.table}`));

  if (!COMMIT) {
    console.log(`\nPREVIEW ONLY — nothing approved. Re-run with --commit (app must be running at ${BASE_URL}).`);
    console.log('Note: seeded/thin barber-school directives will fail publish (missing place_id) — expected; they stay pending for enrichment.');
    return;
  }

  console.log(`\n--commit — approving ${target.length} via ${BASE_URL}/api/agents/directives/update-status ...\n`);
  const results = { published: [], duplicate: [], failed: [] };
  for (let i = 0; i < target.length; i++) {
    const d = target[i];
    try {
      const res = await fetch(`${BASE_URL}/api/agents/directives/update-status`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: d.id, status: 'approved' }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) results.published.push(d);
      else if (res.status === 409) results.duplicate.push({ d, warning: body.duplicateWarning });
      else results.failed.push({ d, error: body.error || `HTTP ${res.status}` });
    } catch (e) {
      results.failed.push({ d, error: e.message });
    }
    process.stdout.write(`\r  ${i + 1}/${target.length}  (published ${results.published.length}, dup ${results.duplicate.length}, failed ${results.failed.length})`);
    await sleep(250); // publish does geocoding etc. — don't hammer
  }

  console.log(`\n\n=== RESULT ===`);
  console.log(`  published (now live entities): ${results.published.length}`);
  console.log(`  duplicate warnings (left pending — review in dashboard): ${results.duplicate.length}`);
  console.log(`  failed (left pending): ${results.failed.length}`);
  if (results.failed.length) {
    console.log('  sample failures:');
    results.failed.slice(0, 8).forEach((f) => console.log(`    ${f.d.evidence.name} (${f.d.evidence.table}) -> ${f.error}`));
  }

  const csv = ['outcome,name,city,table,detail',
    ...results.published.map((d) => `"published","${d.evidence.name.replace(/"/g, '""')}","${d.evidence.city}","${d.evidence.table}",""`),
    ...results.duplicate.map((r) => `"duplicate","${r.d.evidence.name.replace(/"/g, '""')}","${r.d.evidence.city}","${r.d.evidence.table}","${String(r.warning || '').replace(/"/g, '""').slice(0, 120)}"`),
    ...results.failed.map((r) => `"failed","${r.d.evidence.name.replace(/"/g, '""')}","${r.d.evidence.city}","${r.d.evidence.table}","${String(r.error || '').replace(/"/g, '""').slice(0, 120)}"`)].join('\n');
  const csvPath = path.join(OUT_DIR, 'ca_bulk_approve_results.csv');
  fs.writeFileSync(csvPath, csv);
  console.log(`\n  Full results: ${csvPath}`);
  console.log('  Anything not published stayed pending — nothing was lost.');
}

run().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
