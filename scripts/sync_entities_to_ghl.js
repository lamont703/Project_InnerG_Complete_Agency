/**
 * Sync directory entities → GoHighLevel contacts (v2 LeadConnector API).
 *
 * Upserts each entity as a GHL contact with full name/company/phone/email/
 * address, deduped by PHONE (email is almost entirely absent in our data), and
 * writes the returned GHL contact id back to the row. Adds segmentation TAGS
 * (entity type, city, state, claimed/hiring) so users can be segmented in GHL.
 *
 * SAFE BY DEFAULT: dry-run unless --live is passed. Idempotent (upsert), so a
 * re-run updates rather than duplicates.
 *
 * Usage:
 *   node scripts/sync_entities_to_ghl.js                      # dry-run, shops+salons
 *   node scripts/sync_entities_to_ghl.js --tables=shops,salons,barbers,cosmetologists,schools
 *   node scripts/sync_entities_to_ghl.js --live --limit=5     # real, first 5 rows
 *   node scripts/sync_entities_to_ghl.js --live               # full run
 */
require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const RESUME = args.includes("--resume");
const LIMIT = (() => { const a = args.find((x) => x.startsWith("--limit=")); return a ? parseInt(a.split("=")[1]) : null; })();
const TABLES_ARG = (() => { const a = args.find((x) => x.startsWith("--tables=")); return a ? a.split("=")[1].split(",") : ["shops", "salons"]; })();

// Crash-resume checkpoint: the last row id completed per table. A full run is
// ~7k rows / ~45min, so an interrupted run must not have to start over.
const CKPT_PATH = path.join(__dirname, ".ghl_sync_progress.json");
function loadCkpt() {
  if (!RESUME) return {};
  try { return JSON.parse(fs.readFileSync(CKPT_PATH, "utf8")); } catch { return {}; }
}
function saveCkpt(ckpt) {
  try { fs.writeFileSync(CKPT_PATH, JSON.stringify(ckpt, null, 2)); } catch {}
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const title = (s) => (s || "").toString().trim().replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());

// Strip a trailing ZIP that got mashed into a city value ("Houston 77069").
const cleanCity = (x) => (x || "").toString().replace(/\s*\d{5}(-\d{4})?\s*$/, "").trim() || null;

// Reject placeholder owner names so we fall back to the business name.
function realName(n) {
  if (!n) return null;
  const t = n.trim();
  if (!t || /^unknown/i.test(t) || /^n\/?a$/i.test(t)) return null;
  return t;
}

// ZIP3 -> state ranges, used to recover the state when an address ends in a
// bare ZIP (the agent_barber_leads format: "1144 N Plano Rd, Richardson, 75081").
const ZIP3_RANGES = [
  ["AL",350,369],["AK",995,999],["AZ",850,865],["AR",716,729],["CA",900,961],
  ["CO",800,816],["CT",60,69],["DE",197,199],["DC",200,205],["FL",320,349],
  ["GA",300,319],["GA",398,399],["HI",967,968],["ID",832,838],["IL",600,629],
  ["IN",460,479],["IA",500,528],["KS",660,679],["KY",400,427],["LA",700,714],
  ["ME",39,49],["MD",206,219],["MA",10,27],["MI",480,499],["MN",550,567],
  ["MS",386,397],["MO",630,658],["MT",590,599],["NE",680,693],["NV",889,898],
  ["NH",30,38],["NJ",70,89],["NM",870,884],["NY",100,149],["NC",270,289],
  ["ND",580,588],["OH",430,459],["OK",730,749],["OR",970,979],["PA",150,196],
  ["RI",28,29],["SC",290,299],["SD",570,577],["TN",370,385],["TX",733,733],
  ["TX",750,799],["TX",885,885],["UT",840,847],["VT",50,59],["VA",201,201],
  ["VA",220,246],["WA",980,994],["WV",247,268],["WI",530,549],["WY",820,831],
];
// Spelled-out state names, for "Houston, Texas 77077" style addresses.
const STATE_NAME_TO_ABBR = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", "district of columbia": "DC",
  florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL",
  indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA",
  maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN",
  mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY", "puerto rico": "PR",
};

function stateFromZip(zip) {
  if (!zip) return null;
  const n = parseInt(String(zip).slice(0, 3), 10);
  if (Number.isNaN(n)) return null;
  const hit = ZIP3_RANGES.find(([, lo, hi]) => n >= lo && n <= hi);
  return hit ? hit[0] : null;
}

// Parse a US address into components. Handles the three shapes present in our
// data: Google's "STREET, CITY, ST ZIP, USA" (shops/salons/schools), the
// bare-ZIP "STREET, CITY, ZIP" used by agent_barber_leads, and "CITY, ST" with
// no ZIP. The parsed address_* columns are sparsely populated (0% on salons),
// so this parser is the primary source of city/state/zip for most tables.
function parseAddr(formatted) {
  if (!formatted) return {};
  // Some scraped addresses use newlines instead of commas as separators
  // ("TRAVELING MUA\nHouston, TX 77002"), which otherwise get absorbed into
  // the city. Treat a newline as a separator and collapse runs of whitespace.
  const s = String(formatted)
    .replace(/[\r\n]+/g, ",")
    .replace(/[ \t]+/g, " ")
    .replace(/,\s*(USA|United States)\s*$/i, "")
    .trim();
  const parts = s.split(",").map((x) => x.trim()).filter(Boolean);
  if (parts.length < 2) return { address1: s };
  const last = parts[parts.length - 1];

  // "CITY, ST ZIP" — the well-formed Google shape. The \b matters: without it
  // "Houston, Texas 77077" matches the trailing "as" and yields state "AS".
  const m = last.match(/\b([A-Za-z]{2})\s+(\d{5})(?:-\d{4})?$/);
  if (m) {
    return {
      state: m[1].toUpperCase(),
      zip: m[2],
      city: cleanCity(parts[parts.length - 2]),
      address1: parts.slice(0, parts.length - 2).join(", ") || undefined,
    };
  }

  // "CITY, Texas 77077" — state spelled out rather than abbreviated.
  const spelled = last.match(/^([A-Za-z][A-Za-z .]+?)\s+(\d{5})(?:-\d{4})?$/);
  if (spelled && STATE_NAME_TO_ABBR[spelled[1].trim().toLowerCase()]) {
    return {
      state: STATE_NAME_TO_ABBR[spelled[1].trim().toLowerCase()],
      zip: spelled[2],
      city: cleanCity(parts[parts.length - 2]),
      address1: parts.slice(0, parts.length - 2).join(", ") || undefined,
    };
  }

  // "CITY, 75081" — bare trailing ZIP, no state. Recover the state from the ZIP.
  const z = last.match(/^(\d{5})(?:-\d{4})?$/);
  if (z) {
    return {
      zip: z[1],
      state: stateFromZip(z[1]),
      city: cleanCity(parts[parts.length - 2]),
      address1: parts.slice(0, parts.length - 2).join(", ") || undefined,
    };
  }

  // "CITY, TX" — trailing state with no ZIP.
  const st = last.match(/^([A-Za-z]{2})$/);
  if (st) {
    return {
      state: st[1].toUpperCase(),
      city: cleanCity(parts[parts.length - 2]),
      address1: parts.slice(0, parts.length - 2).join(", ") || undefined,
    };
  }

  return { city: cleanCity(last), address1: parts.slice(0, parts.length - 1).join(", ") || undefined };
}

// Normalize to E.164 US where possible; return null if unusable. GHL rejects
// the whole upsert with "Invalid country calling code" on a malformed number,
// so anything we can't confidently normalize must come back null rather than
// be passed through as a best guess.
function normPhone(raw) {
  if (!raw) return null;
  const d = String(raw).replace(/[^\d]/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d[0] === "1") return `+${d}`;
  // Already-E.164 international input: keep only if it has a valid (non-zero)
  // country code and a plausible length.
  const t = String(raw).trim();
  if (t.startsWith("+")) {
    const dd = t.replace(/[^\d]/g, "");
    return /^[1-9]\d{7,14}$/.test(dd) ? `+${dd}` : null;
  }
  // Bare digits with no leading "+": only trust an unambiguous country code.
  return /^[1-9]\d{9,14}$/.test(d) ? `+${d}` : null;
}

function baseTags(type, r, cityResolved, stateResolved) {
  return [
    "Directory Sync",
    type,
    cityResolved ? `City: ${title(cityResolved)}` : null,
    stateResolved ? `State: ${String(stateResolved).toUpperCase()}` : null,
    r.claimed_at ? "Claimed" : null,
    r.hiring_need ? "Hiring" : null,
    r.specialty_type ? `Specialty: ${title(r.specialty_type)}` : null,
  ].filter(Boolean);
}

// Shared mapper for the address-rich business/school tables.
function mapBusiness(r, type) {
  const a = parseAddr(r.formatted_address);
  const city = cleanCity(r.address_city) || a.city || cleanCity(r.city);
  const zip = r.address_zip || a.zip;
  const state = r.address_state || a.state || stateFromZip(zip);
  const company = r.shop_name || r.school_name;
  return {
    name: realName(r.owner_name) || realName(r.admissions_rep_name) || company,
    companyName: company,
    phone: normPhone(r.phone), email: r.email || undefined,
    address1: r.street_address || a.address1 || r.formatted_address,
    city, state, postalCode: zip, website: r.website || undefined,
    tags: baseTags(type, r, city, state),
  };
}

// Mapper for individual practitioners (single free-text address field).
function mapPerson(r, type) {
  const a = parseAddr(r.address);
  const city = a.city || cleanCity(r.metro_area);
  const state = a.state || stateFromZip(a.zip);
  return {
    name: r.name, phone: normPhone(r.phone), email: r.email || undefined,
    address1: a.address1 || r.address, city, state, postalCode: a.zip,
    tags: baseTags(type, r, city, state),
  };
}

const BIZ_COLS = "id, contact_id, shop_name, owner_name, phone, email, street_address, address_city, address_state, address_zip, city, formatted_address, website, hiring_need, claimed_at";
const PERSON_COLS = "id, contact_id, name, phone, email, address, metro_area, specialty_type";

const TABLES = {
  shops: { table: "agent_barbershop_leads", cols: BIZ_COLS, map: (r) => mapBusiness(r, "Barbershop") },
  salons: { table: "agent_salon_leads", cols: BIZ_COLS, map: (r) => mapBusiness(r, "Salon") },
  barbers: { table: "agent_barber_leads", cols: PERSON_COLS, map: (r) => mapPerson(r, "Barber") },
  cosmetologists: { table: "agent_cosmetologist_leads", cols: PERSON_COLS, map: (r) => mapPerson(r, "Cosmetologist") },
  // NOTE: this table's contact_id was previously used to hold the Google Place
  // ID (see scratch/upsert_schools.js). Those values duplicate the place_id
  // column exactly, so overwriting them with the real GHL id loses nothing.
  schools: { table: "agent_barber_school_leads", cols: "id, contact_id, school_name, admissions_rep_name, phone, email, city, formatted_address, website", map: (r) => mapBusiness(r, "Barber School") },
};

async function upsertContact(payload) {
  const body = { locationId: GHL_LOCATION_ID, source: "Directory Sync", ...payload };
  // strip empties
  for (const k of Object.keys(body)) if (body[k] === undefined || body[k] === null || body[k] === "") delete body[k];
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${GHL_API_BASE}/contacts/upsert`, {
      method: "POST",
      headers: { Authorization: `Bearer ${GHL_API_KEY}`, "Content-Type": "application/json", Version: "2021-07-28" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      return { id: data.contact?.id, isNew: data.new, ok: true };
    }
    if (res.status === 429 || res.status >= 500) { await sleep(2000 * (attempt + 1)); continue; }
    return { ok: false, error: `${res.status} ${(await res.text()).slice(0, 200)}` };
  }
  return { ok: false, error: "retries exhausted" };
}

(async () => {
  if (!GHL_API_KEY || !GHL_LOCATION_ID) { console.error("Missing GHL_API_KEY / GHL_LOCATION_ID"); process.exit(1); }
  const client = new Client({ host: "db.senkwhdxgtypcrtoggyf.supabase.co", port: 5432, user: "postgres", password: process.env.SUPABASE_DB_PASSWORD, database: "postgres", ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log(`Mode: ${LIVE ? "LIVE (writing to GHL)" : "DRY RUN"}  |  tables: ${TABLES_ARG.join(", ")}  |  limit: ${LIMIT ?? "none"}${RESUME ? "  |  RESUME" : ""}\n`);

  const totals = { rows: 0, sendable: 0, noPhone: 0, upserted: 0, created: 0, updated: 0, failed: 0, linkSkipped: 0, linked: 0 };
  // Dry-run address-quality counters, so we can see parse coverage before going live.
  const quality = { city: 0, state: 0, zip: 0, addr1: 0 };
  const ckpt = loadCkpt();

  for (const key of TABLES_ARG) {
    const cfg = TABLES[key];
    if (!cfg) { console.log(`(skip unknown table "${key}")`); continue; }
    const after = RESUME ? ckpt[key] : null;
    // Ordered by id so the checkpoint cursor is a stable resume point.
    const q = `select ${cfg.cols} from ${cfg.table}`
      + (after ? ` where id::text > '${after}'` : "")
      + ` order by id::text` + (LIMIT ? ` limit ${LIMIT}` : "");
    const { rows } = await client.query(q);
    console.log(`\n== ${key} (${cfg.table}): ${rows.length} rows ==${after ? ` (resuming after id ${after})` : ""}`);

    let shown = 0;
    for (const r of rows) {
      totals.rows++;
      const payload = cfg.map(r);
      // Source-table tag so contacts can be isolated by origin table in GHL.
      payload.tags = [...(payload.tags || []), `Table: ${cfg.table}`];
      if (!payload.phone && !payload.email) { totals.noPhone++; continue; }
      totals.sendable++;
      if (payload.city) quality.city++;
      if (payload.state) quality.state++;
      if (payload.postalCode) quality.zip++;
      if (payload.address1) quality.addr1++;

      if (!LIVE) {
        if (shown < 3) {
          console.log(`  sample: ${JSON.stringify({ name: payload.name, phone: payload.phone, address1: payload.address1, city: payload.city, state: payload.state, postalCode: payload.postalCode, tags: payload.tags })}`);
          shown++;
        }
        continue;
      }

      const res = await upsertContact(payload);
      if (!res.ok) { totals.failed++; if (totals.failed <= 10) console.log(`  FAIL ${payload.name}: ${res.error}`); continue; }
      totals.upserted++;
      res.isNew ? totals.created++ : totals.updated++;
      if (res.id && res.id !== r.contact_id) {
        try {
          await client.query(`update ${cfg.table} set contact_id=$1 where id=$2`, [res.id, r.id]);
          totals.linked++;
        } catch (e) {
          // Expected only for shared-phone duplicates: two entities collapse to
          // one GHL contact and contact_id carries a UNIQUE index. The upsert
          // itself succeeded, so just leave this duplicate row unlinked.
          if (e.code === "23505") totals.linkSkipped++;
          else { totals.failed++; console.log(`  LINK ERR ${cfg.table}/${r.id}: ${e.message}`); }
        }
      }
      ckpt[key] = String(r.id);
      saveCkpt(ckpt);
      if (totals.upserted % 50 === 0) console.log(`  ...${key}: ${totals.upserted} upserted (${totals.created} new, ${totals.updated} updated, ${totals.failed} failed)`);
      await sleep(150); // ~6-7/s, well under GHL burst limits
    }
  }

  console.log(`\n\n=== SUMMARY ===`);
  console.log(`rows scanned:     ${totals.rows}`);
  console.log(`sendable:         ${totals.sendable}  (skipped no-phone/email: ${totals.noPhone})`);
  const pct = (n) => `${n} (${totals.sendable ? Math.round((n / totals.sendable) * 100) : 0}%)`;
  console.log(`address coverage: street ${pct(quality.addr1)} | city ${pct(quality.city)} | state ${pct(quality.state)} | zip ${pct(quality.zip)}`);
  if (LIVE) {
    console.log(`upserted:         ${totals.upserted}  (created: ${totals.created}, updated: ${totals.updated})`);
    console.log(`contact_id set:   ${totals.linked}`);
    console.log(`link skipped:     ${totals.linkSkipped}  (shared-phone duplicates — contact synced, row not linked)`);
    console.log(`failed:           ${totals.failed}`);
  } else {
    console.log(`\n(DRY RUN — nothing written. Re-run with --live to sync, or --live --limit=5 to test a few first.)`);
  }
  await client.end();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
