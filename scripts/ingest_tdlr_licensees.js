/**
 * Raw data-lake ingestion for TDLR (data.texas.gov) licensee datasets.
 * Lands the beauty/barber ecosystem verbatim into public.tdlr_licensees_raw
 * (schema-on-read: full record in `raw` jsonb + promoted key columns).
 *
 * Sources (Socrata SODA 2.1, public/unauthenticated with backoff):
 *   7358-krk7  "TDLR - All Licenses"        — beauty subset (license_type IN ...)
 *   9d9z-ebct  "TDLR COS Salons & Schools"  — owner_telephone + mailing address
 *
 * Idempotent: unique(source_dataset, license_number, snapshot_date) + DO NOTHING.
 * Usage: node scripts/ingest_tdlr_licensees.js
 */
require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");

// Beauty/barber-ecosystem license types (exact strings as stored in 7358-krk7).
const BEAUTY_TYPES = [
  // practitioners
  "Class A Barber",
  "Cosmetology Operator",
  "Cosmetology Esthetician",
  "Cosmetology Manicurist",
  "Cosmetology Manicurist/Esthetician",
  "Cosmetology Eyelash Extension Specialist",
  "Cosmetology Hair Weaving Specialist",
  "Cosmetology Hair Weaving Specialist/Esthetician",
  // establishments
  "Full Service Establishment",
  "Mini Establishment",
  "Mobile Establishment",
  "Esthetician Establishment",
  "Eyelash Extension Establishment",
  "Manicurist Establishment",
  "Manicurist/Esthetician Establishment",
  "Hair Weaving  Establishment", // note: stored with a double space
  "Hair Weaving Establishment", // safety variant (single space)
  // schools / education
  "Barber School",
  "Cosmetology Junior College",
  "Cosmetology Private School",
  "Cosmetology Vocational/High School",
  "Cosmetology CE Provider",
];

const SNAPSHOT_DATE = new Date().toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(datasetId, { limit, offset, where }) {
  const base = `https://data.texas.gov/resource/${datasetId}.json`;
  const params = new URLSearchParams({ $limit: String(limit), $offset: String(offset), $order: "license_number" });
  if (where) params.set("$where", where);
  const url = `${base}?${params.toString()}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await fetch(url);
    if (r.ok) return r.json();
    if (r.status === 429 || r.status >= 500) {
      const wait = 2000 * Math.pow(2, attempt);
      console.log(`  ${r.status} — backing off ${wait}ms (attempt ${attempt + 1})`);
      await sleep(wait);
      continue;
    }
    throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
  }
  throw new Error("exhausted retries");
}

async function fetchAll(datasetId, where) {
  const PAGE = 50000;
  const rows = [];
  let offset = 0;
  while (true) {
    const batch = await fetchPage(datasetId, { limit: PAGE, offset, where });
    rows.push(...batch);
    process.stdout.write(`  ${datasetId}: fetched ${rows.length}\r`);
    if (batch.length < PAGE) break;
    offset += PAGE;
    await sleep(300); // be polite to the public endpoint
  }
  console.log(`  ${datasetId}: fetched ${rows.length} total          `);
  return rows;
}

async function insertRows(client, datasetId, rows) {
  const BATCH = 1000;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const values = [];
    const placeholders = slice.map((row, j) => {
      const b = j * 9;
      values.push(
        datasetId,
        row.license_number ?? null,
        row.license_type ?? null,
        row.business_name ?? null,
        row.license_expiration_date_mmddccyy ?? null,
        row.continuing_education_flag ?? null,
        row.owner_telephone ?? null,
        JSON.stringify(row),
        SNAPSHOT_DATE
      );
      return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8}::jsonb,$${b + 9}::date)`;
    });
    const sql = `insert into public.tdlr_licensees_raw
      (source_dataset, license_number, license_type, business_name, license_expiration_date_mmddccyy, continuing_education_flag, owner_telephone, raw, snapshot_date)
      values ${placeholders.join(",")}
      on conflict (source_dataset, license_number, snapshot_date) do nothing`;
    const res = await client.query(sql, values);
    inserted += res.rowCount;
    process.stdout.write(`  ${datasetId}: inserted ${inserted}/${rows.length}\r`);
  }
  console.log(`  ${datasetId}: inserted ${inserted} new rows (of ${rows.length} fetched)      `);
}

(async () => {
  const client = new Client({
    host: "db.senkwhdxgtypcrtoggyf.supabase.co",
    port: 5432,
    user: "postgres",
    password: process.env.SUPABASE_DB_PASSWORD,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log(`Snapshot date: ${SNAPSHOT_DATE}\n`);

  // 1) Beauty subset of the full-board dataset (CE flag + expiration + county).
  const inList = BEAUTY_TYPES.map((t) => `'${t.replace(/'/g, "''")}'`).join(",");
  console.log("Pulling 7358-krk7 (beauty ecosystem)...");
  const board = await fetchAll("7358-krk7", `license_type in (${inList})`);
  await insertRows(client, "7358-krk7", board);

  // 2) Salons & Schools dataset (owner_telephone + mailing address).
  console.log("\nPulling 9d9z-ebct (salons & schools w/ phone + address)...");
  const salons = await fetchAll("9d9z-ebct", null);
  await insertRows(client, "9d9z-ebct", salons);

  // Summary
  const summary = await client.query(
    `select source_dataset, count(*) as rows,
            count(*) filter (where continuing_education_flag is not null) as with_ce_flag,
            count(*) filter (where owner_telephone is not null) as with_phone
     from public.tdlr_licensees_raw group by source_dataset order by source_dataset`
  );
  console.log("\n=== LAKE SUMMARY ===");
  console.table(summary.rows);
  await client.end();
})().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
