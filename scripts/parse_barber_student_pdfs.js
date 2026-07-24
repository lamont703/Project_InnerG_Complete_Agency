/**
 * Parses the two TDLR Pass/Fail roster PDFs (Written + Practical Class A
 * Barber exams, 2026) into structured test-attempt records.
 *
 * The PDFs have no delimiter between the school name and the student's last
 * name (both are just space-separated words before the "LASTNAME, FIRSTNAME"
 * comma). School names also sometimes wrap across a line break. To split
 * them reliably, records are grouped by school code, and the longest common
 * word-prefix across all of a school's "text before the comma" values is
 * taken as the school name (it's the part that doesn't vary; the last name
 * is what's left). Schools with only one record fall back to matching
 * against our existing known school name list.
 *
 * Usage: node parse_barber_student_pdfs.js
 * Writes: scratchpad/parsed_student_records.json
 */
const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { computeLastNameCorrections, computeSchoolNameCorrections } = require('./student_lastname_correction');

const SCRATCHPAD = '/private/tmp/claude-502/-Users-lamontevans-Desktop-AI-Blockchain-Enterprise-Services/76b49128-14b9-4dfc-8547-027b7a33f313/scratchpad';

async function extractText(pdfPath) {
  const buf = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: buf });
  const result = await parser.getText();
  return result.text;
}

function normalizeWhitespace(str) {
  return str.replace(/\s+/g, ' ').trim();
}

// Matches: {8-digit school code} {text...} {LASTNAME(s)}, {FIRSTNAME...} TX Class A Barber {Written|Practical}\s*English {MM-DD-YY} {PASS|FAIL} ({score}%)
// Note: \s* (not \s+) before "TX Class A Barber" — the source PDF text
// sometimes has zero whitespace between the name and the test-name marker
// (e.g. "MARTINEZTX Class A Barber..."), which \s+ would fail to match,
// forcing the engine to backtrack across subsequent records looking for a
// working boundary and swallowing them into one garbled record.
const RECORD_REGEX = /(\d{8})\s+([\s\S]+?),\s+([\s\S]+?)\s*TX Class A Barber (Written|Practical)\s*English\s+(\d{2}-\d{2}-\d{2})\s+(PASS|FAIL|UNAVAILABLE)\s*\(([\d.]+)%\)/g;

function parseRawRecords(text, testType) {
  const records = [];
  let m;
  RECORD_REGEX.lastIndex = 0;
  while ((m = RECORD_REGEX.exec(text)) !== null) {
    records.push({
      schoolCode: m[1],
      prefixBeforeComma: normalizeWhitespace(m[2]),
      firstNamePart: normalizeWhitespace(m[3]),
      testType: m[4] === 'Written' ? 'Written' : 'Practical',
      testDate: m[5],
      result: m[6],
      score: parseFloat(m[7]),
    });
  }
  return records;
}

function wordOverlapScore(a, b) {
  const aw = new Set(a.split(' ').filter((w) => w.length > 2));
  const bw = new Set(b.split(' ').filter((w) => w.length > 2));
  if (aw.size === 0 || bw.size === 0) return 0;
  const overlap = [...aw].filter((w) => bw.has(w)).length;
  return overlap / Math.max(aw.size, bw.size);
}

function wordPrefixOverlap(a, b) {
  const aWords = a.split(' ');
  const bWords = b.split(' ');
  let i = 0;
  while (i < aWords.length && i < bWords.length && aWords[i] === bWords[i]) i++;
  return aWords.slice(0, i).join(' ');
}

function resolveSchoolNames(allRecords, knownSchoolNames) {
  const bySchoolCode = new Map();
  for (const r of allRecords) {
    if (!bySchoolCode.has(r.schoolCode)) bySchoolCode.set(r.schoolCode, []);
    bySchoolCode.get(r.schoolCode).push(r);
  }

  const schoolNameByCode = new Map();
  const ambiguous = [];

  for (const [code, recs] of bySchoolCode.entries()) {
    const prefixes = recs.map((r) => r.prefixBeforeComma);
    const uniquePrefixes = Array.from(new Set(prefixes));

    if (uniquePrefixes.length > 1) {
      // Longest common word-prefix across all this school's records is the school name.
      let common = uniquePrefixes[0];
      for (let i = 1; i < uniquePrefixes.length; i++) {
        common = wordPrefixOverlap(common, uniquePrefixes[i]);
        if (!common) break;
      }
      // A couple of schools are spelled two different ways for the same
      // code across records (e.g. "CUT & SHAVE BARBER & BEAUTY COLLEGE" vs
      // "CUT AND SHAVE BARBER COLLEGE"), which collapses the common prefix
      // down to something implausibly short ("CUT"). Below 2 words, prefer
      // a known-name match over trusting the prefix.
      if (common && common.split(' ').length >= 2) {
        schoolNameByCode.set(code, common);
        continue;
      }
    }

    // Fallback: either a single record for this code, or the common-prefix
    // result was too short to trust (inconsistent spelling across records).
    // Try every prefix variant against known school names — first for an
    // exact prefix match, then by word overlap for inconsistent spellings.
    const candidate = uniquePrefixes[0];
    let bestMatch = null;
    for (const variant of uniquePrefixes) {
      for (const known of knownSchoolNames) {
        const knownUpper = known.toUpperCase();
        if (variant.startsWith(knownUpper) && (!bestMatch || knownUpper.length > bestMatch.length)) {
          bestMatch = knownUpper;
        }
      }
    }
    if (!bestMatch) {
      for (const variant of uniquePrefixes) {
        for (const known of knownSchoolNames) {
          const knownUpper = known.toUpperCase();
          if (wordOverlapScore(variant, knownUpper) >= 0.75) {
            bestMatch = knownUpper;
            break;
          }
        }
        if (bestMatch) break;
      }
    }
    if (bestMatch) {
      schoolNameByCode.set(code, bestMatch);
    } else {
      // Last resort heuristic: assume the last name is 1 word.
      const words = candidate.split(' ');
      schoolNameByCode.set(code, words.slice(0, -1).join(' '));
      ambiguous.push({ code, candidate, guessed: words.slice(0, -1).join(' ') });
    }
  }

  return { schoolNameByCode, ambiguous };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// The single-pass non-greedy regex is ambiguous about where a school name
// ends and a last name begins, which occasionally lets the engine backtrack
// across an entire run of a retaking student's records (5+ attempts) before
// finding a working match — swallowing all of them into one garbled row.
// Once the school name is known (from resolveSchoolNames), re-extracting
// with the exact name as a literal anchor removes that ambiguity: the last
// name is simply "whatever comes right after this known name, up to the
// comma," which can't overshoot.
function extractPreciseRecordsForSchool(text, schoolCode, schoolNameRaw, testType) {
  const anchor = schoolNameRaw.split(' ').map(escapeRegex).join('\\s+');
  const regex = new RegExp(
    `${schoolCode}\\s+${anchor}\\s+([\\s\\S]+?),\\s+([\\s\\S]+?)\\s*TX Class A Barber (Written|Practical)\\s*English\\s+(\\d{2}-\\d{2}-\\d{2})\\s+(PASS|FAIL|UNAVAILABLE)\\s*\\(([\\d.]+)%\\)`,
    'g'
  );
  const records = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    records.push({
      schoolCode,
      prefixBeforeComma: schoolNameRaw + ' ' + normalizeWhitespace(m[1]),
      firstNamePart: normalizeWhitespace(m[2]),
      testType: m[3] === 'Written' ? 'Written' : 'Practical',
      testDate: m[4],
      result: m[5],
      score: parseFloat(m[6]),
    });
  }
  return records;
}

function titleCase(str) {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bLlc\b/g, 'LLC')
    .replace(/\bIi\b/g, 'II')
    .replace(/\bIii\b/g, 'III');
}

function toISODate(mmddyy) {
  const [mm, dd, yy] = mmddyy.split('-');
  return `20${yy}-${mm}-${dd}`;
}

async function run() {
  console.log('Extracting text from both PDFs...');
  const writtenText = await extractText(path.join(__dirname, '..', 'public', 'Texas Class A Barber Written English 2026 Results.pdf'));
  const practicalText = await extractText(path.join(__dirname, '..', 'public', 'Texas Class A Barber Practical English 2026 Results.pdf'));

  console.log('Parsing raw records...');
  const writtenRaw = parseRawRecords(writtenText, 'Written');
  const practicalRaw = parseRawRecords(practicalText, 'Practical');
  console.log(`  Written: ${writtenRaw.length} records`);
  console.log(`  Practical: ${practicalRaw.length} records`);

  const allRaw = [...writtenRaw, ...practicalRaw];

  const knownSchoolNames = JSON.parse(fs.readFileSync(path.join(SCRATCHPAD, 'known_school_names.json'), 'utf-8'));
  const { schoolNameByCode, ambiguous } = resolveSchoolNames(allRaw, knownSchoolNames);
  console.log(`\nResolved school names for ${schoolNameByCode.size} distinct school codes.`);
  console.log(`Ambiguous (single-record, no known-name match, used heuristic fallback): ${ambiguous.length}`);
  if (ambiguous.length > 0) {
    console.log(ambiguous.slice(0, 20).map((a) => `  ${a.code}: "${a.candidate}" -> guessed "${a.guessed}"`).join('\n'));
  }

  // Re-extract each school's records using its now-known exact name as a
  // literal anchor, which removes the ambiguity that caused catastrophic
  // backtracking on students with many retake attempts (see
  // extractPreciseRecordsForSchool). Falls back to the original pass-1 raw
  // records for a (school, test type) if the anchor doesn't recover at
  // least as many records — this happens for the handful of schools whose
  // resolved name was itself a heuristic guess that doesn't literally
  // appear in the text.
  const rawByCodeAndType = new Map();
  for (const r of allRaw) {
    const key = `${r.schoolCode}|${r.testType}`;
    if (!rawByCodeAndType.has(key)) rawByCodeAndType.set(key, []);
    rawByCodeAndType.get(key).push(r);
  }

  let preciseWins = 0, fallbackWins = 0;
  const reconciledRaw = [];
  for (const [key, rawRecords] of rawByCodeAndType.entries()) {
    const [schoolCode, testType] = key.split('|');
    const schoolNameRaw = schoolNameByCode.get(schoolCode);
    const sourceText = testType === 'Written' ? writtenText : practicalText;
    const preciseRecords = schoolNameRaw ? extractPreciseRecordsForSchool(sourceText, schoolCode, schoolNameRaw, testType) : [];

    if (preciseRecords.length >= rawRecords.length) {
      reconciledRaw.push(...preciseRecords);
      preciseWins++;
    } else {
      reconciledRaw.push(...rawRecords);
      fallbackWins++;
    }
  }
  console.log(`\nPrecise re-extraction: ${preciseWins} school/test-type groups improved, ${fallbackWins} fell back to the original pass.`);

  // A handful of records are marked UNAVAILABLE (0.0%) — a voided/no-score
  // attempt, not a real pass/fail outcome. Matched on the regex (so they
  // don't cause backtracking) but dropped here since they'd otherwise skew
  // pass-rate stats as a false FAIL.
  const unavailableCount = reconciledRaw.filter((r) => r.result === 'UNAVAILABLE').length;
  if (unavailableCount > 0) {
    console.log(`Dropping ${unavailableCount} UNAVAILABLE (voided/no-score) record(s).`);
  }
  const scoredOnly = reconciledRaw.filter((r) => r.result !== 'UNAVAILABLE');

  // Build final records: split last name from the school-name prefix, group
  // attempts per (schoolCode, lastName, firstNamePart) for attempt numbering.
  const finalRecords = scoredOnly.map((r) => {
    const primaryName = schoolNameByCode.get(r.schoolCode) || r.prefixBeforeComma;
    // The resolved school name doesn't always match this specific record's
    // actual text (a few schools are listed under 2 different names for the
    // same code — e.g. renamed mid-year, with both old and new names
    // appearing as separate roster entries). If it doesn't match, fall back
    // to a per-record heuristic (assume a 1-word last name) rather than
    // slicing garbage into the last name field.
    const schoolName = r.prefixBeforeComma.startsWith(primaryName)
      ? primaryName
      : r.prefixBeforeComma.split(' ').slice(0, -1).join(' ');
    const lastName = r.prefixBeforeComma.slice(schoolName.length).trim() || r.prefixBeforeComma;
    return {
      school_code: r.schoolCode,
      school_name_raw: primaryName,
      school_name: titleCase(primaryName),
      last_name: titleCase(lastName),
      first_name: titleCase(r.firstNamePart),
      test_type: r.testType,
      test_date: toISODate(r.testDate),
      result: r.result,
      score: r.score,
    };
  });

  // Correct school-name fragments leaked into last_name (campus qualifiers,
  // "LLC", etc.) — shared logic with fix_student_lastnames_dryrun.js. Applied
  // BEFORE dedup/attempt grouping so student_key uses the corrected surname.
  const { correctedByIndex } = computeLastNameCorrections(finalRecords);
  for (const [i, newLast] of correctedByIndex.entries()) finalRecords[i].last_name = newLast;
  if (correctedByIndex.size > 0) {
    console.log(`\nCorrected ${correctedByIndex.size} last_name(s) that had leaked school-name fragments.`);
  }

  // Symmetric fix: restore those leaked qualifier words onto the (truncated)
  // school_name, per school_code, so the school name is whole again.
  const schoolNameMap = computeSchoolNameCorrections(finalRecords);
  for (const rec of finalRecords) {
    const fix = schoolNameMap.get(rec.school_code);
    if (fix) rec.school_name = fix.proposedName;
  }
  if (schoolNameMap.size > 0) {
    console.log(`Reconstructed truncated school_name for ${schoolNameMap.size} school code(s).`);
  }

  // Dedupe exact-duplicate entries (same person/date/score can't be two real
  // attempts — this happens a handful of times in the source PDFs).
  const seenExact = new Set();
  const dedupedRecords = finalRecords.filter((rec) => {
    const key = `${rec.school_code}|${rec.last_name.toLowerCase()}|${rec.first_name.toLowerCase()}|${rec.test_type}|${rec.test_date}|${rec.score}`;
    if (seenExact.has(key)) return false;
    seenExact.add(key);
    return true;
  });
  if (dedupedRecords.length !== finalRecords.length) {
    console.log(`\nRemoved ${finalRecords.length - dedupedRecords.length} exact-duplicate source entries.`);
  }

  // Attempt numbering per (school_code, last_name, first_name, test_type), ordered by date.
  const grouped = new Map();
  for (const rec of dedupedRecords) {
    const key = `${rec.school_code}|${rec.last_name.toLowerCase()}|${rec.first_name.toLowerCase()}|${rec.test_type}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(rec);
  }
  for (const attempts of grouped.values()) {
    attempts.sort((a, b) => a.test_date.localeCompare(b.test_date));
    attempts.forEach((rec, i) => {
      rec.attempt_number = i + 1;
      rec.is_latest_attempt = i === attempts.length - 1;
    });
  }

  fs.writeFileSync(path.join(SCRATCHPAD, 'parsed_student_records.json'), JSON.stringify(dedupedRecords, null, 2));
  console.log(`\nTotal final records: ${dedupedRecords.length}`);
  console.log(`Saved to ${path.join(SCRATCHPAD, 'parsed_student_records.json')}`);

  // Sanity check: show a few sample school name resolutions.
  console.log('\n--- Sample school name resolutions ---');
  const sampleCodes = Array.from(schoolNameByCode.keys()).slice(0, 8);
  sampleCodes.forEach((code) => console.log(`  ${code}: "${schoolNameByCode.get(code)}"`));
}

run();
