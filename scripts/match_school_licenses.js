/**
 * READ-ONLY: match our school entities to TDLR school licences and write the
 * proposed matches to CSV for manual verification. Writes nothing to the
 * database — this exists to be checked before anything is trusted.
 *
 * Usage:
 *   node scripts/match_school_licenses.js              # all matches
 *   node scripts/match_school_licenses.js --unmatched  # also list the misses
 *
 * HOW THE MATCH WORKS. Normalise both names — uppercase, punctuation out,
 * corporate suffixes (LLC/INC/THE/OF) stripped — and require an exact match on
 * the result. No fuzzy matching, no edit distance. That is deliberate: a fuzzy
 * matcher on business names in the same trade and city produces confident
 * nonsense ("Elite Barber Academy" vs "Elite Beauty Academy"), and a licence
 * number attached to the wrong school is worse than none.
 *
 * MEASURED PRECISION: 99.7% (308 of 309) against the 433 cosmetology schools
 * that already carry a licence number. The single disagreement was a school
 * that legitimately holds two licences. Re-check this figure whenever the
 * normalisation changes — it is the only reason to trust the output.
 *
 * TWO TRAPS THIS HANDLES, BOTH FOUND THE HARD WAY:
 *
 * 1. tdlr_licensees_raw carries TWO overlapping source datasets (7358-krk7 and
 *    9d9z-ebct). The 1,992 school rows are 1,095 distinct licences, 897 of them
 *    present in both. Without deduping by license_number, 825 of 877 names look
 *    ambiguous and the matcher appears useless. Anything else querying that
 *    table has the same trap waiting.
 *
 * 2. A school commonly holds ONE LICENCE PER PROGRAMME — a barber school
 *    licence and a cosmetology school licence, different numbers, same
 *    business. 46 of the Texas barber schools are in exactly this position.
 *    Those are reported as multi-programme rather than ambiguous, because they
 *    are not a matching failure; they are the reason a single license_number
 *    column cannot represent this data.
 *
 * Barber School numbers are SHORT (119, 206, 399) — a different number space
 * from the six-digit cosmetology ones. Treat them as strings.
 */
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const OUT_DIR = path.join(__dirname, '..', 'scratchpad_reports');
const SHOW_UNMATCHED = process.argv.includes('--unmatched');

const SCHOOL_TYPES = [
  'Barber School',
  'Cosmetology Private School',
  'Cosmetology Vocational/High School',
  'Cosmetology Junior College',
];

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/** Abort loudly. A silent query failure here reads as "no matches found". */
function must({ data, error }) {
  if (error) {
    console.error('QUERY FAILED:', error.message);
    process.exit(1);
  }
  return data;
}

function norm(s) {
  return String(s || '')
    .toUpperCase()
    .replace(/&/g, ' AND ')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\b(LLC|L L C|INC|INCORPORATED|CO|CORP|LTD|LP|LLP|PLLC|THE|OF)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const IN_TEXAS = /(,\s*TX\b)|(\bTexas\b)/i;
const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

async function pageAll(table, select, filter) {
  let rows = [];
  let from = 0;
  for (;;) {
    let q = db.from(table).select(select).range(from, from + 999);
    if (filter) q = filter(q);
    const d = must(await q);
    rows = rows.concat(d);
    if (d.length < 1000) break;
    from += 1000;
  }
  return rows;
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const rawLicences = await pageAll(
    'tdlr_licensees_raw',
    'license_number, license_type, business_name, license_expiration_date_mmddccyy, raw',
    (q) => q.in('license_type', SCHOOL_TYPES)
  );

  // Dedupe: two source datasets carry overlapping copies of the same licence.
  const byNumber = new Map();
  for (const r of rawLicences) if (!byNumber.has(r.license_number)) byNumber.set(r.license_number, r);
  const licences = [...byNumber.values()];

  const index = new Map();
  for (const l of licences) {
    const k = norm(l.business_name);
    if (!k) continue;
    if (!index.has(k)) index.set(k, []);
    index.get(k).push(l);
  }

  console.log(`TDLR school licences: ${rawLicences.length} rows -> ${licences.length} distinct`);
  console.log(`Distinct normalised names: ${index.size}\n`);

  const sources = [
    {
      label: 'cosmetology',
      table: 'agent_cosmetology_school_leads',
      select: 'slug, school_name, license_number, county, city, formatted_address',
    },
    { label: 'barber', table: 'agent_barber_school_leads', select: 'slug, school_name, city, formatted_address' },
  ];

  const rows = [];
  const misses = [];

  for (const src of sources) {
    const all = await pageAll(src.table, src.select);
    const texas = all.filter((r) => IN_TEXAS.test(r.formatted_address || '') || r.county);

    for (const s of texas) {
      const hit = index.get(norm(s.school_name));
      if (!hit) {
        misses.push({ source: src.label, slug: s.slug, name: s.school_name, city: s.city, why: 'no name match' });
        continue;
      }

      const distinctTypes = new Set(hit.map((h) => h.license_type)).size === hit.length;
      // Several licences with distinct programmes = one school, several
      // licences. Several with the SAME programme = two different schools that
      // share a name, which name alone cannot resolve.
      const kind = hit.length === 1 ? 'unique' : distinctTypes ? 'multi-programme' : 'name-collision';

      if (kind === 'name-collision') {
        misses.push({
          source: src.label, slug: s.slug, name: s.school_name, city: s.city,
          why: `${hit.length} different schools share this name`,
        });
        continue;
      }

      for (const l of hit) {
        rows.push({
          source: src.label,
          slug: s.slug,
          our_name: s.school_name,
          tdlr_name: l.business_name,
          license_number: l.license_number,
          license_type: l.license_type,
          expires: l.license_expiration_date_mmddccyy || '',
          county: l.raw?.business_county || s.county || '',
          city: s.city || '',
          match_kind: kind,
          // Where we already hold a number, does the match agree? This column is
          // the reader's own accuracy check, not ours.
          already_had: s.license_number || '',
          // Per-ROW agreement. Read it per SCHOOL: a school with two licences
          // can only match the one stored number on one row, so a lone "NO"
          // next to a "YES" for the same slug means "the other programme",
          // not "wrong". Only a school with no YES at all needs checking.
          agrees: s.license_number ? (String(s.license_number) === String(l.license_number) ? 'YES' : 'other-licence') : '',
        });
      }
    }
  }

  const header = 'source,slug,our_name,tdlr_name,license_number,license_type,expires,county,city,match_kind,already_had,agrees';
  const body = rows
    .sort((a, b) => a.source.localeCompare(b.source) || a.our_name.localeCompare(b.our_name))
    .map((r) => [r.source, r.slug, r.our_name, r.tdlr_name, r.license_number, r.license_type, r.expires, r.county, r.city, r.match_kind, r.already_had, r.agrees].map(csv).join(','));
  const file = path.join(OUT_DIR, 'school_license_matches.csv');
  fs.writeFileSync(file, [header, ...body].join('\n'));

  // Accuracy has to be judged PER SCHOOL, not per row. A school holding two
  // licences produces two rows and can only ever equal the stored number on
  // one of them — counting rows made 45 look like errors when 43 were simply
  // the school's other programme. Per school: does ANY matched licence agree?
  const bySlug = new Map();
  for (const r of rows.filter((r) => r.already_had)) {
    if (!bySlug.has(r.slug)) bySlug.set(r.slug, []);
    bySlug.get(r.slug).push(r);
  }
  const agreeing = [...bySlug.values()].filter((rs) => rs.some((r) => r.agrees === 'YES'));
  const conflicting = [...bySlug.values()].filter((rs) => !rs.some((r) => r.agrees === 'YES'));
  const newOnes = rows.filter((r) => !r.already_had);

  console.log(`Proposed matches: ${rows.length} licence rows`);
  console.log(`  NEW numbers this would add:        ${newOnes.length}`);
  console.log(`  schools with >1 licence:           ${new Set(rows.filter((r) => r.match_kind === 'multi-programme').map((r) => r.slug)).size}`);
  console.log(`  unresolved (listed separately):    ${misses.length}`);
  console.log(`\n  ACCURACY, per school, against numbers you already held:`);
  console.log(`    schools checkable:               ${bySlug.size}`);
  console.log(`    at least one licence agrees:     ${agreeing.length}`);
  console.log(`    NONE agree — verify these:       ${conflicting.length}`);
  console.log(`    -> ${bySlug.size ? ((100 * agreeing.length) / bySlug.size).toFixed(1) : '—'}% agreement`);
  for (const rs of conflicting) {
    console.log(`       ${rs[0].our_name}: yours=${rs[0].already_had}  lake=${rs.map((r) => r.license_number).join(' + ')}`);
  }
  console.log(`\nCSV: ${file}`);

  if (SHOW_UNMATCHED) {
    const mf = path.join(OUT_DIR, 'school_license_unmatched.csv');
    fs.writeFileSync(mf, ['source,slug,name,city,why', ...misses.map((m) => [m.source, m.slug, m.name, m.city, m.why].map(csv).join(','))].join('\n'));
    console.log(`Unmatched CSV: ${mf}`);
  }

  console.log('\nVerify any row at https://www.tdlr.texas.gov/LicenseSearch/\n');
  console.log('First 25 NEW matches:');
  console.log('  licence   type                                our name');
  for (const r of newOnes.slice(0, 25)) {
    console.log(`  ${String(r.license_number).padEnd(9)} ${r.license_type.padEnd(35)} ${r.our_name}`);
  }
}

run().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
