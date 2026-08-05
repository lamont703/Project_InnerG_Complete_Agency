/**
 * Seed agent_texas_ce_provider_leads from the TDLR lake.
 *
 * Usage:
 *   node scripts/seed_ce_providers.js            # DRY RUN
 *   node scripts/seed_ce_providers.js --commit   # create the table and load
 *
 * Idempotent: upserts on license_number, so re-running after a new snapshot
 * refreshes expiry and address without duplicating rows.
 *
 * THE SLUG IS THE ONE IRREVERSIBLE DECISION HERE. Once a profile page is
 * indexed under a slug, changing it costs a redirect and some ranking — this
 * repo already carries 117 dead URLs from exactly that. So the slug is built
 * from name + city + a stable suffix derived from the LICENCE NUMBER rather
 * than from a row id: the licence number is TDLR's own stable key, survives a
 * reload of this table, and means the same provider gets the same URL forever.
 * The other entity tables use an 8-hex suffix off the row id, which is why
 * theirs move when rows are rebuilt.
 *
 * NAMES IN THIS DATASET ARE ADVERSARIAL. "0 0 ONLINE LICENSE RENEWALS",
 * "000ACE", "1 A ACADEMY" — engineered to sort first. Slugification strips the
 * punctuation but keeps the digits, because the name is the name; the fix for
 * alphabetical gaming is to rank by something else, not to rewrite what the
 * state has on file.
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const COMMIT = process.argv.includes("--commit");
const MIGRATION = path.join(__dirname, "..", "supabase", "migrations", "20260805120000_create_agent_texas_ce_provider_leads.sql");

/** name + city + licence number → a slug that never changes. */
function slugify(name, city, licenceNumber) {
  const s = (v) =>
    String(v || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  return [s(name), s(city), s(licenceNumber)].filter(Boolean).join("-").slice(0, 120);
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
    // One row per licence. distinct on prefers a row carrying a business
    // address, the same ordering the address promotion used.
    const { rows } = await c.query(`
      with lic as (
        select distinct on (license_number)
          license_number, business_name,
          raw->>'license_subtype' as license_subtype,
          license_expiration_date_mmddccyy as expires,
          street_address, address_unit, city, state, zip, county,
          raw->>'owner_name' as owner_name,
          nullif(btrim(raw->>'business_telephone'),'') as phone,
          nullif(btrim(raw->>'owner_telephone'),'')    as owner_phone,
          (raw->'business_mailing'->'coordinates'->>1)::double precision as lat,
          (raw->'business_mailing'->'coordinates'->>0)::double precision as lng,
          snapshot_date
        from public.tdlr_licensees_raw
        where license_type = 'Cosmetology CE Provider'
        order by license_number, (address_source = 'business') desc nulls last, source_dataset
      )
      select l.*,
        (select count(*) from lic x where x.street_address is not null
           and upper(btrim(x.street_address)) = upper(btrim(l.street_address))
           and upper(btrim(coalesce(x.city,''))) = upper(btrim(coalesce(l.city,''))))::int as address_provider_count
      from lic l order by business_name`);

    const today = new Date().toISOString().slice(0, 10);
    const parsed = rows.map((r) => {
      const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(r.expires || "").trim());
      const expiresIso = m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : null;
      return {
        ...r,
        expiresIso,
        isActive: expiresIso ? expiresIso >= today : null,
        slug: slugify(r.business_name, r.city, r.license_number),
        formatted: [r.street_address, r.address_unit, r.city, r.state && r.zip ? `${r.state} ${r.zip}` : r.state]
          .filter(Boolean).join(", "),
      };
    });

    const active = parsed.filter((p) => p.isActive).length;
    const shared = parsed.filter((p) => p.address_provider_count > 1).length;
    const dupSlugs = parsed.length - new Set(parsed.map((p) => p.slug)).size;

    console.log(`  ${parsed.length} CE provider licences`);
    console.log(`    active: ${active}   expired: ${parsed.length - active}`);
    console.log(`    with coordinates: ${parsed.filter((p) => p.lat != null).length}`);
    console.log(`    sharing a street address with another provider: ${shared}`);
    console.log(`    duplicate slugs: ${dupSlugs}${dupSlugs ? "  <-- MUST BE ZERO" : ""}`);
    console.log(`\n  sample slugs:`);
    for (const p of parsed.slice(0, 5)) console.log(`    ${p.slug}`);

    if (dupSlugs) {
      console.error("\n  ABORT: slugs are not unique. A duplicate slug means two providers would share a URL.");
      process.exit(1);
    }

    if (!COMMIT) {
      console.log(`\n  DRY RUN — re-run with --commit to create the table and load.`);
      return;
    }

    await c.query(fs.readFileSync(MIGRATION, "utf8"));
    console.log("\n  table ensured");

    let n = 0;
    for (const p of parsed) {
      await c.query(
        `insert into public.agent_texas_ce_provider_leads
          (slug, name, owner_name, license_number, license_type, license_subtype,
           license_expiration_date, is_active, street_address, address_unit, city, state, zip,
           county, formatted_address, latitude, longitude, phone, owner_phone,
           address_provider_count, source_snapshot_date)
         values ($1,$2,$3,$4,'Cosmetology CE Provider',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
         on conflict (license_number) do update set
           slug = excluded.slug, name = excluded.name, owner_name = excluded.owner_name,
           license_subtype = excluded.license_subtype,
           license_expiration_date = excluded.license_expiration_date,
           is_active = excluded.is_active, street_address = excluded.street_address,
           address_unit = excluded.address_unit, city = excluded.city, state = excluded.state,
           zip = excluded.zip, county = excluded.county, formatted_address = excluded.formatted_address,
           latitude = excluded.latitude, longitude = excluded.longitude,
           phone = excluded.phone, owner_phone = excluded.owner_phone,
           address_provider_count = excluded.address_provider_count,
           source_snapshot_date = excluded.source_snapshot_date,
           updated_at = now()`,
        [p.slug, p.business_name, p.owner_name, p.license_number, p.license_subtype,
         p.expiresIso, p.isActive, p.street_address, p.address_unit, p.city, p.state, p.zip,
         p.county, p.formatted, p.lat, p.lng, p.phone, p.owner_phone,
         p.address_provider_count, p.snapshot_date]
      );
      n++;
    }
    console.log(`  upserted ${n} rows`);

    const { rows: [v] } = await c.query(`
      select count(*)::int total,
             count(*) filter (where is_active)::int active,
             count(distinct city)::int cities,
             count(distinct county)::int counties,
             count(*) filter (where address_provider_count > 1)::int shared_address,
             count(latitude)::int with_coords
      from public.agent_texas_ce_provider_leads`);
    console.log(`\n  IN TABLE: ${v.total} rows, ${v.active} active, ${v.cities} cities, ${v.counties} counties`);
    console.log(`            ${v.shared_address} share an address, ${v.with_coords} have coordinates`);
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
