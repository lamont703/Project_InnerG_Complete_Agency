/**
 * Populate the promoted address columns on public.tdlr_licensees_raw from the
 * `raw` jsonb. Additive only — reads `raw`, writes the new columns, and never
 * modifies or deletes source data.
 *
 * Usage:
 *   node scripts/backfill_tdlr_addresses.js --sample   # parse 500 rows, write nothing
 *   node scripts/backfill_tdlr_addresses.js            # DRY RUN over everything
 *   node scripts/backfill_tdlr_addresses.js --commit   # apply
 *
 * Applies the DDL from
 * supabase/migrations/20260804120000_tdlr_promote_address_columns.sql
 * idempotently, so it works whether or not `supabase db push` has run.
 *
 * THE PARSE HAPPENS IN SQL, NOT HERE. 432k rows through node would be minutes
 * of round trips to do what Postgres does in one statement over the jsonb it
 * already has on disk. This script is the driver and the safety rail.
 *
 * TWO THINGS THE PARSER HAS TO GET RIGHT, both found by sampling the data
 * rather than assumed:
 *
 * 1. line1/line2 are swapped about half the time. In records carrying both,
 *    line1 was the suite and line2 the street in 20 of 38 sampled. Field order
 *    cannot be trusted, so the street is chosen by looking at the content.
 *    The pattern needs the plural forms and a bare '#': a first pass matched
 *    SUITE but not SUITES, and required a space after '#', which left
 *    "SUITES B1 & B2" and "#215M" sitting in street_address with the actual
 *    street in address_unit. A second pass then found "STE1605" and "STE104"
 *    — no space at all after the designator — and "ROOMS" plural. Hence the
 *    digit in the trailing class and the optional S on ROOM. Thirteen rows
 *    across three passes, but exactly the wrong thirteen: they are the ones a
 *    street join would silently miss while looking fully populated.
 *
 * 2. city_state_zip is one string — "MOUNT PLEASANT TX 75455". A non-greedy
 *    city capture handles multi-word cities. 99.9% of the sample parsed; the
 *    one failure was a malformed ZIP+4 ("...CA 92675-1"), so the +4 group is
 *    permissive and unused.
 *
 * Rows are batched by id so a stall leaves a partial, resumable backfill rather
 * than a rolled-back hour.
 */
require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");

const COMMIT = process.argv.includes("--commit");
const SAMPLE = process.argv.includes("--sample");
const BATCH = 25_000;

const DDL = `
alter table public.tdlr_licensees_raw
  add column if not exists street_address text,
  add column if not exists address_unit   text,
  add column if not exists city           text,
  add column if not exists state          text,
  add column if not exists zip            text,
  add column if not exists county         text,
  add column if not exists address_source text;
`;

const INDEXES = [
  `create index if not exists idx_tdlr_raw_city   on public.tdlr_licensees_raw (city)`,
  `create index if not exists idx_tdlr_raw_zip    on public.tdlr_licensees_raw (zip)`,
  `create index if not exists idx_tdlr_raw_county on public.tdlr_licensees_raw (county)`,
  `create index if not exists idx_tdlr_raw_type_city on public.tdlr_licensees_raw (license_type, city)`,
];

/**
 * The parse, as a CTE. Picks the address SET first (business or mailing) and
 * then takes every field from that set — coalescing field-by-field could pair a
 * business street with a mailing city and produce an address that exists
 * nowhere.
 */
const PARSE_CTE = `
  with src as (
    select
      id,
      case
        when nullif(btrim(raw->>'business_address_line1'), '') is not null then 'business'
        when nullif(btrim(raw->>'mailing_address_line1'),  '') is not null then 'mailing'
        else null
      end as address_source,
      nullif(btrim(raw->>'business_address_line1'), '') as b1,
      nullif(btrim(raw->>'business_address_line2'), '') as b2,
      nullif(btrim(raw->>'business_city_state_zip'), '') as bcsz,
      nullif(btrim(raw->>'business_county'), '')         as bcounty,
      nullif(btrim(raw->>'mailing_address_line1'), '')   as m1,
      nullif(btrim(raw->>'mailing_address_line2'), '')   as m2,
      nullif(btrim(raw->>'mailing_address_city_state_zip'), '') as mcsz,
      nullif(btrim(raw->>'mailing_address_county'), '')  as mcounty
    from public.tdlr_licensees_raw
    %WHERE%
  ),
  picked as (
    select
      id, address_source,
      case when address_source = 'business' then b1 else m1 end as l1,
      case when address_source = 'business' then b2 else m2 end as l2,
      case when address_source = 'business' then bcsz else mcsz end as csz,
      case when address_source = 'business' then bcounty else mcounty end as county
    from src
  ),
  split as (
    select
      id, address_source, county, csz,
      -- A line beginning with a unit designator is the unit, whichever field it
      -- arrived in. Only reorder when exactly one of the two looks like a unit;
      -- if both or neither do, field order is as good a guess as any.
      case
        when l1 is not null and l2 is not null
             and l1 ~* '^#|^(STE|SUITES?|APTS?|UNITS?|BLDG|RMS?|ROOMS?|FL|FLOOR)([[:space:].#0-9]|$)'
             and l2 !~* '^#|^(STE|SUITES?|APTS?|UNITS?|BLDG|RMS?|ROOMS?|FL|FLOOR)([[:space:].#0-9]|$)'
          then l2
        else coalesce(l1, l2)
      end as street_address,
      case
        when l1 is not null and l2 is not null
             and l1 ~* '^#|^(STE|SUITES?|APTS?|UNITS?|BLDG|RMS?|ROOMS?|FL|FLOOR)([[:space:].#0-9]|$)'
             and l2 !~* '^#|^(STE|SUITES?|APTS?|UNITS?|BLDG|RMS?|ROOMS?|FL|FLOOR)([[:space:].#0-9]|$)'
          then l1
        when l1 is not null and l2 is not null then l2
        else null
      end as address_unit
    from picked
  ),
  parsed as (
    select
      id, address_source, county, street_address, address_unit,
      regexp_match(upper(csz), '^(.+?)[[:space:]]+([A-Z]{2})[[:space:]]+([0-9]{5})') as m
    from split
  )
  select
    id, address_source, street_address, address_unit,
    (m)[1] as city, (m)[2] as state, (m)[3] as zip, county
  from parsed
`;

async function main() {
  if (!process.env.SUPABASE_DB_PASSWORD) {
    console.error("SUPABASE_DB_PASSWORD is not set in .env.local");
    process.exit(1);
  }
  const client = new Client({
    host: "db.senkwhdxgtypcrtoggyf.supabase.co",
    port: 5432,
    user: "postgres",
    password: process.env.SUPABASE_DB_PASSWORD,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    if (SAMPLE) {
      const sql = PARSE_CTE.replace("%WHERE%", "where raw is not null limit 500");
      const { rows } = await client.query(sql);
      const withAddr = rows.filter((r) => r.street_address);
      const withCity = rows.filter((r) => r.city);
      console.log(`Sampled ${rows.length} rows — nothing written.\n`);
      console.log(`  street_address parsed: ${withAddr.length}`);
      console.log(`  city/state/zip parsed: ${withCity.length}`);
      console.log(`  unparsed city_state_zip: ${withAddr.length - withCity.length}\n`);
      console.log("  first 12:");
      for (const r of rows.filter((r) => r.street_address).slice(0, 12)) {
        console.log(
          `    [${(r.address_source || "?").padEnd(8)}] ${(r.street_address || "").slice(0, 34).padEnd(34)} ${(r.address_unit || "").padEnd(10)} ${(r.city || "?").padEnd(18)} ${r.state || "??"} ${r.zip || "?????"}  ${r.county || ""}`
        );
      }
      return;
    }

    console.log(COMMIT ? "APPLYING\n" : "DRY RUN — pass --commit to apply\n");

    if (COMMIT) {
      await client.query(DDL);
      console.log("  columns ensured");
    }

    const { rows: [{ min, max, total }] } = await client.query(
      `select coalesce(min(id),0) as min, coalesce(max(id),0) as max, count(*)::int as total from public.tdlr_licensees_raw`
    );
    console.log(`  ${total} rows, id ${min}..${max}`);

    if (!COMMIT) {
      // Show what WOULD be written, without writing it.
      const sql = PARSE_CTE.replace("%WHERE%", "where raw is not null");
      const { rows } = await client.query(
        `select count(*)::int as n,
                count(street_address)::int as street,
                count(city)::int as city,
                count(zip)::int as zip,
                count(county)::int as county,
                count(*) filter (where address_source = 'business')::int as business,
                count(*) filter (where address_source = 'mailing')::int as mailing
         from (${sql}) q`
      );
      const r = rows[0];
      console.log(`\n  would populate:`);
      console.log(`    street_address: ${r.street}/${r.n}`);
      console.log(`    city:           ${r.city}/${r.n}`);
      console.log(`    zip:            ${r.zip}/${r.n}`);
      console.log(`    county:         ${r.county}/${r.n}`);
      console.log(`    source business/mailing: ${r.business} / ${r.mailing}`);
      console.log(`\n  Re-run with --commit to write.`);
      return;
    }

    let done = 0;
    for (let lo = Number(min); lo <= Number(max); lo += BATCH) {
      const hi = lo + BATCH - 1;
      const sql = PARSE_CTE.replace("%WHERE%", `where id between ${lo} and ${hi}`);
      const res = await client.query(`
        update public.tdlr_licensees_raw t
        set street_address = p.street_address,
            address_unit   = p.address_unit,
            city           = p.city,
            state          = p.state,
            zip            = p.zip,
            county         = p.county,
            address_source = p.address_source
        from (${sql}) p
        where t.id = p.id
      `);
      done += res.rowCount;
      process.stdout.write(`  updated ${done}/${total}\r`);
    }
    console.log(`  updated ${done}/${total}          `);

    for (const ix of INDEXES) await client.query(ix);
    console.log("  indexes ensured");

    const { rows } = await client.query(`
      select count(*)::int as n,
             count(street_address)::int as street,
             count(city)::int as city,
             count(zip)::int as zip,
             count(county)::int as county,
             count(*) filter (where address_source='business')::int as business,
             count(*) filter (where address_source='mailing')::int as mailing
      from public.tdlr_licensees_raw`);
    const r = rows[0];
    console.log(`\n  RESULT over ${r.n} rows:`);
    console.log(`    street_address: ${r.street}   city: ${r.city}   zip: ${r.zip}   county: ${r.county}`);
    console.log(`    source business/mailing: ${r.business} / ${r.mailing}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
