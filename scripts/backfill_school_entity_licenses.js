/**
 * Write TDLR licence facts onto the school entity rows.
 *
 * Usage:
 *   node scripts/backfill_school_entity_licenses.js            # DRY RUN
 *   node scripts/backfill_school_entity_licenses.js --commit   # apply
 *   node scripts/backfill_school_entity_licenses.js --changes  # show what would change on rows that already have a number
 *
 * SCOPE — the three COSMETOLOGY school licence types, ACTIVE only.
 *
 * Barber School is excluded on purpose. Texas merged the barber and cosmetology
 * boards; all 132 Barber School licences are expired, 90 of them on 12/01/2025.
 * They no longer resolve in TDLR's active licence search, so writing one would
 * put a number on a public page that fails the first time anyone checks it.
 * Schools that still teach barbering hold a cosmetology licence now — 131 of the
 * Cosmetology Private School licences match a school in the BARBER entity table,
 * so both tables are populated from the same cosmetology source.
 *
 * MATCHING. Normalised name AND city AND leading street number, all three.
 *
 * WHY THE STREET NUMBER IS NOT OPTIONAL. A first version matched on name and
 * only consulted the city when the name was ambiguous. Because ambiguity was
 * counted among ACTIVE licences only, a multi-campus school with one active
 * licence looked unambiguous — and every campus sharing that name was assigned
 * the one active number. It proposed giving Avenue Five's Ben White campus the
 * licence for its Burnet Road campus, Career Schools of Texas' Houston campus
 * the licence for Dallas, and Collectiv Academy's Fort Worth campus the licence
 * for Dallas. Four of five proposed changes to already-stored numbers were
 * wrong. City alone would not have caught Avenue Five: both campuses are in
 * Austin. Only the street number separates them.
 *
 * No fuzzy matching anywhere. A fuzzy matcher over same-trade names in the same
 * city produces confident nonsense, and a licence number on the wrong school is
 * worse than a null.
 *
 * ADDRESS. The business address, per instruction — a storefront rather than the
 * mailing address, which can be a PO box or the owner's home. The lake's
 * promoted columns already prefer business over mailing and record which in
 * address_source; this filters to licence rows carrying a business address
 * where one exists.
 *
 * PHONE. business_telephone, falling back to owner_telephone. Same principle:
 * the number the state has for the business, not for whoever owns it.
 */
require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");

const COMMIT = process.argv.includes("--commit");
const SHOW_CHANGES = process.argv.includes("--changes");

const SCHOOL_TYPES = `('Cosmetology Private School','Cosmetology Vocational/High School','Cosmetology Junior College')`;

const NORM = (c) =>
  `btrim(regexp_replace(regexp_replace(regexp_replace(upper(${c}),'&',' AND ','g'),'[^A-Z0-9 ]',' ','g'),'\\s+',' ','g'))`;
const CLEAN = (c) =>
  `btrim(regexp_replace(regexp_replace(${NORM(c)},'\\m(LLC|L L C|INC|INCORPORATED|CO|CORP|LTD|LP|LLP|PLLC|THE|OF)\\M',' ','g'),'\\s+',' ','g'))`;
/** Leading house number — the only thing that separates two campuses on one street name. */
const STREETNO = (c) => `(regexp_match(btrim(${c}), '^([0-9]+)'))[1]`;

const DDL = `
alter table public.agent_cosmetology_school_leads
  add column if not exists license_street_address text,
  add column if not exists license_city           text,
  add column if not exists license_state          text,
  add column if not exists license_county         text,
  add column if not exists license_phone_number   text;
alter table public.agent_barber_school_leads
  add column if not exists license_number         text,
  add column if not exists license_street_address text,
  add column if not exists license_city           text,
  add column if not exists license_state          text,
  add column if not exists license_county         text,
  add column if not exists license_phone_number   text;
`;

/**
 * One row per ACTIVE cosmetology-school licence, deduped across the two source
 * datasets. `distinct on` orders business-address rows first so the surviving
 * row is the one carrying a storefront address rather than a mailing one.
 */
const LICENCES = `
  select distinct on (license_number)
    license_number,
    license_type,
    business_name,
    street_address,
    city  as lic_city,
    state as lic_state,
    county as lic_county,
    coalesce(nullif(btrim(raw->>'business_telephone'),''), nullif(btrim(raw->>'owner_telephone'),'')) as phone,
    ${CLEAN("business_name")} as nname,
    upper(btrim(city)) as ncity,
    ${STREETNO("street_address")} as nstreet
  from public.tdlr_licensees_raw
  where license_type in ${SCHOOL_TYPES}
    and license_expiration_date_mmddccyy ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$'
    and to_date(license_expiration_date_mmddccyy,'MM/DD/YYYY') >= current_date
  order by license_number,
           (address_source = 'business') desc nulls last,
           source_dataset
`;

/** Entities of one table, joined to at most one licence. */
function matchSql(table) {
  return `
  with lic as (${LICENCES}),
  ent as (
    select id, slug, school_name, ${CLEAN("school_name")} as nname,
      upper(btrim(city)) as ncity,
      ${STREETNO("formatted_address")} as nstreet
    from public.${table}
  ),
  cand as (
    -- Name + city always. The street number is required whenever BOTH sides
    -- have one; a school with no parseable house number on either side falls
    -- back to name+city rather than being dropped.
    select e.id, l.license_number,
      (e.nstreet is not null and l.nstreet is not null and e.nstreet = l.nstreet) as street_ok,
      (e.nstreet is null or l.nstreet is null) as street_unknown
    from ent e join lic l on l.nname = e.nname and l.ncity = e.ncity
  ),
  filtered as (
    select id, license_number from cand where street_ok or street_unknown
  ),
  resolved as (
    select e.id, e.slug, e.school_name,
      case when (select count(*) from filtered f where f.id = e.id) = 1
           then (select f.license_number from filtered f where f.id = e.id limit 1) end as license_number,
      case
        when (select count(*) from filtered f where f.id = e.id) = 1 then 'matched'
        when (select count(*) from filtered f where f.id = e.id) > 1 then 'ambiguous'
        else 'no-match'
      end as how
    from ent e
  )
  select r.id, r.slug, r.school_name, r.how,
         l.license_number, l.license_type, l.business_name,
         l.street_address, l.lic_city, l.lic_state, l.lic_county, l.phone
  from resolved r
  left join lic l on l.license_number = r.license_number
  `;
}

async function main() {
  if (!process.env.SUPABASE_DB_PASSWORD) {
    console.error("SUPABASE_DB_PASSWORD is not set in .env.local");
    process.exit(1);
  }
  const c = new Client({
    host: "db.senkwhdxgtypcrtoggyf.supabase.co",
    port: 5432, user: "postgres",
    password: process.env.SUPABASE_DB_PASSWORD,
    database: "postgres", ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  try {
    if (COMMIT) { await c.query(DDL); console.log("columns ensured\n"); }
    else console.log("DRY RUN — pass --commit to apply\n");

    for (const table of ["agent_cosmetology_school_leads", "agent_barber_school_leads"]) {
      const { rows } = await c.query(matchSql(table));
      const hit = rows.filter((r) => r.license_number);
      const by = (k) => rows.filter((r) => r.how === k).length;
      console.log(`  ${table}`);
      console.log(`    rows: ${rows.length}`);
      console.log(`    matched: ${hit.length}`);
      console.log(`    ambiguous: ${by("ambiguous")}   no active licence: ${by("no-match")}`);
      const withAddr = hit.filter((r) => r.street_address).length;
      const withPhone = hit.filter((r) => r.phone).length;
      console.log(`    of matched — address ${withAddr}, phone ${withPhone}`);

      if (SHOW_CHANGES && table === "agent_cosmetology_school_leads") {
        const chg = await c.query(`
          with m as (${matchSql(table)})
          select e.school_name, e.license_number as stored, m.license_number as tdlr
          from public.${table} e join m on m.id = e.id
          where e.license_number is not null and m.license_number is not null
            and e.license_number <> m.license_number`);
        console.log(`    stored numbers TDLR disagrees with: ${chg.rows.length}`);
        chg.rows.forEach((r) => console.log(`      ${r.school_name}: ${r.stored} -> ${r.tdlr}`));
      }

      if (COMMIT) {
        const res = await c.query(`
          with m as (${matchSql(table)})
          update public.${table} e
          set license_number         = m.license_number,
              license_street_address = m.street_address,
              license_city           = m.lic_city,
              license_state          = m.lic_state,
              license_county         = m.lic_county,
              license_phone_number   = m.phone
          from m
          where m.id = e.id and m.license_number is not null`);
        console.log(`    WROTE ${res.rowCount} rows`);
      }
      console.log("");
    }

    if (COMMIT) {
      for (const t of ["agent_cosmetology_school_leads", "agent_barber_school_leads"]) {
        await c.query(`create index if not exists idx_${t === "agent_cosmetology_school_leads" ? "cos" : "barber"}_school_license_number on public.${t} (license_number)`);
      }
      console.log("indexes ensured");
    } else {
      console.log("Re-run with --commit to write.");
    }
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
