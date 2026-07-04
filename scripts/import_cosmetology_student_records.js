/**
 * Imports parsed TDLR Cosmetology Operator exam records (from
 * parse_cosmetology_student_pdfs.js's output) into
 * agent_cosmetology_student_leads, matching each school name against
 * agent_cosmetology_school_leads (primary) and falling back to
 * agent_barber_school_leads (for dual-licensed schools) — the mirror image
 * of the barber pipeline's matching priority.
 *
 * Usage:
 *   node import_cosmetology_student_records.js
 *   node import_cosmetology_student_records.js --dry-run
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
    .replace(/\b(school|college|academy|of|the|inc|llc|corp|barber(ing)?|hair|design|institute|center|beauty|cosmetology)\b/g, '')
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

function matchSchool(pdfSchoolName, candidates) {
  const target = normalizeName(pdfSchoolName);
  if (!target) return { school: null, confidence: 'unmatched' };

  const exact = candidates.filter((c) => normalizeName(c.school_name) === target);
  if (exact.length === 1) return { school: exact[0], confidence: 'exact' };
  if (exact.length > 1) return { school: null, confidence: 'ambiguous' }; // multiple campuses, same name

  const scored = candidates
    .map((c) => ({ school: c, score: wordOverlapScore(target, normalizeName(c.school_name)) }))
    .filter((s) => s.score >= 0.7)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { school: null, confidence: 'unmatched' };
  if (scored.length > 1 && scored[0].score === scored[1].score) return { school: null, confidence: 'ambiguous' };
  return { school: scored[0].school, confidence: 'fuzzy' };
}

async function fetchAll(table, columns) {
  let all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function run() {
  const records = JSON.parse(fs.readFileSync(`${SCRATCHPAD}/parsed_cosmetology_student_records.json`, 'utf-8'));
  console.log(`Loaded ${records.length} parsed records.`);

  const cosmetSchools = await fetchAll('agent_cosmetology_school_leads', 'id, school_name');
  const barberSchools = await fetchAll('agent_barber_school_leads', 'id, school_name');
  console.log(`Cosmetology schools: ${cosmetSchools.length}, Barber schools: ${barberSchools.length}`);

  const uniqueCodes = new Map();
  for (const r of records) {
    if (!uniqueCodes.has(r.school_code)) uniqueCodes.set(r.school_code, r.school_name);
  }

  const matchByCode = new Map();
  let exactCount = 0, fuzzyCount = 0, ambiguousCount = 0, unmatchedCount = 0, barberFallbackCount = 0;
  for (const [code, name] of uniqueCodes.entries()) {
    // Prefer a cosmetology-school match; only fall back to barber if no
    // cosmetology match exists (dual-licensed schools).
    let { school, confidence } = matchSchool(name, cosmetSchools);
    let type = 'cosmetology';

    if (!school && (confidence === 'unmatched' || confidence === 'ambiguous')) {
      const barberResult = matchSchool(name, barberSchools);
      if (barberResult.school) {
        school = barberResult.school;
        confidence = barberResult.confidence;
        type = 'barber';
        barberFallbackCount++;
      }
    }

    matchByCode.set(code, { schoolId: school?.id || null, schoolType: school ? type : null, confidence });
    if (confidence === 'exact') exactCount++;
    else if (confidence === 'fuzzy') fuzzyCount++;
    else if (confidence === 'ambiguous') ambiguousCount++;
    else unmatchedCount++;
  }

  console.log(`\nSchool matching (${uniqueCodes.size} distinct schools in the PDFs):`);
  console.log(`  Exact matches: ${exactCount}`);
  console.log(`  Fuzzy matches: ${fuzzyCount}`);
  console.log(`  Ambiguous (multiple candidates, skipped): ${ambiguousCount}`);
  console.log(`  Unmatched (not in either school table): ${unmatchedCount}`);
  console.log(`  (of which matched via barber-school fallback: ${barberFallbackCount})`);

  const rows = records.map((r) => {
    const match = matchByCode.get(r.school_code);
    return {
      school_code: r.school_code,
      school_name: r.school_name,
      last_name: r.last_name,
      first_name: r.first_name,
      student_key: `${r.school_code}|${r.last_name.toLowerCase()}|${r.first_name.toLowerCase()}`,
      matched_school_id: match.schoolId,
      matched_school_type: match.schoolType,
      school_match_confidence: match.confidence,
      test_type: r.test_type,
      exam_year: 2026,
      test_date: r.test_date,
      result: r.result,
      score: r.score,
      attempt_number: r.attempt_number,
      is_latest_attempt: r.is_latest_attempt,
      source_pdf: r.test_type === 'Written'
        ? 'Texas Cosmetology Operator Written English 2026 Results.pdf'
        : 'Texas Cosmetology Operator Practical English 2026 Results.pdf',
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
    const { error } = await supabase.from('agent_cosmetology_student_leads').upsert(batch, {
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
