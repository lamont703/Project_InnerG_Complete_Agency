/**
 * Shared correction for school-name fragments the TDLR roster parser leaks
 * into a student's last_name (see fix_student_lastnames_dryrun.js and the
 * parse_*_student_pdfs.js header comments for the root cause). Single source
 * of truth so the parser (fix at ingestion) and the dry-run/backfill (fix
 * existing rows) can never drift apart.
 *
 * Rule: within a school_code, strip a LEADING run of school-structure
 * qualifier tokens from a last_name ONLY when every token in the run is a
 * known qualifier AND that exact run is shared by >= 2 distinct students of
 * the same code (a real surname's first token is not shared as a leading
 * fragment across unrelated students). Never strips to empty. Compound
 * surnames ("De La Rosa", "Andrade Espinoza") are untouched because their
 * leading tokens are not qualifiers.
 */

// School-structure qualifier tokens (lowercased, punctuation-stripped) — the
// ONLY tokens eligible to be stripped from the front of a last_name.
// Deliberately excludes Spanish surname particles (de, la, del, los, las, y).
const QUALIFIER_TOKENS = new Set([
  // directional / campus
  'n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw', 'north', 'south', 'east', 'west',
  'central', 'main', 'downtown', 'uptown', 'metro', 'campus',
  // entity suffixes
  'llc', 'inc', 'llp', 'ltd', 'corp', 'co',
  // school-type words
  'school', 'college', 'academy', 'institute', 'university', 'beauty', 'barber',
  'barbering', 'hair', 'cosmetology', 'salon', 'spa', 'career', 'careers', 'tech',
  'technical', 'training', 'center', 'centre', 'studio', 'design', 'styling',
  // school-type words (public/district & program qualifiers) — added after the
  // "BISD Career Technical Education Center" case leaked "Education Center" past
  // the earlier list; these are all unambiguous school-structure words.
  'education', 'educational', 'vocational', 'adult', 'continuing', 'arts',
  'sciences', 'science', 'magnet', 'prep', 'preparatory', 'regional',
  'community', 'county', 'district', 'isd', 'cisd', 'aisd', 'high', 'middle',
  'elementary', 'junior', 'senior',
  // connectors (only ever consumed mid-run between qualifier words)
  'of', 'the', 'and', '&', 'at',
]);

const normToken = (t) => t.toLowerCase().replace(/[^a-z0-9&]/g, '');

// Length (in tokens) of the leading run of qualifier tokens, never consuming
// the final token (a last_name must keep >= 1 real token).
function leadingQualifierRunLen(tokens) {
  let i = 0;
  while (i < tokens.length - 1 && QUALIFIER_TOKENS.has(normToken(tokens[i]))) i++;
  return i;
}

/**
 * @param {Array<{school_code:string,last_name:string,first_name:string}>} records
 * @returns {{ correctedByIndex: Map<number,string>, changes: Array }}
 *   correctedByIndex maps the record's array index -> corrected last_name
 *   (only for records that change). changes is a detail log for reporting.
 */
function computeLastNameCorrections(records) {
  // Group indices by school_code.
  const idxByCode = new Map();
  records.forEach((r, i) => {
    if (!idxByCode.has(r.school_code)) idxByCode.set(r.school_code, []);
    idxByCode.get(r.school_code).push(i);
  });

  const correctedByIndex = new Map();
  const changes = [];

  for (const [code, indices] of idxByCode.entries()) {
    // Distinct students (last|first) per candidate leading qualifier run.
    const runStudents = new Map();
    for (const i of indices) {
      const tokens = (records[i].last_name || '').trim().split(/\s+/).filter(Boolean);
      const runLen = leadingQualifierRunLen(tokens);
      if (runLen === 0) continue;
      const run = tokens.slice(0, runLen).map(normToken).join(' ');
      const ident = `${(records[i].last_name || '').toLowerCase()}|${(records[i].first_name || '').toLowerCase()}`;
      if (!runStudents.has(run)) runStudents.set(run, new Set());
      runStudents.get(run).add(ident);
    }

    for (const i of indices) {
      const raw = (records[i].last_name || '').trim();
      const tokens = raw.split(/\s+/).filter(Boolean);
      const runLen = leadingQualifierRunLen(tokens);
      if (runLen === 0) continue;
      const run = tokens.slice(0, runLen).map(normToken).join(' ');
      if ((runStudents.get(run)?.size || 0) < 2) continue; // not shared → likely a real name
      const newLast = tokens.slice(runLen).join(' ');
      if (!newLast || newLast === raw) continue;

      correctedByIndex.set(i, newLast);
      changes.push({
        school_code: code,
        school_name: records[i].school_name,
        first_name: records[i].first_name,
        old_last_name: raw,
        new_last_name: newLast,
        stripped: tokens.slice(0, runLen).join(' '),
        shared_by_students: runStudents.get(run).size,
      });
    }
  }

  return { correctedByIndex, changes };
}

/**
 * The symmetric half of the fix: the qualifier run stripped from a last_name
 * belongs to the SCHOOL name (the parser truncated it). Reconstructs the full
 * school_name per school_code = base name + the fullest observed stripped tail,
 * applied uniformly to every row of that code so the column stays consistent.
 *
 * @param {Array<{school_code:string,school_name:string,last_name:string,first_name:string}>} records
 * @returns {Map<string, {base:string, proposedName:string, runs:Object, needsReview:boolean}>}
 *   keyed by school_code (only affected codes). needsReview flags codes whose
 *   observed tails don't all nest into one fullest tail (e.g. "N Campus" vs
 *   "North Campus", or a genuine merge) — auto-picks the fullest, but worth a
 *   human glance.
 */
// Human-confirmed full names for school_codes whose observed tails don't nest
// into one fullest tail (the auto-pick would be wrong or incomplete). Keyed by
// school_code. Reviewed against the source roster.
const SCHOOL_NAME_OVERRIDES = {
  // Rows split the name two ways ("…Beauty And Barber School" + "School LLC");
  // the true name is the merge, with the LLC kept. (confirmed)
  '70524912': 'New Image Beauty And Barber School LLC',
};

function computeSchoolNameCorrections(records) {
  const { changes } = computeLastNameCorrections(records);
  const byCode = new Map();
  for (const c of changes) {
    if (!byCode.has(c.school_code)) byCode.set(c.school_code, { base: c.school_name, runs: new Map() });
    const e = byCode.get(c.school_code);
    e.runs.set(c.stripped, (e.runs.get(c.stripped) || 0) + 1);
  }

  const result = new Map();
  for (const [code, e] of byCode.entries()) {
    const runList = [...e.runs.keys()];
    // Fullest tail: most words, then longest string.
    const fullRun = runList.slice().sort((x, y) =>
      (y.split(' ').length - x.split(' ').length) || (y.length - x.length))[0];
    const fullWords = fullRun.split(' ');
    // Every observed run should be a trailing subsequence of the fullest run.
    const nestedOk = runList.every((run) => {
      const rw = run.split(' ');
      return rw.join(' ') === fullWords.slice(fullWords.length - rw.length).join(' ');
    });
    const override = SCHOOL_NAME_OVERRIDES[code];
    result.set(code, {
      base: e.base,
      proposedName: override || `${e.base} ${fullRun}`.replace(/\s+/g, ' ').trim(),
      runs: Object.fromEntries(e.runs),
      // An override resolves the ambiguity, so it no longer needs review.
      needsReview: override ? false : !nestedOk,
    });
  }
  return result;
}

module.exports = { QUALIFIER_TOKENS, leadingQualifierRunLen, computeLastNameCorrections, computeSchoolNameCorrections };
