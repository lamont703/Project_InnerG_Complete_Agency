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
const RECORD_REGEX = /(\d{8})\s+([\s\S]+?),\s+([\s\S]+?)\s+TX Class A Barber (Written|Practical)\s*English\s+(\d{2}-\d{2}-\d{2})\s+(PASS|FAIL)\s*\(([\d.]+)%\)/g;

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
      if (common) {
        schoolNameByCode.set(code, common);
        continue;
      }
    }

    // Fallback: only one distinct prefix seen for this code (single record, or
    // all records happen to share the exact same full prefix incl. last name
    // — shouldn't happen since last names differ, but guard anyway).
    // Try to match against known school names by finding the longest known
    // name that is a prefix of this string.
    const candidate = uniquePrefixes[0];
    let bestMatch = null;
    for (const known of knownSchoolNames) {
      const knownUpper = known.toUpperCase();
      if (candidate.startsWith(knownUpper) && (!bestMatch || knownUpper.length > bestMatch.length)) {
        bestMatch = knownUpper;
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

  // Build final records: split last name from the school-name prefix, group
  // attempts per (schoolCode, lastName, firstNamePart) for attempt numbering.
  const finalRecords = allRaw.map((r) => {
    const schoolName = schoolNameByCode.get(r.schoolCode) || r.prefixBeforeComma;
    const lastName = r.prefixBeforeComma.slice(schoolName.length).trim() || r.prefixBeforeComma;
    return {
      school_code: r.schoolCode,
      school_name_raw: schoolName,
      school_name: titleCase(schoolName),
      last_name: titleCase(lastName),
      first_name: titleCase(r.firstNamePart),
      test_type: r.testType,
      test_date: toISODate(r.testDate),
      result: r.result,
      score: r.score,
    };
  });

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
