/**
 * Parses the California Board of Barbering & Cosmetology (BBC) published
 * school pass/fail PDFs into public.school_exam_stats, matching each published
 * school to our own CA school entities by name + city where possible (no
 * school code exists in the CA data, unlike Texas's TDLR rosters).
 *
 * CA data is already per-SCHOOL aggregated (Pass / %Pass / Fail / %Fail),
 * written exam, first-time test-takers, quarterly — so there is no per-student
 * roster to parse, no attempt grouping, and no dedup. Far simpler than the
 * Texas pipeline.
 *
 * Dry run by default (parses + matches + writes a coverage report, NO DB
 * writes). Pass --commit to upsert into school_exam_stats.
 *
 *   node scripts/parse_california_pass_rates.js            # PREVIEW + coverage report
 *   node scripts/parse_california_pass_rates.js --commit   # load into school_exam_stats
 */
const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const COMMIT = process.argv.includes('--commit');
const DIR = path.join(__dirname, '..', 'public', 'California Pass Fail Scores');
const OUT_DIR = path.join(__dirname, '..', 'scratchpad_reports');

const SCHOOL_PDF = 'Board of Barbering and Cosmetology School Exam Pass_Fail_Rates_for_Written_for_First_Time_Test_Takers_January_1_2026_through_March_31_2026.pdf';
const APPRENTICE_PDF = 'apprentice_rslts_01_26_03_26.pdf';

// Scope common to this BBC report set. license_type is NOT here — the PDF is
// sectioned by license type (a header line like "Barber" / "Cosmetologist"
// precedes that section's alphabetical school list), so each row is tagged
// with the section it falls under. This is what makes CA as granular as Texas
// (a school offering multiple programs appears once per program).
const SCOPE = {
  state: 'CA', regulator: 'BBC', exam_year: 2026, period_label: 'Q1 2026',
  test_type: 'written', attempt_basis: 'first_time',
};

// Section headers (bare lines in the school file) -> our license_type value.
const SECTION_MAP = {
  barber: 'barber',
  cosmetologist: 'cosmetology',
  esthetician: 'esthetics',
  manicurist: 'manicuring',
  electrologist: 'electrology',
  hairstylist: 'hairstyling',
};

// Detects the license-type section a header line begins. Handles both the
// school file's bare headers ("Barber", "Cosmetologist") and the apprentice
// file's sentence headers ("...for Barber Written Exam for First Time...").
function detectSection(line) {
  const low = line.toLowerCase().trim();
  if (SECTION_MAP[low]) return SECTION_MAP[low];
  if (/written exam/.test(low)) {
    if (/\bbarber/.test(low)) return 'barber';
    if (/\bcosmetolog/.test(low)) return 'cosmetology';
    if (/\besthetic/.test(low)) return 'esthetics';
    if (/\bmanicur/.test(low)) return 'manicuring';
    if (/\belectrolog/.test(low)) return 'electrology';
    if (/\bhairstyl/.test(low)) return 'hairstyling';
  }
  return null;
}

// Same normalization the TDLR school matcher uses (import_cosmetology_student_records.js).
function normName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/\b(school|college|academy|of|the|inc|llc|corp|barber(ing)?|hair|design|institute|center|centre|beauty|cosmetology|esthetics?|nails?|program)\b/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
const normCity = (c) => (c || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const intOrZero = (s) => (s === '--' || s == null || s === '' ? 0 : parseInt(String(s).replace(/[^0-9]/g, ''), 10) || 0);

async function extract(file) {
  const buf = fs.readFileSync(path.join(DIR, file));
  const r = await new PDFParse({ data: buf }).getText();
  return r.text;
}

function parseSchoolRows(text, programPath, hasCity) {
  const rows = [];
  let currentLicense = null;
  for (const raw of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const sec = detectSection(raw);
    if (sec) { currentLicense = sec; continue; } // section header
    if (!raw.includes('\t')) continue; // title / page marker / other non-data
    if (/^School Name/i.test(raw)) continue;
    if (!currentLicense) continue; // data before any section header (shouldn't happen)
    const p = raw.split('\t').map((s) => s.trim());
    // school file: name, city, pass, %pass, fail, %fail  (6)
    // apprentice:  name, pass, %pass, fail, %fail         (5)
    const need = hasCity ? 6 : 5;
    if (p.length < need) continue;
    const name = p[0];
    const city = hasCity ? p[1] : '';
    const pass = intOrZero(p[hasCity ? 2 : 1]);
    const fail = intOrZero(p[hasCity ? 4 : 3]);
    const takers = pass + fail;
    if (!name || takers === 0) continue;
    rows.push({
      ...SCOPE,
      license_type: currentLicense,
      program_path: programPath,
      source_school_name: name,
      source_city: city,
      source_pdf: programPath === 'apprentice' ? APPRENTICE_PDF : SCHOOL_PDF,
      pass_count: pass,
      fail_count: fail,
      test_takers: takers,
      pass_rate: takers > 0 ? Math.round((pass / takers) * 10000) / 10000 : null,
    });
  }
  return rows;
}

async function fetchAll(table) {
  let out = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select('id, slug, school_name, city, formatted_address').range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out = out.concat(data);
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return out;
}

function wordOverlap(a, b) {
  const aw = new Set(a.split(' ').filter((w) => w.length > 2));
  const bw = new Set(b.split(' ').filter((w) => w.length > 2));
  if (aw.size === 0 || bw.size === 0) return 0;
  const shared = [...aw].filter((w) => bw.has(w)).length;
  return shared / Math.max(aw.size, bw.size);
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Apprentice file deliberately skipped for now: its two license sections
  // ("...for Barber Written Exam", "...for Cosmetology Written Exam") flatten
  // to the top of the extracted text, so barber vs cosmetology apprentice rows
  // can't be split by position. It's a small, secondary pathway — revisit with
  // a layout-aware extractor if we want it. The main school file is clean.
  const schoolText = await extract(SCHOOL_PDF);
  const rows = parseSchoolRows(schoolText, 'school', true);
  console.log(`Parsed ${rows.length} CA pass-rate rows (${rows.filter((r) => r.program_path === 'school').length} school, ${rows.filter((r) => r.program_path === 'apprentice').length} apprentice).`);
  const byLicense = {};
  for (const r of rows) byLicense[r.license_type] = (byLicense[r.license_type] || 0) + 1;
  console.log('  by license type: ' + Object.entries(byLicense).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));

  // Build a match index from our CA school entities (both tables).
  const [barber, cosmet] = await Promise.all([
    fetchAll('agent_barber_school_leads'),
    fetchAll('agent_cosmetology_school_leads'),
  ]);
  const entities = [
    ...barber.map((e) => ({ ...e, school_type: 'barber' })),
    ...cosmet.map((e) => ({ ...e, school_type: 'cosmetology' })),
  ].filter((e) => / CA\b|, CA/i.test(e.formatted_address || ''));
  console.log(`CA school entities to match against: ${entities.length} (${barber.filter((e)=>/ CA\b|, CA/i.test(e.formatted_address||'')).length} barber, ${cosmet.filter((e)=>/ CA\b|, CA/i.test(e.formatted_address||'')).length} cosmetology).`);

  const exactIndex = new Map(); // `${normName}|${normCity}` -> entity
  const byCity = new Map();     // normCity -> entity[]
  for (const e of entities) {
    const nn = normName(e.school_name), nc = normCity(e.city);
    exactIndex.set(`${nn}|${nc}`, e);
    if (!byCity.has(nc)) byCity.set(nc, []);
    byCity.get(nc).push(e);
  }

  let exact = 0, fuzzy = 0, unmatched = 0;
  for (const r of rows) {
    const nn = normName(r.source_school_name), nc = normCity(r.source_city);
    let match = exactIndex.get(`${nn}|${nc}`);
    let conf = 'exact';
    if (!match) {
      const candidates = byCity.get(nc) || [];
      let best = null, bestScore = 0;
      for (const c of candidates) {
        const s = wordOverlap(nn, normName(c.school_name));
        if (s > bestScore) { bestScore = s; best = c; }
      }
      if (best && bestScore >= 0.6) { match = best; conf = 'fuzzy'; }
    }
    if (match) {
      r.school_id = match.id;
      r.school_type = match.school_type;
      r.match_confidence = conf;
      conf === 'exact' ? exact++ : fuzzy++;
    } else {
      r.school_id = null;
      r.school_type = null;
      r.match_confidence = 'unmatched';
      unmatched++;
    }
  }

  console.log(`\n=== MATCH COVERAGE ===`);
  console.log(`  exact: ${exact} | fuzzy: ${fuzzy} | unmatched: ${unmatched}`);
  console.log(`  matched to an existing entity: ${exact + fuzzy} / ${rows.length} (${Math.round(((exact + fuzzy) / rows.length) * 100)}%)`);
  console.log(`  unmatched rows become stub-seed candidates (school_id = null).`);

  const totalTakers = rows.reduce((s, r) => s + r.test_takers, 0);
  const overallPass = rows.reduce((s, r) => s + r.pass_count, 0);
  console.log(`\n  total first-time written test-takers (Q1 2026): ${totalTakers} | overall pass rate: ${Math.round((overallPass / totalTakers) * 100)}%`);

  console.log('\n  sample matched rows:');
  rows.filter((r) => r.match_confidence !== 'unmatched').slice(0, 8)
    .forEach((r) => console.log(`    [${r.match_confidence}] ${r.source_school_name} (${r.source_city}) -> ${r.pass_count}/${r.test_takers} = ${Math.round(r.pass_rate * 100)}%  [${r.school_type}]`));

  // Report file.
  const csv = ['license_type,match_confidence,school_type,source_school_name,source_city,pass_count,fail_count,test_takers,pass_rate,program_path',
    ...rows.map((r) => `"${r.license_type}","${r.match_confidence}","${r.school_type || ''}","${r.source_school_name.replace(/"/g, '""')}","${r.source_city}",${r.pass_count},${r.fail_count},${r.test_takers},${r.pass_rate},${r.program_path}`)].join('\n');
  const csvPath = path.join(OUT_DIR, 'ca_pass_rates_dryrun.csv');
  fs.writeFileSync(csvPath, csv);
  console.log(`\n  Full report: ${csvPath}`);

  if (!COMMIT) {
    console.log('\nPREVIEW ONLY — nothing written. Re-run with --commit to load into school_exam_stats (table must exist).');
    return;
  }

  console.log('\n--commit — upserting into school_exam_stats...');
  // Merge any rows sharing the natural key by summing their cohorts. A handful
  // of schools are reported as multiple rows within one section (and the two
  // smallest license types — electrology, hairstyling — fold into the adjacent
  // esthetics/manicuring section because the PDF flattens their headers). The
  // core barber and cosmetology sections are cleanly separated, so their sums
  // are true per-school cohort totals.
  const mergedMap = new Map();
  for (const r of rows) {
    const k = [r.state, r.license_type, r.program_path, r.test_type, r.attempt_basis, r.period_label, r.source_school_name, r.source_city].join('');
    if (!mergedMap.has(k)) {
      mergedMap.set(k, { ...r });
    } else {
      const e = mergedMap.get(k);
      e.pass_count += r.pass_count; e.fail_count += r.fail_count; e.test_takers += r.test_takers;
      e.pass_rate = e.test_takers > 0 ? Math.round((e.pass_count / e.test_takers) * 10000) / 10000 : null;
      if (!e.school_id && r.school_id) { e.school_id = r.school_id; e.school_type = r.school_type; e.match_confidence = r.match_confidence; }
    }
  }
  const payload = [...mergedMap.values()].map((r) => ({
    school_id: r.school_id, school_type: r.school_type, match_confidence: r.match_confidence,
    state: r.state, regulator: r.regulator, exam_year: r.exam_year, period_label: r.period_label,
    test_type: r.test_type, attempt_basis: r.attempt_basis, program_path: r.program_path, license_type: r.license_type,
    pass_count: r.pass_count, fail_count: r.fail_count, test_takers: r.test_takers, pass_rate: r.pass_rate,
    source_school_name: r.source_school_name, source_city: r.source_city, source_pdf: r.source_pdf,
  }));
  console.log(`  ${rows.length} parsed rows -> ${payload.length} unique school/license rows after merge`);
  const onConflict = 'state,license_type,program_path,test_type,attempt_basis,period_label,source_school_name,source_city';
  let inserted = 0;
  for (let i = 0; i < payload.length; i += 200) {
    const chunk = payload.slice(i, i + 200);
    const { error } = await supabase.from('school_exam_stats').upsert(chunk, { onConflict });
    if (error) { console.error(`  chunk ${i} failed: ${error.message}`); process.exit(1); }
    inserted += chunk.length;
    process.stdout.write(`\r  upserted ${inserted}/${payload.length}`);
  }
  console.log(`\nDONE. ${inserted} rows in school_exam_stats.`);
}

run().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
