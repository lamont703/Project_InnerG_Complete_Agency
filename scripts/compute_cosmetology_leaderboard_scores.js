/**
 * Computes the inferred metrics behind the Cosmetology Operator side of the
 * 2026 Texas Barber & Cosmetology School Leaderboard from
 * agent_cosmetology_student_leads: first-attempt pass rate, average
 * attempts-to-pass, and a blended 0-100 leaderboard score. Mirror of
 * compute_school_leaderboard_scores.js, reading/writing the cosmetology_*
 * columns instead so this doesn't collide with a dual-licensed school's
 * Barber-exam leaderboard metrics.
 *
 * Usage: node compute_cosmetology_leaderboard_scores.js
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

function computeScore({ writtenPassRate, practicalPassRate, firstAttemptRate, isAccredited }) {
  const components = [
    { weight: 50, value: writtenPassRate },
    { weight: 25, value: firstAttemptRate },
    { weight: 10, value: isAccredited ? 1 : 0 },
  ];
  if (practicalPassRate != null) components.push({ weight: 15, value: practicalPassRate });

  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const weightedSum = components.reduce((s, c) => s + c.weight * (c.value ?? 0), 0);
  return (weightedSum / totalWeight) * 100;
}

async function computeForTable(schoolTable, schoolType) {
  console.log(`\nComputing cosmetology leaderboard metrics for ${schoolTable}...`);

  const students = await fetchAll(
    'agent_cosmetology_student_leads',
    'matched_school_id, test_type, attempt_number, is_latest_attempt, result',
    (q) => q.eq('matched_school_type', schoolType).eq('test_type', 'Written').not('matched_school_id', 'is', null)
  );

  const bySchool = new Map();
  for (const s of students) {
    if (!bySchool.has(s.matched_school_id)) bySchool.set(s.matched_school_id, []);
    bySchool.get(s.matched_school_id).push(s);
  }

  const metricsBySchool = new Map();
  for (const [schoolId, attempts] of bySchool.entries()) {
    const firstAttempts = attempts.filter((a) => a.attempt_number === 1);
    const firstAttemptPasses = firstAttempts.filter((a) => a.result === 'PASS').length;
    const firstAttemptRate = firstAttempts.length > 0 ? firstAttemptPasses / firstAttempts.length : null;

    const eventualPasses = attempts.filter((a) => a.is_latest_attempt && a.result === 'PASS');
    const avgAttemptsToPass = eventualPasses.length > 0
      ? eventualPasses.reduce((sum, a) => sum + a.attempt_number, 0) / eventualPasses.length
      : null;

    metricsBySchool.set(schoolId, { firstAttemptRate, avgAttemptsToPass });
  }

  const schools = await fetchAll(schoolTable, 'id, cosmetology_written_pass_rate_2026, cosmetology_practical_pass_rate_2026, cosmetology_written_test_takers_2026, accreditation_status');

  let updated = 0, skippedNoData = 0, failed = 0;
  for (const school of schools) {
    const metrics = metricsBySchool.get(school.id);
    if (!metrics || school.cosmetology_written_pass_rate_2026 == null) {
      skippedNoData++;
      continue;
    }

    const score = computeScore({
      writtenPassRate: school.cosmetology_written_pass_rate_2026,
      practicalPassRate: school.cosmetology_practical_pass_rate_2026,
      firstAttemptRate: metrics.firstAttemptRate,
      isAccredited: school.accreditation_status === 'Accredited',
    });

    const { error } = await supabase
      .from(schoolTable)
      .update({
        cosmetology_written_first_attempt_pass_rate_2026: metrics.firstAttemptRate,
        cosmetology_written_avg_attempts_to_pass_2026: metrics.avgAttemptsToPass,
        cosmetology_school_leaderboard_score_2026: score,
      })
      .eq('id', school.id);

    if (error) {
      console.error(`  Failed to update ${school.id}:`, error.message);
      failed++;
    } else {
      updated++;
    }
  }

  console.log(`  Updated: ${updated}, Skipped (no 2026 written data): ${skippedNoData}, Failed: ${failed}`);
}

async function run() {
  const resetFields = {
    cosmetology_written_first_attempt_pass_rate_2026: null,
    cosmetology_written_avg_attempts_to_pass_2026: null,
    cosmetology_school_leaderboard_score_2026: null,
  };
  await supabase.from('agent_barber_school_leads').update(resetFields).not('id', 'is', null);
  await supabase.from('agent_cosmetology_school_leads').update(resetFields).not('id', 'is', null);

  await computeForTable('agent_barber_school_leads', 'barber');
  await computeForTable('agent_cosmetology_school_leads', 'cosmetology');
}

run();
