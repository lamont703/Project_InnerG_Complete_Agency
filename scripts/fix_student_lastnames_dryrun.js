/**
 * DRY RUN ONLY — proposes corrections for school-name fragments that the PDF
 * parser leaked into the `last_name` column of agent_barber_student_leads and
 * agent_cosmetology_student_leads. Writes NOTHING to the database and calls NO
 * external API (no embeddings). It only reads the tables and emits a report of
 * proposed last_name changes for human review.
 *
 * Root cause (see parse_*_student_pdfs.js): the roster PDF has no delimiter
 * between the school name and the student's last name. For multi-campus
 * schools sharing one school_code, the "longest common word-prefix = school
 * name" heuristic stops at the shared base name (e.g. "San Jacinto College")
 * and leaks the per-campus qualifier ("North Campus") into last_name; entity
 * suffixes ("LLC") leak the same way.
 *
 * Correction rule (deliberately conservative — legit compound surnames like
 * "De La Rosa" / "Andrade Espinoza" must never be touched): within a
 * school_code, strip a LEADING run of school-structure qualifier tokens from a
 * last_name ONLY when (a) every token in that run is a known school-structure
 * word, AND (b) that exact leading run is shared by >= 2 distinct students of
 * the same school_code (a real surname's first token is not shared as a
 * leading fragment across unrelated students). Never strips to empty.
 *
 * Fused tokens (e.g. "Llcvelasquez") are flagged for manual review, not
 * auto-corrected — splitting a glued token can't be done safely by rule.
 *
 * Usage: node scripts/fix_student_lastnames_dryrun.js
 * Writes: scratchpad/student_lastname_fix_dryrun.json (+ console summary)
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { QUALIFIER_TOKENS, computeLastNameCorrections, computeSchoolNameCorrections } = require('./student_lastname_correction');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const OUT_DIR = path.join(__dirname, '..', 'scratchpad_reports');

// Fused-token detection uses ONLY strong, unambiguous school words — never
// connectors (and/of/the) or single-letter directionals, since real surnames
// like "Anderson"/"Andrade"/"Andrews" legitimately start with "and" and must
// not be flagged. A glued case like "Llcvelasquez" or "Collegebell-Wilson" is
// unambiguous; "Andrade" is not.
const STRONG_FUSED_TOKENS = [
  'llc', 'inc', 'corp', 'north', 'south', 'east', 'west', 'central', 'campus',
  'college', 'school', 'academy', 'institute', 'university', 'cosmetology',
  'beauty', 'barber', 'barbering', 'center', 'centre', 'technical', 'training',
  'salon',
];
const QUALIFIER_PREFIX_RE = new RegExp(`^(${STRONG_FUSED_TOKENS.join('|')})`, 'i');

const norm = (t) => t.toLowerCase().replace(/[^a-z0-9&]/g, '');

async function fetchAll(table) {
  let out = [];
  let from = 0;
  const size = 1000;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('id, school_code, school_name, last_name, first_name')
      .range(from, from + size - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out = out.concat(data);
    if (!data || data.length < size) break;
    from += size;
  }
  return out;
}

function processTable(rows, tableLabel) {
  // Strip logic comes from the shared module (single source of truth with the
  // parser). The dry-run adds the row id, student_key delta, and the
  // fused-token manual-review flag on top.
  const { correctedByIndex, changes: rawChanges } = computeLastNameCorrections(rows);

  const changes = [];
  for (const [i, newLast] of correctedByIndex.entries()) {
    const r = rows[i];
    const raw = (r.last_name || '').trim();
    const tokens = raw.split(/\s+/).filter(Boolean);
    const runLen = tokens.length - newLast.split(/\s+/).filter(Boolean).length;
    changes.push({
      table: tableLabel,
      id: r.id,
      school_name: r.school_name,
      school_code: r.school_code,
      first_name: r.first_name,
      old_last_name: raw,
      new_last_name: newLast,
      stripped: tokens.slice(0, runLen).join(' '),
      old_student_key: `${r.school_code}|${raw.toLowerCase()}|${(r.first_name || '').toLowerCase()}`,
      new_student_key: `${r.school_code}|${newLast.toLowerCase()}|${(r.first_name || '').toLowerCase()}`,
    });
  }

  // Fused-token detection (report-only): first token isn't a clean qualifier
  // but begins with a strong school word (e.g. "Llcvelasquez", "Centerrobinson")
  // — flag for manual review, never auto-corrected.
  const manualReview = [];
  for (const r of rows) {
    const first = ((r.last_name || '').trim().split(/\s+/)[0]) || '';
    if (QUALIFIER_TOKENS.has(norm(first))) continue;
    const m = norm(first).match(QUALIFIER_PREFIX_RE);
    if (m && norm(first) !== m[1].toLowerCase() && norm(first).length > m[1].length + 2) {
      manualReview.push({ table: tableLabel, id: r.id, school_name: r.school_name, school_code: r.school_code, last_name: (r.last_name || '').trim(), first_name: r.first_name, reason: `possible fused qualifier "${m[1]}" glued to surname` });
    }
  }

  void rawChanges;
  return { changes, manualReview };
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tables = [
    ['agent_barber_student_leads', 'barber'],
    ['agent_cosmetology_student_leads', 'cosmetology'],
  ];

  const report = { generatedAt: new Date().toISOString(), tables: {} };
  let totalChanges = 0, totalManual = 0, totalSchoolNameCodes = 0, totalSchoolNameRows = 0;

  for (const [table, label] of tables) {
    const rows = await fetchAll(table);
    const { changes, manualReview } = processTable(rows, label);
    totalChanges += changes.length;
    totalManual += manualReview.length;

    // Frequency of stripped fragments, for a quick sanity scan.
    const fragFreq = {};
    for (const c of changes) fragFreq[c.stripped] = (fragFreq[c.stripped] || 0) + 1;

    // School-name reconstruction (per affected school_code). Applies to EVERY
    // row of an affected code, so count those rows for the impact summary.
    const rowsPerCode = {};
    for (const r of rows) rowsPerCode[r.school_code] = (rowsPerCode[r.school_code] || 0) + 1;
    const schoolNameMap = computeSchoolNameCorrections(rows);
    const schoolNameProposals = [];
    for (const [code, info] of schoolNameMap.entries()) {
      schoolNameProposals.push({
        table: label, school_code: code, current_school_name: info.base,
        proposed_school_name: info.proposedName, observed_tails: info.runs,
        rows_in_code: rowsPerCode[code] || 0, needs_review: info.needsReview,
      });
    }
    schoolNameProposals.sort((a, b) => b.rows_in_code - a.rows_in_code);
    totalSchoolNameCodes += schoolNameProposals.length;
    totalSchoolNameRows += schoolNameProposals.reduce((s, p) => s + p.rows_in_code, 0);

    report.tables[table] = { totalRows: rows.length, proposedChanges: changes.length, manualReview: manualReview.length, strippedFragmentFrequency: fragFreq, changes, manualReviewRows: manualReview, schoolNameProposals };

    console.log(`\n=== ${table} (${rows.length} rows) ===`);
    console.log(`  Proposed last_name corrections: ${changes.length}`);
    console.log(`  Flagged for manual review (fused tokens): ${manualReview.length}`);
    console.log('  Top stripped fragments:');
    Object.entries(fragFreq).sort((a, b) => b[1] - a[1]).slice(0, 12)
      .forEach(([frag, n]) => console.log(`    "${frag}" — ${n}`));
    console.log('  Sample last_name corrections:');
    changes.slice(0, 8).forEach((c) => console.log(`    [${c.school_name}]  "${c.old_last_name}" -> "${c.new_last_name}"`));
    console.log(`  Proposed school_name reconstructions: ${schoolNameProposals.length} code(s), ${schoolNameProposals.reduce((s, p) => s + p.rows_in_code, 0)} rows`);
    schoolNameProposals.forEach((p) => console.log(`    "${p.current_school_name}" -> "${p.proposed_school_name}"  (${p.rows_in_code} rows${p.needs_review ? ', ⚠ REVIEW: ' + JSON.stringify(p.observed_tails) : ''})`));
    if (manualReview.length) {
      console.log('  Sample last_name manual-review rows:');
      manualReview.slice(0, 6).forEach((m) => console.log(`    [${m.school_name}]  "${m.last_name}"  (${m.reason})`));
    }
  }

  const outPath = path.join(OUT_DIR, 'student_lastname_fix_dryrun.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  // Flat CSV of every proposed change, for easy human review before applying.
  const csvRows = [['table', 'school_name', 'first_name', 'old_last_name', 'new_last_name', 'stripped', 'id']];
  for (const t of Object.keys(report.tables)) {
    for (const c of report.tables[t].changes) {
      csvRows.push([t, c.school_name, c.first_name, c.old_last_name, c.new_last_name, c.stripped, c.id]);
    }
  }
  const csv = csvRows.map((row) => row.map((f) => `"${String(f == null ? '' : f).replace(/"/g, '""')}"`).join(',')).join('\n');
  const csvPath = path.join(OUT_DIR, 'student_lastname_fix_dryrun.csv');
  fs.writeFileSync(csvPath, csv);

  // Separate CSV of the (small) per-code school_name reconstructions.
  const scRows = [['table', 'school_code', 'current_school_name', 'proposed_school_name', 'rows_in_code', 'needs_review', 'observed_tails']];
  for (const t of Object.keys(report.tables)) {
    for (const p of report.tables[t].schoolNameProposals) {
      scRows.push([t, p.school_code, p.current_school_name, p.proposed_school_name, p.rows_in_code, p.needs_review, JSON.stringify(p.observed_tails)]);
    }
  }
  const scCsv = scRows.map((row) => row.map((f) => `"${String(f == null ? '' : f).replace(/"/g, '""')}"`).join(',')).join('\n');
  const scPath = path.join(OUT_DIR, 'student_schoolname_fix_dryrun.csv');
  fs.writeFileSync(scPath, scCsv);

  console.log(`\nDRY RUN complete — NOTHING was written to the database, NO embedding API was called.`);
  console.log(`last_name: ${totalChanges} corrections, ${totalManual} flagged for manual review.`);
  console.log(`school_name: ${totalSchoolNameCodes} school codes reconstructed, affecting ${totalSchoolNameRows} rows.`);
  console.log(`Reports: ${outPath}`);
  console.log(`         ${csvPath}`);
  console.log(`         ${scPath}`);
}

run().catch((e) => { console.error(e); process.exit(1); });
