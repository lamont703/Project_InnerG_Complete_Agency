/**
 * Re-runs school matching for agent_barber_student_leads against BOTH
 * agent_barber_school_leads and agent_cosmetology_school_leads (some TDLR
 * roster schools turn out to be dual-licensed and only live in the
 * cosmetology table). Updates matched_school_id / matched_school_type /
 * school_match_confidence in place.
 *
 * Usage: node rematch_barber_student_schools.js
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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
  if (exact.length > 1) return { school: null, confidence: 'ambiguous' };

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
  console.log('Loading schools + student records...');
  const barberSchools = await fetchAll('agent_barber_school_leads', 'id, school_name');
  const cosmetSchools = await fetchAll('agent_cosmetology_school_leads', 'id, school_name');
  const students = await fetchAll('agent_barber_student_leads', 'id, school_code, school_name, matched_school_id, matched_school_type');
  console.log(`Barber schools: ${barberSchools.length}, Cosmetology schools: ${cosmetSchools.length}, Student records: ${students.length}`);

  const byCode = new Map();
  for (const s of students) {
    if (!byCode.has(s.school_code)) byCode.set(s.school_code, { name: s.school_name, ids: [] });
    byCode.get(s.school_code).ids.push(s.id);
  }

  let exact = 0, fuzzy = 0, ambiguous = 0, unmatched = 0, cosmetMatches = 0;
  let updated = 0;

  for (const [code, { name, ids }] of byCode.entries()) {
    // Prefer a barber-school match; only fall back to cosmetology if no barber match exists.
    let { school, confidence } = matchSchool(name, barberSchools);
    let type = 'barber';

    if (!school && (confidence === 'unmatched' || confidence === 'ambiguous')) {
      const cosmetResult = matchSchool(name, cosmetSchools);
      if (cosmetResult.school) {
        school = cosmetResult.school;
        confidence = cosmetResult.confidence;
        type = 'cosmetology';
        cosmetMatches++;
      }
    }

    if (confidence === 'exact') exact++;
    else if (confidence === 'fuzzy') fuzzy++;
    else if (confidence === 'ambiguous') ambiguous++;
    else unmatched++;

    const { error, count } = await supabase
      .from('agent_barber_student_leads')
      .update({
        matched_school_id: school?.id || null,
        matched_school_type: school ? type : null,
        school_match_confidence: confidence,
      }, { count: 'exact' })
      .eq('school_code', code);

    if (error) console.error(`  update failed for ${code}:`, error.message);
    else updated += count || 0;
  }

  console.log('\n================================================');
  console.log(`Distinct schools processed: ${byCode.size}`);
  console.log(`Exact: ${exact}, Fuzzy: ${fuzzy}, Ambiguous: ${ambiguous}, Unmatched: ${unmatched}`);
  console.log(`  (of which matched via cosmetology table: ${cosmetMatches})`);
  console.log(`Student rows updated: ${updated}`);
  console.log('================================================');
}

run();
