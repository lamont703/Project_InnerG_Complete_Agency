/**
 * Imports parsed TDLR barber exam records (from parse_barber_student_pdfs.js's
 * output) into agent_barber_student_leads, matching each school name against
 * agent_barber_school_leads to build the student<->school relationship link.
 *
 * Usage:
 *   node import_barber_student_records.js
 *   node import_barber_student_records.js --dry-run
 */
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY_RUN = process.argv.includes('--dry-run');
const SCRATCHPAD = '/private/tmp/claude-502/-Users-lamontevans-Desktop-AI-Blockchain-Enterprise-Services/76b49128-14b9-4dfc-8547-027b7a33f313/scratchpad';

function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/\b(school|college|academy|of|the|inc|llc|corp|barber(ing)?|hair|design|institute|center|beauty)\b/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordOverlapScore(a, b) {
  const aw = new Set(a.split(' ').filter((w) => w.length > 2));
  const bw = new Set(b.split(' ').filter((w) => w.length > 2));
  if (aw.size === 0 || bw.size === 0) return 0;
  const overlap = [...aw].filter((w) => bw.has(w)).length;
  return overlap / Math.max(aw.size, bw.size);
}

function matchSchool(pdfSchoolName, schools) {
  const target = normalizeName(pdfSchoolName);
  if (!target) return { school: null, confidence: 'unmatched' };

  const exact = schools.filter((s) => normalizeName(s.school_name) === target);
  if (exact.length === 1) return { school: exact[0], confidence: 'exact' };
  if (exact.length > 1) return { school: null, confidence: 'ambiguous' }; // multiple campuses, same name

  const scored = schools
    .map((s) => ({ school: s, score: wordOverlapScore(target, normalizeName(s.school_name)) }))
    .filter((s) => s.score >= 0.7)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { school: null, confidence: 'unmatched' };
  if (scored.length > 1 && scored[0].score === scored[1].score) return { school: null, confidence: 'ambiguous' };
  return { school: scored[0].school, confidence: 'fuzzy' };
}

async function run() {
  const records = JSON.parse(fs.readFileSync(`${SCRATCHPAD}/parsed_student_records.json`, 'utf-8'));
  console.log(`Loaded ${records.length} parsed records.`);

  const { data: schools, error: schoolsErr } = await supabase.from('agent_barber_school_leads').select('id, school_name');
  if (schoolsErr) {
    console.error('Failed to load schools:', schoolsErr.message);
    process.exit(1);
  }

  // Match once per distinct school_code (all records sharing a code share the same school name).
  const uniqueCodes = new Map();
  for (const r of records) {
    if (!uniqueCodes.has(r.school_code)) uniqueCodes.set(r.school_code, r.school_name);
  }

  const matchByCode = new Map();
  let exactCount = 0, fuzzyCount = 0, ambiguousCount = 0, unmatchedCount = 0;
  for (const [code, name] of uniqueCodes.entries()) {
    const { school, confidence } = matchSchool(name, schools);
    matchByCode.set(code, { schoolId: school?.id || null, confidence });
    if (confidence === 'exact') exactCount++;
    else if (confidence === 'fuzzy') fuzzyCount++;
    else if (confidence === 'ambiguous') ambiguousCount++;
    else unmatchedCount++;
  }

  console.log(`\nSchool matching (${uniqueCodes.size} distinct schools in the PDFs):`);
  console.log(`  Exact matches: ${exactCount}`);
  console.log(`  Fuzzy matches: ${fuzzyCount}`);
  console.log(`  Ambiguous (multiple candidates, skipped): ${ambiguousCount}`);
  console.log(`  Unmatched (not in our school table): ${unmatchedCount}`);

  const rows = records.map((r) => {
    const match = matchByCode.get(r.school_code);
    return {
      school_code: r.school_code,
      school_name: r.school_name,
      last_name: r.last_name,
      first_name: r.first_name,
      student_key: `${r.school_code}|${r.last_name.toLowerCase()}|${r.first_name.toLowerCase()}`,
      matched_school_id: match.schoolId,
      school_match_confidence: match.confidence,
      test_type: r.test_type,
      exam_year: 2026,
      test_date: r.test_date,
      result: r.result,
      score: r.score,
      attempt_number: r.attempt_number,
      is_latest_attempt: r.is_latest_attempt,
      source_pdf: r.test_type === 'Written'
        ? 'Texas Class A Barber Written English 2026 Results.pdf'
        : 'Texas Class A Barber Practical English 2026 Results.pdf',
    };
  });

  if (DRY_RUN) {
    console.log(`\n[dry-run] Would insert ${rows.length} rows. Sample:`);
    console.log(JSON.stringify(rows.slice(0, 3), null, 2));
    return;
  }

  console.log(`\nInserting ${rows.length} rows...`);
  const BATCH_SIZE = 200;
  let inserted = 0, failed = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('agent_barber_student_leads').upsert(batch, {
      onConflict: 'school_code,last_name,first_name,test_type,test_date,score',
    });
    if (error) {
      console.error(`Batch ${i}-${i + batch.length} failed:`, error.message);
      failed += batch.length;
    } else {
      inserted += batch.length;
      console.log(`  Inserted batch ${i + 1}-${i + batch.length}`);
    }
  }

  console.log(`\nDone. Inserted/updated: ${inserted}, Failed: ${failed}`);
}

run();
