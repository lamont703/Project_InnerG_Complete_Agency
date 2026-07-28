/**
 * Restore table/type tags on GHL contacts shared by more than one source table.
 *
 * WHY THIS EXISTS: GHL's POST /contacts/upsert REPLACES a contact's tags rather
 * than appending to them. When two entities in different tables share a phone
 * number (e.g. a barbershop and the independent barber who rents a chair there)
 * they collapse into a single GHL contact, and whichever table synced last wins
 * the tags — so the contact ends up carrying only one "Table: ..." tag.
 *
 * This pass finds every contact_id that appears in more than one source table
 * and re-applies the missing tags via POST /contacts/{id}/tags, which is
 * additive. Run it after sync_entities_to_ghl.js.
 *
 * Usage:
 *   node scripts/reconcile_ghl_tags.js            # dry-run
 *   node scripts/reconcile_ghl_tags.js --live     # apply
 */
require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_API_KEY = process.env.GHL_API_KEY;
const LIVE = process.argv.includes("--live");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Must match the type tags used by sync_entities_to_ghl.js.
const SOURCES = [
  { key: "shops", table: "agent_barbershop_leads", type: "Barbershop" },
  { key: "salons", table: "agent_salon_leads", type: "Salon" },
  { key: "barbers", table: "agent_barber_leads", type: "Barber" },
  { key: "cosmetologists", table: "agent_cosmetologist_leads", type: "Cosmetologist" },
  { key: "schools", table: "agent_barber_school_leads", type: "Barber School" },
];

const headers = {
  Authorization: `Bearer ${GHL_API_KEY}`,
  "Content-Type": "application/json",
  Version: "2021-07-28",
};

// Returns the tag array, or null only if the contact genuinely does not exist.
// Must retry on 429 — treating a rate-limit as "missing" silently skips work.
async function getTags(id) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${GHL_API_BASE}/contacts/${id}`, { headers });
    if (res.ok) return ((await res.json()).contact || {}).tags || [];
    if (res.status === 429 || res.status >= 500) { await sleep(1500 * (attempt + 1)); continue; }
    return null;
  }
  return undefined; // exhausted retries — distinct from "not found"
}

async function addTags(id, tags) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${GHL_API_BASE}/contacts/${id}/tags`, {
      method: "POST", headers, body: JSON.stringify({ tags }),
    });
    if (res.ok) return { ok: true };
    if (res.status === 429 || res.status >= 500) { await sleep(2000 * (attempt + 1)); continue; }
    return { ok: false, error: `${res.status} ${(await res.text()).slice(0, 160)}` };
  }
  return { ok: false, error: "retries exhausted" };
}

(async () => {
  if (!GHL_API_KEY) { console.error("Missing GHL_API_KEY"); process.exit(1); }
  const client = new Client({ host: "db.senkwhdxgtypcrtoggyf.supabase.co", port: 5432, user: "postgres", password: process.env.SUPABASE_DB_PASSWORD, database: "postgres", ssl: { rejectUnauthorized: false } });
  await client.connect();

  // A contact_id can only repeat ACROSS tables (each table has its own unique
  // index), so a count > 1 here is exactly the collapsed-contact case.
  const union = SOURCES.map((s) => `select contact_id, '${s.key}' as src from ${s.table} where contact_id ~ '^[A-Za-z0-9]{20}$'`).join(" union all ");
  const { rows } = await client.query(`
    with all_ids as (${union})
    select contact_id, array_agg(src order by src) srcs
    from all_ids group by contact_id having count(*) > 1`);

  console.log(`Mode: ${LIVE ? "LIVE" : "DRY RUN"}`);
  console.log(`contacts shared across tables: ${rows.length}\n`);

  const byType = {};
  for (const r of rows) byType[r.srcs.join(" + ")] = (byType[r.srcs.join(" + ")] || 0) + 1;
  for (const [k, v] of Object.entries(byType).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(4)}  ${k}`);

  const totals = { checked: 0, alreadyOk: 0, patched: 0, failed: 0, gone: 0, rateLimited: 0, tagsAdded: 0 };
  console.log("");

  for (const r of rows) {
    totals.checked++;
    const want = [];
    for (const key of r.srcs) {
      const s = SOURCES.find((x) => x.key === key);
      want.push(s.type, `Table: ${s.table}`);
    }
    const current = await getTags(r.contact_id);
    if (current === undefined) { totals.rateLimited++; console.log(`  RATE-LIMITED, not checked: ${r.contact_id}`); continue; }
    if (current === null) { totals.gone++; continue; }
    await sleep(120); // stay under the read rate limit
    const lower = current.map((t) => t.toLowerCase());
    const missing = want.filter((t) => !lower.includes(t.toLowerCase()));
    if (!missing.length) { totals.alreadyOk++; continue; }

    if (!LIVE) {
      if (totals.patched < 10) console.log(`  would add ${JSON.stringify(missing)} -> ${r.contact_id} (${r.srcs.join("+")})`);
      totals.patched++; totals.tagsAdded += missing.length;
      continue;
    }
    const res = await addTags(r.contact_id, missing);
    if (!res.ok) { totals.failed++; if (totals.failed <= 5) console.log(`  FAIL ${r.contact_id}: ${res.error}`); continue; }
    totals.patched++; totals.tagsAdded += missing.length;
    if (totals.patched % 25 === 0) console.log(`  ...patched ${totals.patched}`);
    await sleep(150);
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`shared contacts checked: ${totals.checked}`);
  console.log(`already correct:         ${totals.alreadyOk}`);
  console.log(`${LIVE ? "patched" : "would patch"}:                 ${totals.patched}  (${totals.tagsAdded} tags)`);
  console.log(`contact not found:       ${totals.gone}`);
  if (totals.rateLimited) console.log(`rate-limited (unchecked):${totals.rateLimited}  <-- re-run to cover these`);
  if (LIVE) console.log(`failed:                  ${totals.failed}`);
  else console.log(`\n(DRY RUN — re-run with --live to apply.)`);
  await client.end();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
