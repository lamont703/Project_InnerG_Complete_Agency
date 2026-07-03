/**
 * Merges existing public datasets in /public into agent_barber_school_leads:
 *  - 2026 Texas Barber and Cosmetology Financial Aide Data.csv (tuition, completion
 *    rate, median earnings, default rate, aid rates, student body size)
 *  - Accredited School Student Results.csv (Texas state board overall pass rate)
 *  - 2026_Texas_Barber_Cosmetology_Full_NCES_Data.json (accreditor name)
 *
 * Matching is by normalized school name (case/punctuation-insensitive, common
 * suffixes stripped). Schools with no confident match are logged and skipped.
 *
 * Usage:
 *   node merge_school_public_data.js
 *   node merge_school_public_data.js --dry-run   (log matches, write nothing)
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY_RUN = process.argv.includes('--dry-run');
const PUBLIC_DIR = path.join(__dirname, 'public');

function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/\b(school|college|academy|of|the|inc|llc|beauty|barber(ing)?|cosmetology|hair|design)\b/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCSVLine(line) {
  const row = [];
  let inQuotes = false;
  let field = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) {
      row.push(field.trim());
      field = '';
    } else field += ch;
  }
  row.push(field.trim());
  return row;
}

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim() !== '');
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => (row[h] = cols[i]));
    return row;
  });
}

function toNumber(val) {
  if (val === undefined || val === null || val === '' || val === 'N/A') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function wordOverlapScore(normalizedTarget, normalizedCandidate) {
  const targetWords = new Set(normalizedTarget.split(' ').filter((w) => w.length > 2));
  const candWords = new Set(normalizedCandidate.split(' ').filter((w) => w.length > 2));
  if (targetWords.size === 0 || candWords.size === 0) return 0;
  const overlap = [...targetWords].filter((w) => candWords.has(w)).length;
  return overlap / Math.max(targetWords.size, candWords.size);
}

// City-aware matching: when a school name is ambiguous (shared by multiple campuses
// in our own table, e.g. "Milan Institute of Cosmetology" in Denton/El Paso/Plano),
// a name-only match can silently attach the wrong campus's financial data. So:
//  - if the source has city info, prefer/require a candidate whose city agrees
//  - if the target name is ambiguous in our table and no city signal is available
//    to disambiguate, skip rather than guess
function findBestMatch(school, isAmbiguousName, candidates, getName, getCity) {
  const normalizedTarget = normalizeName(school.school_name);
  const normalizedTargetCity = normalizeName(school.city);

  const scored = candidates
    .map((c) => ({
      candidate: c,
      nameScore: normalizeName(getName(c)) === normalizedTarget ? 1 : wordOverlapScore(normalizedTarget, normalizeName(getName(c))),
      cityMatch: getCity ? normalizeName(getCity(c)) === normalizedTargetCity && normalizedTargetCity !== '' : null,
    }))
    .filter((s) => s.nameScore >= 0.6);

  if (scored.length === 0) return null;

  if (getCity) {
    const cityAgreeing = scored.filter((s) => s.cityMatch);
    if (cityAgreeing.length > 0) {
      return cityAgreeing.sort((a, b) => b.nameScore - a.nameScore)[0].candidate;
    }
    // No candidate agrees on city. Only safe to fall back to name-only if this
    // school's name isn't ambiguous within our own table.
    if (isAmbiguousName) return null;
  } else if (isAmbiguousName) {
    // No city info available on this source at all, and multiple campuses share
    // this name in our table — can't safely disambiguate, so skip.
    return null;
  }

  return scored.sort((a, b) => b.nameScore - a.nameScore)[0].candidate;
}

async function run() {
  console.log('Loading source datasets...');
  const financialAid = parseCSV(path.join(PUBLIC_DIR, '2026 Texas Barber and Cosmetology Financial Aide Data.csv'));
  const passFailRows = parseCSV(path.join(PUBLIC_DIR, 'Accredited School Student Results.csv'));
  const nces = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, '2026_Texas_Barber_Cosmetology_Full_NCES_Data.json'), 'utf-8'));

  // Dedupe pass/fail rows down to one entry per school (School Overall Pass Rate repeats per row).
  const passRateBySchool = new Map();
  for (const row of passFailRows) {
    const name = row['Accredited School Name'] || row['School Name'];
    if (name && row['School Overall Pass Rate'] && !passRateBySchool.has(normalizeName(name))) {
      passRateBySchool.set(normalizeName(name), { name, rate: row['School Overall Pass Rate'] });
    }
  }
  const passRateCandidates = Array.from(passRateBySchool.values());

  console.log(`Financial aid rows: ${financialAid.length}, unique pass-rate schools: ${passRateCandidates.length}, NCES records: ${nces.length}`);

  const { data: schools, error } = await supabase.from('agent_barber_school_leads').select('id, school_name, city');
  if (error) {
    console.error('Failed to load schools:', error.message);
    process.exit(1);
  }

  // Count how many DB rows share each normalized name (multi-campus chains like
  // "Milan Institute of Cosmetology" appear 3x under different cities).
  const nameCounts = new Map();
  for (const s of schools) {
    const key = normalizeName(s.school_name);
    nameCounts.set(key, (nameCounts.get(key) || 0) + 1);
  }

  let matchedFinancial = 0;
  let matchedPassRate = 0;
  let matchedAccreditor = 0;
  let ambiguousSkips = 0;
  let unmatchedCount = 0;

  for (const school of schools) {
    const isAmbiguous = nameCounts.get(normalizeName(school.school_name)) > 1;
    const update = {};
    let skippedAmbiguous = false;

    const finMatch = findBestMatch(school, isAmbiguous, financialAid, (r) => r['School Name'], (r) => r['City']);
    if (finMatch) {
      update.student_body_size = toNumber(finMatch['Student Body Size']);
      update.annual_tuition = toNumber(finMatch['Cost of Attendance']);
      update.completion_rate = toNumber(finMatch['Completion Rate']);
      update.median_earnings = toNumber(finMatch['1-Year Median Earnings']);
      update.default_rate = toNumber(finMatch['3-Year Default Rate']);
      update.pell_grant_rate = toNumber(finMatch['Pell Grant Rate']);
      update.federal_loan_rate = toNumber(finMatch['Federal Loan Rate']);
      update.median_student_debt = toNumber(finMatch['Median Student Debt']);
      matchedFinancial++;
    } else if (isAmbiguous) {
      skippedAmbiguous = true;
    }

    // Pass-rate source has no city column, so ambiguous names are always skipped inside findBestMatch.
    const passMatch = findBestMatch(school, isAmbiguous, passRateCandidates, (r) => r.name, null);
    if (passMatch) {
      update.state_pass_rate = passMatch.rate;
      matchedPassRate++;
    } else if (isAmbiguous) {
      skippedAmbiguous = true;
    }

    const ncesMatch = findBestMatch(school, isAmbiguous, nces, (r) => r.latest.school.name, (r) => r.latest.school.city);
    if (ncesMatch && ncesMatch.latest.school.accreditor) {
      update.accreditor_name = ncesMatch.latest.school.accreditor;
      matchedAccreditor++;
    } else if (isAmbiguous) {
      skippedAmbiguous = true;
    }

    const hasAnyMatch = Object.keys(update).length > 0;
    if (!hasAnyMatch) {
      if (skippedAmbiguous) {
        ambiguousSkips++;
        console.log(`  ambiguous, skipped: ${school.school_name} (${school.city || 'unknown city'})`);
      } else {
        unmatchedCount++;
        console.log(`  no match: ${school.school_name} (${school.city || 'unknown city'})`);
      }
      continue;
    }

    update.public_data_matched_at = new Date().toISOString();

    if (DRY_RUN) {
      console.log(`  [dry-run] would update ${school.school_name}:`, update);
      continue;
    }

    const { error: updateErr } = await supabase.from('agent_barber_school_leads').update(update).eq('id', school.id);
    if (updateErr) console.error(`  update failed for ${school.school_name}:`, updateErr.message);
  }

  console.log('\n================================================');
  console.log(`Schools processed: ${schools.length}`);
  console.log(`Matched financial aid: ${matchedFinancial}`);
  console.log(`Matched pass rate: ${matchedPassRate}`);
  console.log(`Matched accreditor (NCES): ${matchedAccreditor}`);
  console.log(`No match at all: ${unmatchedCount}`);
  console.log(`Skipped as ambiguous (multi-campus name, no city disambiguator): ${ambiguousSkips}`);
  console.log('================================================');
}

run();
