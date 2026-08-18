#!/usr/bin/env node
/**
 * Attach TDLR licence numbers to school listings, matched by street address.
 *
 * WHY THIS IS NEEDED. Of 995 Texas schools in the two school tables, 665 already
 * carried a licence number and 330 did not. Ninety-three of those can be matched
 * to a TDLR licence on street address alone. The licence number is the only
 * stable join between a listing and the state's own record of it — pass rates,
 * renewal dates and CE all hang off it.
 *
 * THE MATCH IS NAME-CONFIRMED, NOT ADDRESS-ONLY, and that distinction is the
 * whole reason this script is careful. 430 TDLR addresses host more than one
 * school licence: strip-mall suites, campuses sharing a building, and a PO box
 * in Houston shared by twelve high schools. An address-only match would have
 * given "South Texas Barber College" the licence belonging to "Impact Barber
 * Academy-South Texas" — they share a street address, and the first row won.
 * So every candidate at an address is RANKED by name similarity and only the
 * best is considered.
 *
 * NAME SIMILARITY KEEPS THE DOMAIN WORDS. An earlier pass stripped BARBER,
 * ACADEMY, SCHOOL and COLLEGE as noise, which are precisely the words these
 * names are made of; it scored "MICHAEL'S BARBER & HAIRSTYLISTS ACADEMY"
 * against "MICHAEL'S BARBER & HAIR STYLIST ACADEMY" at 0.40 and held back a
 * certain match. Only legal forms (LLC, INC) are stripped now.
 *
 * BELOW THE THRESHOLD IT WRITES NOTHING. Fourteen rows fall out, and they are
 * the interesting ones rather than the failures — rebrands (ITS Academy of
 * Beauty is now Milan Institute), chains where TDLR holds one legal name for
 * ten campuses (Ogle School), and at least one wrong address in our own data
 * (Bisd School Of Cosmetology is listed at TDLR's own Austin headquarters).
 * Those need a human, and a script that guessed at them would bury the finding.
 *
 * Usage:
 *   node scripts/backfill_school_license_numbers.js            # dry run
 *   node scripts/backfill_school_license_numbers.js --apply    # write
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const APPLY = process.argv.includes("--apply");
const MIN_NAME_SIMILARITY = 0.55;

const SCHOOL_TYPES = [
  "Cosmetology Private School",
  "Cosmetology Vocational/High School",
  "Barber School",
  "Cosmetology Junior College",
];

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── address normalisation ────────────────────────────────────────────────────
const SUFFIX = { STREET:"ST", AVENUE:"AVE", AV:"AVE", ROAD:"RD", BOULEVARD:"BLVD",
  DRIVE:"DR", HIGHWAY:"HWY", PARKWAY:"PKWY", PKY:"PKWY", LANE:"LN", FREEWAY:"FWY",
  EXPRESSWAY:"EXPY", EXPWY:"EXPY", CIRCLE:"CIR", COURT:"CT", PLACE:"PL", TRAIL:"TRL",
  NORTH:"N", SOUTH:"S", EAST:"E", WEST:"W", NORTHWEST:"NW", NORTHEAST:"NE",
  SOUTHWEST:"SW", SOUTHEAST:"SE", SAINT:"ST" };
// A unit designator AND the token after it are dropped: "STE 104" is not part of
// the street, and TDLR records it inconsistently.
const UNIT = new Set(["STE","SUITE","SUIT","APT","UNIT","BLDG","BUILDING","FL","FLOOR","RM","ROOM","#","NO","USA","US"]);

function normStreet(raw) {
  if (!raw) return "";
  const parts = String(raw).toUpperCase().replace(/[.,]/g, " ").replace(/#/g, " # ")
    .replace(/\s+/g, " ").trim().split(" ");
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].replace(/[^A-Z0-9]/g, "");
    if (!p) continue;
    if (UNIT.has(p)) { i++; continue; }
    out.push(SUFFIX[p] || p);
  }
  return out.join(" ");
}
const streetOf = (a) => (a ? String(a).split(",")[0] : "");
const zipOf = (a) => (String(a || "").match(/\b(\d{5})(?:-\d{4})?\b/) || [])[1] || "";
const stateOf = (a) => (String(a || "").match(/,\s*([A-Z]{2})\s*\d{5}/) || [])[1] || "";
const cityOf = (a) => { const p = String(a || "").split(","); return p.length >= 3 ? p[p.length - 3].trim().toUpperCase() : ""; };

// ── name similarity ──────────────────────────────────────────────────────────
const LEGAL = /\b(LLC|L L C|INC|INCORPORATED|CORP|CORPORATION|LTD|LP|PLLC|DBA|LC|L C)\b/g;
const norm = (n) => String(n || "").toUpperCase().replace(/&/g, " AND ")
  .replace(/[^A-Z0-9 ]/g, " ").replace(LEGAL, " ").replace(/\s+/g, " ").trim();
const toks = (n) => norm(n).split(" ").filter(Boolean);

function tokenJaccard(a, b) {
  const A = new Set(toks(a)), B = new Set(toks(b));
  if (!A.size || !B.size) return 0;
  let i = 0; for (const x of A) if (B.has(x)) i++;
  return i / (A.size + B.size - i);
}
function levRatio(a, b) {
  a = norm(a).replace(/ /g, ""); b = norm(b).replace(/ /g, "");
  if (!a.length || !b.length) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return 1 - prev[b.length] / Math.max(a.length, b.length);
}
// Containment catches campus suffixes and "#1" numbering, which neither token
// overlap nor edit distance handles well on its own.
const containment = (a, b) => { const A = norm(a), B = norm(b); return A && B && (A.includes(B) || B.includes(A)) ? 1 : 0; };
const similarity = (a, b) => Math.max(tokenJaccard(a, b), levRatio(a, b), containment(a, b));

async function page(table, cols, mod) {
  const out = []; let from = 0;
  for (;;) {
    let q = db.from(table).select(cols).range(from, from + 999);
    if (mod) q = mod(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data.length) break;
    out.push(...data);
    from += 1000;
    if (data.length < 1000) break;
  }
  return out;
}

(async () => {
  const tdlr = await page("tdlr_licensees_raw",
    "license_number,license_type,business_name,street_address,city,state,zip,county,owner_telephone",
    (q) => q.in("license_type", SCHOOL_TYPES));

  const tables = ["agent_barber_school_leads", "agent_cosmetology_school_leads"];
  const entities = [];
  for (const t of tables) {
    const rows = await page(t, "id,slug,school_name,formatted_address,city,license_number");
    entities.push(...rows.map((r) => ({ ...r, _table: t })));
  }

  const byKey = new Map();
  for (const t of tdlr) {
    const ns = normStreet(t.street_address);
    if (!ns) continue;
    for (const k of [t.zip ? `${ns}|${String(t.zip).slice(0, 5)}` : null,
                     t.city ? `${ns}|${t.city.toUpperCase()}` : null]) {
      if (!k) continue;
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(t);
    }
  }

  const apply = [], review = [];
  for (const e of entities) {
    if (e.license_number) continue;
    const st = stateOf(e.formatted_address);
    if (st && st !== "TX") continue;            // TDLR is Texas only
    const ns = normStreet(streetOf(e.formatted_address));
    if (!ns) continue;
    const pool = byKey.get(`${ns}|${zipOf(e.formatted_address)}`)
      || byKey.get(`${ns}|${cityOf(e.formatted_address) || String(e.city || "").toUpperCase()}`);
    if (!pool || !pool.length) continue;

    // Rank, never take the first. See the header.
    const ranked = pool.map((t) => ({ t, sc: similarity(e.school_name, t.business_name) }))
      .sort((a, b) => b.sc - a.sc);
    (ranked[0].sc >= MIN_NAME_SIMILARITY ? apply : review).push({ e, ...ranked[0] });
  }

  console.log(`TDLR school licences: ${tdlr.length}`);
  console.log(`entity schools missing a licence number: ${entities.filter((e) => !e.license_number).length}`);
  console.log(`address-matched: ${apply.length + review.length}  ->  apply ${apply.length}, review ${review.length}`);

  if (!APPLY) {
    console.log("\n--- would write (first 20) ---");
    for (const x of apply.slice(0, 20))
      console.log(`  ${x.sc.toFixed(2)}  ${String(x.e.school_name).slice(0, 40).padEnd(42)} -> ${x.t.license_number}  ${x.t.business_name}`);
    console.log("\n--- held back, needs a human ---");
    for (const x of review)
      console.log(`  ${x.sc.toFixed(2)}  ${String(x.e.school_name).slice(0, 46).padEnd(48)} -> ${x.t.business_name}`);
    console.log("\nDRY RUN. Re-run with --apply to write.");
    return;
  }

  let ok = 0; const failed = [];
  for (const x of apply) {
    const patch = {
      license_number: String(x.t.license_number),
      license_street_address: x.t.street_address || null,
      license_city: x.t.city || null,
      license_state: x.t.state || "TX",
      license_county: x.t.county || null,
      // Digits only, matching the rows that were populated before this script.
      license_phone_number: x.t.owner_telephone ? String(x.t.owner_telephone).replace(/\D/g, "") || null : null,
    };
    const { error } = await db.from(x.e._table).update(patch).eq("id", x.e.id);
    if (error) failed.push(`${x.e.slug}: ${error.message}`);
    else ok++;
  }
  console.log(`\nwritten: ${ok}   failed: ${failed.length}`);
  for (const f of failed.slice(0, 10)) console.log("  " + f);
})().catch((e) => { console.error(e.message); process.exit(1); });
