// Deduplication Agent — scans the 6 live entity tables for rows sharing the
// same phone number, both within a single table and across tables, and
// prints a terminal report. Read-only: it never writes to the database or
// to agent_directives — this is a diagnostic, not a pipeline step (see
// SEO_AGENT_STRATEGY.md). A human decides what, if anything, to do with a
// finding.
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// nameField mirrors the same per-table quirk documented in
// auto_publish_audited_entities.js / update-status/route.ts — duplicated
// here rather than imported, per this codebase's established convention.
const TABLE_CONFIG = {
  agent_barbershop_leads: { nameField: 'shop_name', label: 'barbershop' },
  agent_salon_leads: { nameField: 'shop_name', label: 'salon' },
  agent_barber_school_leads: { nameField: 'school_name', label: 'barber school' },
  agent_cosmetology_school_leads: { nameField: 'school_name', label: 'cosmetology/beauty school' },
  agent_barber_supply_store_leads: { nameField: 'name', label: 'barber supply store' },
  agent_beauty_supply_store_leads: { nameField: 'name', label: 'beauty/hair supply store' },
};
const TABLES = Object.keys(TABLE_CONFIG);
const PAGE_SIZE = 1000; // Supabase/PostgREST default row cap — must paginate past it, not just raise a .limit()

function normalizePhone(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  return digits.length === 10 ? digits : null;
}

function formatPhone(digits) {
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// Loose overlap check, not a real similarity score — good enough to tell
// "Fresh Cuts Barbershop" vs "Fresh Cuts Barber Shop" apart from "Fresh
// Cuts Nail Bar" without pulling in a fuzzy-match dependency for a
// terminal report.
function namesLookSimilar(a, b) {
  const words = (s) => new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 2));
  const wa = words(a);
  const wb = words(b);
  if (wa.size === 0 || wb.size === 0) return false;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared / Math.min(wa.size, wb.size) >= 0.5;
}

// Strict equality (not fuzzy like namesLookSimilar above), for --exact
// mode — the highest-confidence tier: same phone (already guaranteed by
// grouping), same name, same city, exactly. This is the bucket safe enough
// to consider staging for a quick human approve/deny later, since a false
// positive here is much less likely than in the looser same-table
// classification below.
function normalizeCity(city) {
  return city ? city.toLowerCase().trim() : '';
}
function isExactMatch(entries) {
  const names = new Set(entries.map((e) => normalizeForName(e.name)));
  const cities = new Set(entries.map((e) => normalizeCity(e.city)));
  return names.size === 1 && cities.size === 1 && [...cities][0] !== '';
}
function normalizeForName(name) {
  return name ? name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() : '';
}

// Strips the formatting noise real scraped addresses vary on ("STE" vs
// "Ste", trailing ", USA" present or not) without trying to be a real
// address parser — good enough to tell "1718 Fry Rd STE 335, Houston, TX
// 77084" and "1718 Fry Rd Ste 335, Houston, TX 77084, USA" apart as the
// SAME address, which a naive lowercase-only compare would get wrong.
function normalizeAddress(address) {
  if (!address) return '';
  return address
    .toLowerCase()
    .replace(/,?\s*usa\.?$/i, '')
    .replace(/[.,#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Same-table + every entry a genuinely distinct street address (not just
// missing) — the real-world signal of a multi-location chain sharing one
// phone number (confirmed live: "Sola Salons," 5 real Houston addresses,
// 3 of them sharing one phone), not a duplicate scrape. Missing addresses
// don't count as "different" — can't confirm they're actually separate
// locations, so this stays conservative rather than assuming.
function allAddressesDiffer(entries) {
  const normalized = entries.map((e) => normalizeAddress(e.address));
  if (normalized.some((a) => !a)) return false;
  return new Set(normalized).size === entries.length;
}
function isMultiLocationSameTable(entries) {
  return isSameTable(entries) && allAddressesDiffer(entries);
}

async function fetchAllRows(table, nameField) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(`id, ${nameField}, city, phone, formatted_address`)
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error(`  ! Failed to read ${table}: ${error.message}`);
      break;
    }
    if (!data || data.length === 0) break;
    rows.push(...data.map((r) => ({ id: r.id, name: r[nameField], city: r.city, phone: r.phone, address: r.formatted_address })));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function buildPhoneIndex() {
  const index = new Map(); // normalizedPhone -> [{table, label, id, name, city, address, rawPhone}]
  let totalRows = 0;
  let rowsWithPhone = 0;

  for (const table of TABLES) {
    const { nameField, label } = TABLE_CONFIG[table];
    const rows = await fetchAllRows(table, nameField);
    totalRows += rows.length;
    for (const row of rows) {
      const normalized = normalizePhone(row.phone);
      if (!normalized) continue;
      rowsWithPhone++;
      if (!index.has(normalized)) index.set(normalized, []);
      index.get(normalized).push({ table, label, id: row.id, name: row.name, city: row.city, address: row.address, rawPhone: row.phone });
    }
  }

  return { index, totalRows, rowsWithPhone };
}

// Generic "this cross-table match is exactly this known-benign table pair"
// check, shared by the two real cases confirmed live below — a phone
// number showing up in exactly one of these pairs and no other table is a
// business that plausibly, legitimately operates in both categories at
// once, not a duplicate/miscategorization.
function isExactTablePair(entries, tablePair) {
  const distinctTables = new Set(entries.map((e) => e.table));
  if (distinctTables.size !== 2) return false;
  for (const t of distinctTables) if (!tablePair.has(t)) return false;
  return true;
}

// Confirmed live: the large majority of real cross-table exact matches
// were exactly this pair (e.g. "Williams Barber College" identically in
// both) — a school running both a barber and a cosmetology program under
// the same roof/phone line.
const DUAL_SCHOOL_TABLES = new Set(['agent_barber_school_leads', 'agent_cosmetology_school_leads']);
function isDualLicensedSchoolPair(entries) {
  return isExactTablePair(entries, DUAL_SCHOOL_TABLES);
}

// Confirmed live: dozens of real, identical name+address pairs (e.g.
// "Uptown Beauty Supply #6," "H Beauty Supply - Katy") appearing in both —
// a supply store stocking both barber and beauty/hair products, not a
// miscategorization.
const DUAL_SUPPLY_STORE_TABLES = new Set(['agent_barber_supply_store_leads', 'agent_beauty_supply_store_leads']);
function isDualSupplyStorePair(entries) {
  return isExactTablePair(entries, DUAL_SUPPLY_STORE_TABLES);
}

function classifyGroup(entries) {
  const distinctTables = new Set(entries.map((e) => e.table));
  if (distinctTables.size === 1) {
    // Checked before name/city similarity — a genuinely distinct street
    // address on every row is a stronger, more direct signal of "real
    // separate locations" than name or city sameness is a signal of
    // "duplicate" (a real chain like "Sola Salons" has both an identical
    // name AND the same city across locations).
    if (allAddressesDiffer(entries)) {
      return 'Same phone number, same table, but every location has a different street address — likely a real multi-location business, not a duplicate. No action needed.';
    }
    const allSimilarNames = entries.every((a, i) =>
      entries.every((b, j) => i === j || namesLookSimilar(a.name, b.name))
    );
    const allSameCity = entries.every((e) => e.city && e.city === entries[0].city);
    if (allSimilarNames && allSameCity) {
      return 'Likely a duplicate scrape of the same business — same table, same city, similar names.';
    }
    if (allSameCity) {
      return 'Same phone number, same table, same city, but the names differ meaningfully — worth a manual look (could still be a duplicate under a different DBA, or a shared front-desk number).';
    }
    return 'Same phone number reused across different cities within the same table — could be a chain/franchise sharing one central number, or a data error.';
  }
  if (isDualLicensedSchoolPair(entries)) {
    return 'Same phone number in both the barber school and cosmetology school tables — almost certainly one dual-licensed school offering both programs, not a duplicate. No action needed.';
  }
  if (isDualSupplyStorePair(entries)) {
    return 'Same phone number in both the barber supply store and beauty supply store tables — almost certainly one store carrying both product lines, not a duplicate. No action needed.';
  }
  return `Cross-table match (${[...distinctTables].join(', ')}) — could be a business that legitimately spans categories (e.g. a barbershop that also sells supplies), a miscategorized listing, or a shared phone number (shopping center front desk, franchise HQ).`;
}

const MODE_LABELS = {
  all: null,
  exact: 'exact name + city + phone match',
  'exact-same-table': 'exact match, same table only',
  'exact-cross-table': 'exact match, across tables only',
};

function isSameTable(entries) {
  return new Set(entries.map((e) => e.table)).size === 1;
}

// One filter per mode — kept as separate named predicates (rather than one
// combined boolean) so --exact-same-table and --exact-cross-table are each
// their own real, independently-testable feature, not a shared flag with
// extra branching. exact-cross-table excludes both known-benign table
// pairs (dual-licensed schools, dual barber/beauty supply stores), and
// both exact/exact-same-table exclude real multi-location businesses (see
// isMultiLocationSameTable) — that mode family's whole point is surfacing
// matches that need a human decision, and none of those do.
function isKnownBenignCrossTablePair(entries) {
  return isDualLicensedSchoolPair(entries) || isDualSupplyStorePair(entries);
}
// Same three "explained, no action needed" cases classifyGroup() labels as
// benign, combined into one check — this is what the default report now
// excludes entirely, on the same reasoning as the --exact* modes: once a
// group has a confident, real-world explanation, it doesn't belong in a
// report meant to surface things that need a look.
function isKnownBenignGroup(entries) {
  return isKnownBenignCrossTablePair(entries) || isMultiLocationSameTable(entries);
}
const MODE_FILTERS = {
  all: (entries) => !isKnownBenignGroup(entries),
  exact: (entries) => isExactMatch(entries) && !isMultiLocationSameTable(entries),
  'exact-same-table': (entries) => isExactMatch(entries) && isSameTable(entries) && !isMultiLocationSameTable(entries),
  'exact-cross-table': (entries) => isExactMatch(entries) && !isSameTable(entries) && !isKnownBenignCrossTablePair(entries),
};

function printReport(index, totalRows, rowsWithPhone, { mode = 'all' } = {}) {
  let groups = [...index.entries()].filter(([, entries]) => entries.length > 1);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Deduplication Agent — ${new Date().toISOString()}${MODE_LABELS[mode] ? ` (--${mode})` : ''}`);
  console.log('='.repeat(70));
  console.log(`Scanned ${TABLES.length} tables, ${totalRows} rows, ${rowsWithPhone} with a usable phone number.`);

  groups = groups.filter(([, entries]) => MODE_FILTERS[mode](entries));

  if (mode === 'all') {
    const sameTableOnly = groups.filter(([, e]) => isSameTable(e));
    const crossTable = groups.filter(([, e]) => !isSameTable(e));
    const excludedBenign = [...index.entries()].filter(
      ([, entries]) => entries.length > 1 && isKnownBenignGroup(entries)
    ).length;
    console.log(
      `Found ${groups.length} duplicate phone groups: ${sameTableOnly.length} same-table, ${crossTable.length} cross-table.` +
        (excludedBenign > 0
          ? ` (${excludedBenign} further group(s) excluded as expected dual-licensed schools, dual supply stores, or real multi-location businesses.)\n`
          : '\n')
    );
  } else if (mode === 'exact-cross-table') {
    const excludedGroups = [...index.entries()].filter(
      ([, entries]) => entries.length > 1 && isExactMatch(entries) && !isSameTable(entries) && isKnownBenignCrossTablePair(entries)
    );
    const excludedSchool = excludedGroups.filter(([, e]) => isDualLicensedSchoolPair(e)).length;
    const excludedSupplyStore = excludedGroups.filter(([, e]) => isDualSupplyStorePair(e)).length;
    const excludedParts = [
      excludedSchool > 0 ? `${excludedSchool} dual-licensed school` : null,
      excludedSupplyStore > 0 ? `${excludedSupplyStore} dual barber/beauty supply store` : null,
    ].filter(Boolean);
    console.log(
      `Found ${groups.length} duplicate group(s) with ${MODE_LABELS[mode]}` +
        (excludedParts.length > 0
          ? ` (${excludedGroups.length} further exact cross-table match(es) excluded as expected listings — ${excludedParts.join(', ')} — see --exact if you want those too).\n`
          : '.\n')
    );
  } else if (mode === 'exact' || mode === 'exact-same-table') {
    const excludedMultiLocation = [...index.entries()].filter(
      ([, entries]) => entries.length > 1 && isExactMatch(entries) && isMultiLocationSameTable(entries)
    ).length;
    console.log(
      `Found ${groups.length} duplicate group(s) with ${MODE_LABELS[mode]}` +
        (excludedMultiLocation > 0
          ? ` (${excludedMultiLocation} further match(es) excluded as likely real multi-location businesses — every entry has a different street address).\n`
          : '.\n')
    );
  } else {
    console.log(`Found ${groups.length} duplicate group(s) with ${MODE_LABELS[mode]}.\n`);
  }

  if (groups.length === 0) {
    console.log('Nothing to report.\n');
    return;
  }

  const exact = mode !== 'all';
  groups
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([phone, entries], i) => {
      console.log(`${i + 1}. ${formatPhone(phone)} — ${entries.length} matches`);
      for (const e of entries) {
        console.log(`     [${e.table}] "${e.name}" — ${e.address || e.city || 'no address'}  (id: ${e.id})`);
      }
      if (!exact) console.log(`     -> ${classifyGroup(entries)}`);
      console.log('');
    });
}

async function runScan(options) {
  const { index, totalRows, rowsWithPhone } = await buildPhoneIndex();
  printReport(index, totalRows, rowsWithPhone, options);
}

const ONE_SHOT = process.argv.includes('--once');
// --exact-same-table / --exact-cross-table take precedence over the
// broader --exact if more than one is passed by mistake.
const MODE = process.argv.includes('--exact-same-table')
  ? 'exact-same-table'
  : process.argv.includes('--exact-cross-table')
  ? 'exact-cross-table'
  : process.argv.includes('--exact')
  ? 'exact'
  : 'all';
const WATCH_POLL_MS = 15 * 60 * 1000; // cheap read-only queries, no Puppeteer — 15 min is just to avoid needless hammering, not a rate limit
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  await runScan({ mode: MODE });
}

async function runWatch() {
  console.log(
    `Deduplication Agent — watch mode${MODE !== 'all' ? ` (--${MODE})` : ''}, rescanning every ${WATCH_POLL_MS / 60000} min. Ctrl+C to stop.`
  );
  while (true) {
    await runScan({ mode: MODE });
    await sleep(WATCH_POLL_MS);
  }
}

if (require.main === module) {
  const entry = ONE_SHOT ? run() : runWatch();
  entry.catch((err) => {
    console.error('Deduplication Agent failed:', err);
    process.exit(1);
  });
}

module.exports = {
  normalizePhone, namesLookSimilar, classifyGroup, isExactMatch, isSameTable,
  isDualLicensedSchoolPair, isDualSupplyStorePair, allAddressesDiffer, isMultiLocationSameTable,
  isKnownBenignGroup, buildPhoneIndex, TABLE_CONFIG,
};
