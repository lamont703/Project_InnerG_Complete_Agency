/**
 * Computes 2026 written/practical pass rates per school from
 * agent_barber_student_leads (using each student's latest attempt as their
 * ultimate outcome) and writes them onto the matched school row in either
 * agent_barber_school_leads or agent_cosmetology_school_leads.
 *
 * Usage: node compute_2026_school_pass_rates.js
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAll(table, columns, filters = (q) => q) {
  let all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    let query = supabase.from(table).select(columns).range(from, from + PAGE - 1);
    query = filters(query);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function resetStaleValues() {
  // Schools get re-matched/re-imported periodically (dedup fixes, backfills),
  // which can leave a school's matched_school_id reassigned elsewhere while
  // its old pass-rate columns still hold stats from a previous run — this
  // clears everyone first so a school with zero current matches doesn't keep
  // showing stale numbers forever.
  const resetFields = {
    written_pass_rate_2026: null,
    written_test_takers_2026: null,
    practical_pass_rate_2026: null,
    practical_test_takers_2026: null,
    pass_rates_2026_updated_at: null,
  };
  await supabase.from('agent_barber_school_leads').update(resetFields).not('id', 'is', null);
  await supabase.from('agent_cosmetology_school_leads').update(resetFields).not('id', 'is', null);
}

async function run() {
  console.log('Resetting existing 2026 pass-rate columns before recomputing...');
  await resetStaleValues();

  console.log('Loading latest-attempt student records...');
  const records = await fetchAll(
    'agent_barber_student_leads',
    'matched_school_id, matched_school_type, test_type, result',
    (q) => q.eq('is_latest_attempt', true).not('matched_school_id', 'is', null)
  );
  console.log(`Loaded ${records.length} latest-attempt records with a matched school.`);

  // Group by (school_id, school_type, test_type)
  const groups = new Map();
  for (const r of records) {
    const key = `${r.matched_school_type}|${r.matched_school_id}|${r.test_type}`;
    if (!groups.has(key)) groups.set(key, { total: 0, passed: 0 });
    const g = groups.get(key);
    g.total++;
    if (r.result === 'PASS') g.passed++;
  }

  // Re-organize per school for a single update per row.
  const perSchool = new Map(); // "type|id" -> { written: {total,passed}, practical: {total,passed} }
  for (const [key, stats] of groups.entries()) {
    const [type, id, testType] = key.split('|');
    const schoolKey = `${type}|${id}`;
    if (!perSchool.has(schoolKey)) perSchool.set(schoolKey, {});
    perSchool.get(schoolKey)[testType] = stats;
  }

  console.log(`\nUpdating ${perSchool.size} school(s)...`);
  let barberUpdated = 0, cosmetUpdated = 0, failed = 0;

  for (const [schoolKey, stats] of perSchool.entries()) {
    const [type, id] = schoolKey.split('|');
    const written = stats.Written;
    const practical = stats.Practical;

    const update = {
      written_pass_rate_2026: written ? written.passed / written.total : null,
      written_test_takers_2026: written ? written.total : null,
      practical_pass_rate_2026: practical ? practical.passed / practical.total : null,
      practical_test_takers_2026: practical ? practical.total : null,
      pass_rates_2026_updated_at: new Date().toISOString(),
    };

    const table = type === 'barber' ? 'agent_barber_school_leads' : 'agent_cosmetology_school_leads';
    const { error } = await supabase.from(table).update(update).eq('id', id);

    if (error) {
      console.error(`  Failed to update ${schoolKey}:`, error.message);
      failed++;
    } else {
      if (type === 'barber') barberUpdated++;
      else cosmetUpdated++;
    }
  }

  console.log('\n================================================');
  console.log(`Barber schools updated: ${barberUpdated}`);
  console.log(`Cosmetology schools updated: ${cosmetUpdated}`);
  console.log(`Failed: ${failed}`);
  console.log('================================================');
}

run();
