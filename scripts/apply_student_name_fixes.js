/**
 * Applies the reviewed last_name + school_name corrections (see
 * fix_student_lastnames_dryrun.js) to agent_barber_student_leads and
 * agent_cosmetology_student_leads, then repairs the derived fields
 * (student_key, attempt_number, is_latest_attempt) and de-duplicates any rows
 * the correction collapses onto the same UNIQUE(school_code, last_name,
 * first_name, test_type, test_date, score) key.
 *
 * Does NOT touch embeddings and calls NO external API. It records the ids of
 * rows whose embedding text changed (last_name or school_name) so they can be
 * re-embedded later, and prints the required follow-up commands (school
 * rematch, 2026 pass-rate recompute, embedding re-seed).
 *
 * SAFETY: preview by default (writes nothing). A full backup of every touched
 * row is written before any change. Pass --commit to actually write.
 *
 *   node scripts/apply_student_name_fixes.js            # PREVIEW
 *   node scripts/apply_student_name_fixes.js --commit   # APPLY
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { computeLastNameCorrections, computeSchoolNameCorrections } = require('./student_lastname_correction');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const COMMIT = process.argv.includes('--commit');
const OUT_DIR = path.join(__dirname, '..', 'scratchpad_reports');
const TABLES = [
  ['agent_barber_student_leads', 'barber'],
  ['agent_cosmetology_student_leads', 'cosmetology'],
];
const SELECT = 'id, school_code, school_name, last_name, first_name, test_type, test_date, score, student_key, attempt_number, is_latest_attempt';
const SEP = '';
const lc = (s) => (s || '').toLowerCase();

async function fetchAll(table) {
  let out = [];
  let from = 0;
  const size = 1000;
  while (true) {
    const { data, error } = await supabase.from(table).select(SELECT).range(from, from + size - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out = out.concat(data);
    if (!data || data.length < size) break;
    from += size;
  }
  return out;
}

// Build the full desired end-state for a table: corrected names, recomputed
// student_key, de-dup survivor/delete split, and recomputed attempt numbering.
function plan(rows) {
  const { correctedByIndex } = computeLastNameCorrections(rows);
  const schoolNameMap = computeSchoolNameCorrections(rows);

  const desired = rows.map((r, i) => {
    const newLast = correctedByIndex.get(i) ?? r.last_name;
    const sn = schoolNameMap.get(r.school_code);
    const newSchool = sn ? sn.proposedName : r.school_name;
    const newKey = `${r.school_code}|${lc(newLast)}|${lc(r.first_name)}`;
    return { orig: r, id: r.id, school_code: r.school_code, first_name: r.first_name,
      test_type: r.test_type, test_date: r.test_date, score: r.score,
      newLast, newSchool, newKey };
  });

  // De-dup on the table's UNIQUE constraint, computed against the NEW last_name
  // (a corrected row can collapse onto a sibling that parsed cleanly — same
  // student/exam/date/score). Keep the lowest id, delete the rest.
  const dupKey = (d) => [d.school_code, d.newLast, d.first_name, d.test_type, d.test_date, d.score].join(SEP);
  const groups = new Map();
  for (const d of desired) {
    if (!groups.has(dupKey(d))) groups.set(dupKey(d), []);
    groups.get(dupKey(d)).push(d);
  }
  const survivors = [];
  const toDelete = [];
  for (const arr of groups.values()) {
    if (arr.length === 1) { survivors.push(arr[0]); continue; }
    arr.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    survivors.push(arr[0]);
    toDelete.push(...arr.slice(1));
  }

  // Recompute attempt_number / is_latest_attempt among survivors, same grouping
  // key and date ordering the parser uses.
  const attGroups = new Map();
  for (const d of survivors) {
    const k = `${d.school_code}|${lc(d.newLast)}|${lc(d.first_name)}|${d.test_type}`;
    if (!attGroups.has(k)) attGroups.set(k, []);
    attGroups.get(k).push(d);
  }
  for (const arr of attGroups.values()) {
    arr.sort((a, b) => String(a.test_date).localeCompare(String(b.test_date)));
    arr.forEach((d, i) => { d.newAttempt = i + 1; d.newLatest = i === arr.length - 1; });
  }

  const updates = survivors
    .filter((d) =>
      d.newLast !== d.orig.last_name || d.newSchool !== d.orig.school_name ||
      d.newKey !== d.orig.student_key || d.newAttempt !== d.orig.attempt_number ||
      d.newLatest !== d.orig.is_latest_attempt)
    .map((d) => ({
      id: d.id,
      last_name: d.newLast,
      school_name: d.newSchool,
      student_key: d.newKey,
      attempt_number: d.newAttempt,
      is_latest_attempt: d.newLatest,
      _embeddingStale: d.newLast !== d.orig.last_name || d.newSchool !== d.orig.school_name,
    }));

  return { updates, toDelete };
}

// Small concurrency pool so a few thousand single-row writes finish quickly
// without hammering the connection.
async function pool(items, size, fn) {
  let done = 0;
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
    done += Math.min(size, items.length - i);
    if (done % 200 === 0 || done === items.length) process.stdout.write(`\r    ${done}/${items.length}`);
  }
  if (items.length) process.stdout.write('\n');
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = { generatedAt: new Date().toISOString(), tables: {} };
  const staleEmbeddingIds = {};
  let grandUpdates = 0, grandDeletes = 0, grandStale = 0;

  for (const [table, label] of TABLES) {
    const rows = await fetchAll(table);
    const { updates, toDelete } = plan(rows);
    const stale = updates.filter((u) => u._embeddingStale).map((u) => u.id);
    staleEmbeddingIds[table] = stale;
    grandUpdates += updates.length; grandDeletes += toDelete.length; grandStale += stale.length;

    // Backup: full original rows for everything we will touch (update or delete).
    const touchedIds = new Set([...updates.map((u) => u.id), ...toDelete.map((d) => d.id)]);
    const byId = new Map(rows.map((r) => [r.id, r]));
    backup.tables[table] = { updatedRows: [...touchedIds].map((id) => byId.get(id)) };

    console.log(`\n=== ${table} (${rows.length} rows) ===`);
    console.log(`  Row updates (name / student_key / attempt): ${updates.length}`);
    console.log(`  Duplicate rows to delete (collapsed by correction): ${toDelete.length}`);
    console.log(`  Rows whose embedding is now stale (last_name/school_name changed): ${stale.length}`);
    if (toDelete.length) {
      console.log('  Sample deletes (kept the lowest-id twin):');
      toDelete.slice(0, 6).forEach((d) => console.log(`    ${d.id}  [${d.newSchool}]  ${d.first_name} ${d.newLast}  ${d.test_type} ${d.test_date} ${d.score}%`));
    }
  }

  const backupPath = path.join(OUT_DIR, `student_name_fix_backup_${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  const stalePath = path.join(OUT_DIR, `student_name_fix_stale_embedding_ids_${stamp}.json`);
  fs.writeFileSync(stalePath, JSON.stringify(staleEmbeddingIds, null, 2));

  console.log(`\nBackup of every touched row: ${backupPath}`);
  console.log(`Stale-embedding row ids (for later re-seed): ${stalePath}`);

  if (!COMMIT) {
    console.log(`\nPREVIEW ONLY — nothing was written. Re-run with --commit to apply.`);
    console.log(`Totals if committed: ${grandUpdates} updates, ${grandDeletes} deletes, ${grandStale} embeddings marked stale.`);
    return;
  }

  console.log(`\n--commit set — applying changes...`);
  for (const [table, label] of TABLES) {
    const rows = await fetchAll(table);
    const { updates, toDelete } = plan(rows);

    // Deletes first so surviving updates can't hit the UNIQUE constraint.
    if (toDelete.length) {
      console.log(`  Deleting ${toDelete.length} duplicate row(s) from ${table}...`);
      await pool(toDelete, 25, async (d) => {
        const { error } = await supabase.from(table).delete().eq('id', d.id);
        if (error) console.error(`\n    delete ${d.id} failed: ${error.message}`);
      });
    }

    if (updates.length) {
      console.log(`  Updating ${updates.length} row(s) in ${table}...`);
      await pool(updates, 25, async (u) => {
        const { error } = await supabase.from(table).update({
          last_name: u.last_name,
          school_name: u.school_name,
          student_key: u.student_key,
          attempt_number: u.attempt_number,
          is_latest_attempt: u.is_latest_attempt,
        }).eq('id', u.id);
        if (error) console.error(`\n    update ${u.id} failed: ${error.message}`);
      });
    }
  }

  console.log(`\nDONE. Applied ${grandUpdates} updates and ${grandDeletes} deletes across both tables.`);
  console.log(`\nEMBEDDINGS: NOT touched (${grandStale} rows are now stale). No API was called.`);
  console.log(`\nRequired follow-ups (existing pipeline scripts):`);
  console.log(`  1) node scripts/rematch_barber_student_schools.js         # re-link schools (harmless; names now fuller)`);
  console.log(`  2) node scripts/compute_2026_school_pass_rates.js         # REQUIRED — attempt grouping changed`);
  console.log(`     node scripts/compute_2026_cosmetology_pass_rates.js`);
  console.log(`  3) (only when you're ready) NULL the embeddings listed in ${stalePath}`);
  console.log(`     and re-run the seed-*-student-embeddings scripts — ask first, this hits the embedding API.`);
}

run().catch((e) => { console.error(e); process.exit(1); });
