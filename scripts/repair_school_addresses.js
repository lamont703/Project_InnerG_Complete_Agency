#!/usr/bin/env node
/**
 * Repair school listings whose address cannot be routed to, using TDLR.
 *
 * THE PROBLEM. 34 of 1,185 school listings have no usable street address. 19 are
 * school DISTRICTS rather than campuses ("Joshua Independent School District,
 * TX, USA"), 6 are a bare city ("Klein, TX 77379"), 6 are a street with no
 * number ("Bellfort Ave, Houston"), and 3 are not US addresses at all — two
 * scraped Google ad cards named "Sponsored" and one in Ambedkar Nagar, India.
 *
 * WHY REPAIR RATHER THAN DELETE. These pages have traffic: 67 events from ~18
 * visitors, and Joshua ISD alone drew 6 separate people, which is above the
 * average school page. That is real demand — "does my district have a
 * cosmetology program?" — and deleting the page destroys the answer along with
 * the defect. TDLR holds a licence for most of them WITH a street address, so
 * the fix is to take it.
 *
 * MATCHED ON NAME AND PLACE, NEVER ON NAME ALONE. A loose word-overlap pass
 * matched "R S Institute" to "CAREER & TECHNOLOGY INSTITUTE" and "Bridges
 * Beauty College" to "JB HENSLER COLLEGE & CAREER ACADEMY" — both purely on the
 * words "institute" and "college". So a candidate must agree on the DISTINCTIVE
 * part of the name (the place: JOSHUA, GORMAN, TULOSO-MIDWAY) after the generic
 * words are set aside, and the city must agree too.
 *
 * WHAT IT WILL NOT FIX. TDLR writes "COSMETOLOGY DEPARTMENT" as the street
 * address on 75 of its 257 vocational/high-school licences, so the state has no
 * better address than we do for those. They stay broken, stay noindexed by
 * lib/listing-address-quality.ts, and are reported here as a known gap rather
 * than silently skipped.
 *
 * COORDINATES ARE NOT TOUCHED. The existing lat/long came from Google and, for
 * a district, points at the boundary centroid — wrong, but wrong in a way that
 * is at least internally consistent. Writing a new street without re-geocoding
 * would put the pin and the address in different places, which is worse than
 * either alone. Re-geocode as a separate pass; the addresses have to be right
 * first.
 *
 * Usage:
 *   node scripts/repair_school_addresses.js            # dry run
 *   node scripts/repair_school_addresses.js --apply
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const { hasUsableStreetAddress } = require("../lib/listing-address-quality.ts");

const APPLY = process.argv.includes("--apply");
const SCHOOL_TYPES = [
  "Cosmetology Private School",
  "Cosmetology Vocational/High School",
  "Barber School",
  "Cosmetology Junior College",
];

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/** Words that appear in almost every school name and identify nothing. */
const GENERIC = new Set(["INDEPENDENT", "SCHOOL", "DISTRICT", "CONSOLIDATED", "ISD", "CISD",
  "HIGH", "COLLEGE", "ACADEMY", "INSTITUTE", "CENTER", "CENTRE", "BEAUTY", "BARBER",
  "COSMETOLOGY", "CAREER", "TECH", "TECHNOLOGY", "EDUCATION", "THE", "OF", "AND", "LLC", "INC"]);

const words = (n) => String(n || "").toUpperCase().replace(/[^A-Z0-9 ]/g, " ")
  .split(/\s+/).filter(Boolean);
/** The distinctive part: what is left once the generic words are set aside. */
const distinctive = (n) => words(n).filter((w) => !GENERIC.has(w) && w.length > 2);
const cityOf = (a) => (String(a || "").match(/,\s*([^,]+),\s*[A-Z]{2}\s*\d{5}/) || [])[1]?.trim().toUpperCase()
  || (String(a || "").match(/^([^,]+),\s*[A-Z]{2}\s*\d{5}/) || [])[1]?.trim().toUpperCase() || "";
/** For collapsing the same address written two ways across the two datasets. */
const normAddr = (a) => String(a || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const canonCity = (c) => String(c || "").toUpperCase().replace(/\bMT\b/g, "MOUNT").replace(/[^A-Z]/g, "");

async function page(table, cols, mod) {
  const out = []; let from = 0;
  for (;;) {
    let q = db.from(table).select(cols).range(from, from + 999);
    if (mod) q = mod(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data.length) break;
    out.push(...data); from += 1000;
    if (data.length < 1000) break;
  }
  return out;
}

(async () => {
  const rawTdlr = await page("tdlr_licensees_raw",
    "license_number,license_type,business_name,street_address,city,state,zip,county",
    (q) => q.in("license_type", SCHOOL_TYPES));

  // The lake carries two overlapping TDLR datasets, so license_number is NOT
  // unique — 1,992 rows for 1,095 licences. Keep the fuller street address.
  const best = new Map();
  for (const r of rawTdlr) {
    const k = String(r.license_number), cur = best.get(k);
    if (!cur || String(r.street_address || "").length > String(cur.street_address || "").length) best.set(k, r);
  }
  const tdlr = [...best.values()];

  const tables = ["agent_barber_school_leads", "agent_cosmetology_school_leads"];
  const rows = [];
  for (const t of tables) {
    rows.push(...(await page(t, "id,slug,school_name,city,formatted_address,license_number"))
      .map((r) => ({ ...r, _table: t })));
  }
  const broken = rows.filter((r) => !hasUsableStreetAddress(r.formatted_address));

  const repair = [], noSource = [], ambiguous = [];
  for (const e of broken) {
    const want = distinctive(e.school_name);
    if (!want.length) { noSource.push({ e, why: "name has no distinctive word" }); continue; }
    const eCity = canonCity(cityOf(e.formatted_address) || e.city);

    const cands = tdlr.filter((t) => {
      const have = distinctive(t.business_name);
      const haveSet = new Set(have);
      // Every distinctive word must be present...
      if (!want.every((w) => haveSet.has(w))) return false;
      /*
       * ...AND the licence must not carry EXTRA distinctive words, unless the
       * name is long enough for one to be noise.
       *
       * Containment alone is far too loose on short names. "Laredo College"
       * reduces to [LAREDO], which is contained in "LAREDO CHI ACADEMY BEAUTY
       * SCHOOL" — an entirely different school in the same city. Likewise
       * "Wharton County" was absorbed by "WHARTON COUNTY JUNIOR COLLEGE", whose
       * licence address is in Richmond. Requiring an exact set below three
       * distinctive words rejects both while still matching JOSHUA -> JOSHUA
       * ISD and TULOSO/MIDWAY -> TULOSO-MIDWAY HIGH SCHOOL.
       */
      const extra = have.filter((w) => !want.includes(w)).length;
      if (want.length < 3 && extra > 0) return false;
      if (extra > 1) return false;

      const tCity = canonCity(t.city);
      /*
       * A missing city is not disqualifying. Most district rows have no ZIP
       * ("Gorman Independent School District, TX, USA") so no city can be
       * parsed, and requiring one rejected every exact district match. The
       * exact-set rule above is what guards against the wrong school — it is
       * already what rejects "Wharton County" -> WHARTON COUNTY JUNIOR COLLEGE.
       * Where a city IS present on both sides it still has to agree.
       */
      if (!eCity || !tCity) return true;
      return eCity === tCity || eCity.includes(tCity) || tCity.includes(eCity);
    });

    if (!cands.length) { noSource.push({ e, why: "no TDLR licence with that name" }); continue; }
    const usable = cands.filter((c) => hasUsableStreetAddress(`${c.street_address}, ${c.city}, ${c.state} ${c.zip}`));
    if (!usable.length) {
      noSource.push({ e, why: `TDLR has it but with no address either ("${cands[0].street_address}")` });
      continue;
    }
    /*
     * The lake carries two overlapping TDLR datasets, so the same school can
     * appear under two licence numbers with the same name and address. That is
     * not an ambiguity — collapse it before deciding.
     */
    const distinct = [...new Map(usable.map((c) =>
      [`${distinctive(c.business_name).join(" ")}|${normAddr(c.street_address)}`, c])).values()];
    if (distinct.length > 1) { ambiguous.push({ e, cands: distinct }); continue; }
    repair.push({ e, t: distinct[0] });
  }

  console.log(`school listings with an unusable address: ${broken.length}`);
  console.log(`  repairable from TDLR : ${repair.length}`);
  console.log(`  ambiguous (>1 match) : ${ambiguous.length}`);
  console.log(`  no source            : ${noSource.length}`);

  if (!APPLY) {
    console.log("\n--- would repair ---");
    for (const x of repair)
      console.log(`  ${String(x.e.school_name).slice(0, 34).padEnd(36)} "${String(x.e.formatted_address).slice(0, 34)}"\n      -> ${x.t.street_address}, ${x.t.city}, ${x.t.state} ${x.t.zip}   [${x.t.business_name}]`);
    if (ambiguous.length) {
      console.log("\n--- ambiguous, left alone ---");
      for (const x of ambiguous)
        console.log(`  ${x.e.school_name} -> ${x.cands.map((c) => c.business_name).join(" | ")}`);
    }
    console.log("\n--- no source, staying noindexed ---");
    for (const x of noSource) console.log(`  ${String(x.e.school_name).slice(0, 40).padEnd(42)} ${x.why}`);
    console.log("\nDRY RUN. Re-run with --apply to write.");
    return;
  }

  let ok = 0; const failed = [];
  for (const x of repair) {
    const addr = `${x.t.street_address}, ${x.t.city}, ${x.t.state} ${x.t.zip}`.replace(/\s+,/g, ",").trim();
    const patch = {
      formatted_address: addr,
      city: x.t.city || x.e.city,
      // Coordinates deliberately untouched — see the header.
      license_number: x.e.license_number || String(x.t.license_number),
      license_street_address: x.t.street_address || null,
      license_city: x.t.city || null,
      license_state: x.t.state || "TX",
      license_county: x.t.county || null,
    };
    const { error } = await db.from(x.e._table).update(patch).eq("id", x.e.id);
    if (error) failed.push(`${x.e.slug}: ${error.message}`);
    else ok++;
  }
  console.log(`\nrepaired: ${ok}   failed: ${failed.length}`);
  for (const f of failed.slice(0, 10)) console.log("  " + f);
})().catch((e) => { console.error(e.message); process.exit(1); });
