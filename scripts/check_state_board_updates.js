/**
 * READ-ONLY: watch every regulator page behind the distance-education matrix
 * and report when one changes. No writes to the database, no edits to any page.
 *
 * Usage:
 *   node scripts/check_state_board_updates.js            # compare against the stored baseline
 *   node scripts/check_state_board_updates.js --save     # store current state as the baseline
 *   node scripts/check_state_board_updates.js --show     # print the baseline and exit
 *
 * WHY A HASH AND NOT A DIFF OF THE WHOLE PAGE. State board sites carry rotating
 * banners, session tokens and "last visited" furniture that change on every
 * request. Hashing the raw HTML produces a false positive every run, which
 * trains everyone to ignore the alert. This strips scripts, styles and tags,
 * collapses whitespace, and hashes the readable text — so it fires on content,
 * not on chrome.
 *
 * IT ALSO WATCHES FOR THE NUMBERS SPECIFICALLY. Beyond the text hash, each
 * source declares the figures we published from it. If a page still parses but
 * the figure we quoted is no longer present in it, that is reported separately
 * and loudly — that is the failure mode that silently makes a published page
 * wrong, and it is the one a hash alone would report as a vague "changed".
 *
 * WHAT THIS IS FOR. Being first to publish "Alabama just went to 50%" is a news
 * event with no incumbent. The regulatory layer is the only part of this topic
 * that compounds: every state that flips is a fresh reason to be cited, and a
 * standing source beats a one-off article. This script is what turns that from
 * an intention into a routine.
 *
 * PDFs are fetched and hashed as bytes rather than text — pypdf is not
 * available to node, and a byte change on a regulator's PDF is worth a look
 * regardless of whether the text moved.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASELINE = path.join(__dirname, '.state_board_baseline.json');
const SAVE = process.argv.includes('--save');
const SHOW = process.argv.includes('--show');

/**
 * Every source the matrix and the two guide pages cite, with the figures we
 * published from it. `expect` strings are matched case-insensitively against
 * the extracted text; a missing one means our page may now be wrong.
 */
const SOURCES = [
  {
    id: 'tx-distance-responsibilities',
    state: 'Texas',
    label: 'TDLR — School Distance Education Responsibilities',
    url: 'https://www.tdlr.texas.gov/barbering-and-cosmetology/schools/distance-education-responsibilities.htm',
    expect: ['distance education', 'practical portion'],
  },
  {
    id: 'tx-barber-course-app',
    state: 'Texas',
    label: 'TDLR — Class A Barber course application',
    url: 'https://www.tdlr.texas.gov/barbering-and-cosmetology/pdf/Class-A-Barber-Course-Application-BAC-EE-132-E.pdf',
    binary: true,
  },
  {
    id: 'tx-cosmo-course-app',
    state: 'Texas',
    label: 'TDLR — Cosmetology Operator course application',
    url: 'https://www.tdlr.texas.gov/barbering-and-cosmetology/pdf/Cosmetology-Operator-Course-Application-BAC-EE-104-E.pdf',
    binary: true,
  },
  {
    id: 'al-rule-changes',
    state: 'Alabama',
    label: 'Alabama Board of Cosmetology — rule changes',
    url: 'https://www.aboc.alabama.gov/news/rule-changes-effective-may-15-2026',
    expect: ['50%', 'distance learning'],
  },
  {
    id: 'pa-cte',
    state: 'Pennsylvania',
    label: 'PA Dept. of State — CTE cosmetology/barber',
    url: 'https://www.pa.gov/agencies/dos/department-and-offices/bpoa/boards-commissions/cosmetology/cte-cosmetology-barber1',
    expect: ['650'],
  },
  {
    id: 'ca-act-regs',
    state: 'California',
    label: 'CA Board — Act & Regulations',
    url: 'https://www.barbercosmo.ca.gov/laws_regs/act_regs.pdf',
    binary: true,
    // California's row asserts an ABSENCE. If this PDF changes at all, the
    // "no distance education provision" claim needs re-checking by hand.
    absenceClaim: true,
  },
  {
    id: 'naccas-vi-02',
    state: '—',
    label: 'NACCAS Policy VI.02 — Distance Education',
    url: 'http://elibrary.naccas.org/InfoRouter/docs/Public/NACCAS%20Handbook/Policies%20III.01-IX.02/Policy%20VI.02.pdf',
    binary: true,
  },
];

/** Strip markup and furniture so the hash tracks readable content only. */
function readableText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);

/**
 * State board hosts are flaky — NACCAS's elibrary refused a connection once
 * mid-development and served fine a minute later. A single blip reported as
 * UNREACHABLE is a false alarm, and false alarms are what train people to stop
 * reading the output. Three attempts with backoff before believing it.
 */
async function fetchWithRetry(url, attempts = 3) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(url, { redirect: 'follow' });
    } catch (e) {
      last = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw last;
}

async function probe(src) {
  const res = await fetchWithRetry(src.url);
  if (!res.ok) return { id: src.id, error: `HTTP ${res.status}` };
  if (src.binary) {
    const buf = Buffer.from(await res.arrayBuffer());
    return { id: src.id, hash: sha(buf), bytes: buf.length };
  }
  const text = readableText(await res.text());
  const missing = (src.expect || []).filter((e) => !text.toLowerCase().includes(e.toLowerCase()));
  return { id: src.id, hash: sha(text), chars: text.length, missing };
}

async function run() {
  const prior = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : null;

  if (SHOW) {
    if (!prior) { console.log('No baseline stored. Run with --save first.'); return; }
    console.log(`Baseline recorded ${prior.recordedAt}\n`);
    for (const s of SOURCES) {
      const p = prior.sources[s.id];
      console.log(`  ${s.state.padEnd(14)} ${p ? p.hash : '(none)'}  ${s.label}`);
    }
    return;
  }

  console.log(`Checking ${SOURCES.length} regulator sources...\n`);
  const results = {};
  const changed = [];
  const broken = [];
  const lostFigures = [];

  for (const src of SOURCES) {
    let r;
    try {
      r = await probe(src);
    } catch (e) {
      r = { id: src.id, error: e.message };
    }
    results[src.id] = r;

    if (r.error) {
      broken.push({ src, why: r.error });
      console.log(`  UNREACHABLE  ${src.state.padEnd(14)} ${src.label}  (${r.error})`);
      continue;
    }
    if (r.missing && r.missing.length) {
      lostFigures.push({ src, missing: r.missing });
    }
    const before = prior?.sources?.[src.id]?.hash;
    if (!prior) {
      console.log(`  baseline     ${src.state.padEnd(14)} ${r.hash}  ${src.label}`);
    } else if (!before) {
      console.log(`  NEW SOURCE   ${src.state.padEnd(14)} ${r.hash}  ${src.label}`);
    } else if (before !== r.hash) {
      changed.push({ src, before, after: r.hash });
      console.log(`  CHANGED      ${src.state.padEnd(14)} ${before} -> ${r.hash}  ${src.label}`);
    } else {
      console.log(`  unchanged    ${src.state.padEnd(14)} ${r.hash}  ${src.label}`);
    }
  }

  if (lostFigures.length) {
    console.log('\n  !! FIGURES WE PUBLISHED ARE NO LONGER ON THE SOURCE PAGE');
    for (const l of lostFigures)
      console.log(`     ${l.src.label}\n       missing: ${l.missing.join(', ')}`);
    console.log('     Re-read the page by hand before trusting the published figure.');
  }

  if (changed.length) {
    console.log('\n  === CHANGED SOURCES NEED A HUMAN READ ===');
    for (const c of changed) {
      console.log(`     ${c.src.state} — ${c.src.label}`);
      console.log(`       ${c.src.url}`);
      if (c.src.absenceClaim)
        console.log(`       NOTE: our published claim for this state is an ABSENCE ("no distance education provision").`);
      console.log(`       If the rule moved, update lib/distance-education-states.ts and add a RULE_CHANGES entry.`);
    }
  }

  if (broken.length) {
    console.log('\n  === UNREACHABLE ===');
    for (const b of broken) console.log(`     ${b.src.label} — ${b.why}\n       ${b.src.url}`);
    console.log('     A moved URL is its own kind of drift — a broken citation on a public page.');
  }

  if (prior && !changed.length && !broken.length && !lostFigures.length) {
    console.log(`\n  Nothing moved since ${prior.recordedAt}.`);
  }

  if (SAVE || !prior) {
    fs.writeFileSync(
      BASELINE,
      JSON.stringify({ recordedAt: new Date().toISOString().slice(0, 10), sources: results }, null, 2)
    );
    console.log(`\n  Baseline written to ${BASELINE}`);
  } else if (changed.length) {
    console.log('\n  Baseline NOT updated — re-run with --save once the changes have been read and the pages updated.');
  }
}

run().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
