/**
 * Does each Texas CE provider have a Google Business Profile?
 *
 * Usage:
 *   node scripts/check_ce_provider_google_profiles.js --limit=25   # sample first
 *   node scripts/check_ce_provider_google_profiles.js              # all 235, DRY RUN
 *   node scripts/check_ce_provider_google_profiles.js --commit     # write matches
 *   node scripts/check_ce_provider_google_profiles.js --active     # active licences only
 *
 * SEPARATE FROM THE DISCOVERY SCRIPTS ON PURPOSE. discover_and_stage_* and
 * backfill_unmatched_* exist to FIND businesses and create rows. This does
 * neither — the 235 rows already exist and came from TDLR, so the only question
 * is whether a Places record corresponds to one we already have. Different
 * question, different failure modes, own script. Nothing here touches those.
 *
 * WHY THE MATCH BAR IS HIGH, AND WHY A LOW HIT RATE IS THE RIGHT ANSWER.
 * Much of this dataset is online course businesses — "0 0 ONLINE LICENSE
 * RENEWALS", "COSMETOLOGY AND BARBER ONLINE CE" — which have no storefront and
 * should have no Google Business Profile. Eight of them share 811 PINE ST in
 * Abbott (population ~300) on one phone number. Places will happily return
 * SOMETHING for almost any query; accepting those returns would attach a random
 * nearby business to a CE licence and quietly corrupt 235 rows.
 *
 * So a match must clear one of two bars, and the bar it cleared is recorded:
 *
 *   phone   — the normalised phone on the Places record equals TDLR's. This is
 *             near-conclusive and survives any amount of name drift.
 *   address — the leading street number AND the city both agree. The street
 *             number is what separates two businesses on one road; the school
 *             matcher learned that the hard way when name+city alone proposed
 *             giving one campus another campus's licence.
 *
 * A name-only resemblance is NOT a match and is recorded as `weak` with the
 * candidate shown, so the near-misses can be eyeballed rather than guessed at.
 *
 * READ-ONLY BY DEFAULT. Places costs money per call and writing a wrong
 * place_id is worse than writing none, so nothing is stored without --commit.
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const COMMIT = process.argv.includes("--commit");
const ACTIVE_ONLY = process.argv.includes("--active");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;

const OUT_DIR = path.join(__dirname, "..", "scratchpad_reports");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const FIELD_MASK = [
  "places.id", "places.displayName", "places.formattedAddress",
  "places.nationalPhoneNumber", "places.internationalPhoneNumber",
  "places.websiteUri", "places.rating", "places.userRatingCount",
  "places.businessStatus", "places.types", "places.location",
  "places.primaryTypeDisplayName",
].join(",");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const digits = (s) => String(s || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
const streetNo = (s) => (/^(\d+)/.exec(String(s || "").trim()) || [])[1] || null;
const norm = (s) =>
  String(s || "").toUpperCase().replace(/&/g, " AND ").replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\b(LLC|INC|CO|CORP|LTD|THE|OF)\b/g, " ").replace(/\s+/g, " ").trim();

async function searchText(query) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: query, languageCode: "en", maxResultCount: 5 }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places ${res.status}: ${body.slice(0, 180)}`);
  }
  return (await res.json()).places || [];
}

/** Which bar, if any, does this candidate clear? */
function grade(provider, place) {
  const pPhone = digits(provider.phone);
  const gPhone = digits(place.nationalPhoneNumber || place.internationalPhoneNumber);
  if (pPhone && gPhone && pPhone === gPhone) return "phone";

  const pNo = streetNo(provider.street_address);
  const gNo = streetNo(place.formattedAddress);
  const cityOk =
    provider.city && place.formattedAddress &&
    place.formattedAddress.toUpperCase().includes(String(provider.city).toUpperCase());
  if (pNo && gNo && pNo === gNo && cityOk) return "address";

  return null;
}

async function main() {
  if (!API_KEY) { console.error("GOOGLE_MAPS_API_KEY is not set in .env.local"); process.exit(1); }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let q = db.from("agent_texas_ce_provider_leads")
    .select("id, slug, name, street_address, city, state, zip, phone, is_active, address_provider_count, place_id")
    .order("name");
  if (ACTIVE_ONLY) q = q.eq("is_active", true);
  const { data: providers, error } = await q;
  if (error) { console.error("QUERY FAILED:", error.message); process.exit(1); }

  const work = LIMIT ? providers.slice(0, LIMIT) : providers;
  console.log(`${work.length} CE providers to check${ACTIVE_ONLY ? " (active only)" : ""}`);
  console.log(COMMIT ? "APPLYING — matches will be written\n" : "DRY RUN — nothing will be written\n");

  const results = [];
  let matched = 0, weak = 0, none = 0, errored = 0;

  for (const [i, p] of work.entries()) {
    // Name plus full address. Including the address is what stops Places
    // returning a same-named business in another state.
    const query = [p.name, p.street_address, p.city, p.state, p.zip].filter(Boolean).join(", ");
    let places = [];
    try {
      places = await searchText(query);
    } catch (e) {
      errored++;
      results.push({ ...p, verdict: "error", detail: e.message });
      console.log(`  [${i + 1}/${work.length}] ERROR  ${p.name} — ${e.message}`);
      await sleep(700);
      continue;
    }

    let hit = null, how = null;
    for (const pl of places) {
      const g = grade(p, pl);
      if (g) { hit = pl; how = g; break; }
    }

    if (hit) {
      matched++;
      results.push({
        ...p, verdict: "match", how,
        place_id: hit.id,
        google_name: hit.displayName?.text || "",
        google_address: hit.formattedAddress || "",
        google_phone: hit.nationalPhoneNumber || "",
        website: hit.websiteUri || "",
        rating: hit.rating ?? "",
        reviews: hit.userRatingCount ?? "",
        status: hit.businessStatus || "",
      });
      console.log(`  [${i + 1}/${work.length}] MATCH(${how})  ${p.name}  ->  ${hit.displayName?.text}`);
    } else if (places.length) {
      weak++;
      const c = places[0];
      results.push({
        ...p, verdict: "weak", how: "",
        place_id: "", google_name: c.displayName?.text || "",
        google_address: c.formattedAddress || "", google_phone: c.nationalPhoneNumber || "",
        website: "", rating: "", reviews: "", status: "",
      });
      console.log(`  [${i + 1}/${work.length}] weak   ${p.name}  ~?  ${c.displayName?.text} (${c.formattedAddress})`);
    } else {
      none++;
      results.push({ ...p, verdict: "no-result", how: "" });
      console.log(`  [${i + 1}/${work.length}] none   ${p.name}`);
    }

    if (COMMIT && hit) {
      const { error: upErr } = await db.from("agent_texas_ce_provider_leads").update({
        place_id: hit.id,
        website: hit.websiteUri || null,
        rating: hit.rating ?? null,
        google_review_count: hit.userRatingCount ?? null,
        google_business_status: hit.businessStatus || null,
        google_types: hit.types || null,
        google_category: hit.primaryTypeDisplayName?.text || null,
        latitude: hit.location?.latitude ?? null,
        longitude: hit.location?.longitude ?? null,
        google_scraped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", p.id);
      if (upErr) console.warn(`      write failed: ${upErr.message}`);
    }

    await sleep(700); // polite, and well inside Places rate limits
  }

  const csv = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = "verdict,how,slug,name,city,street_address,phone,is_active,address_provider_count,place_id,google_name,google_address,google_phone,website,rating,reviews,status";
  const file = path.join(OUT_DIR, `ce_provider_google_match${ACTIVE_ONLY ? "_active" : ""}.csv`);
  fs.writeFileSync(file, [header, ...results.map((r) =>
    [r.verdict, r.how, r.slug, r.name, r.city, r.street_address, r.phone, r.is_active,
     r.address_provider_count, r.place_id, r.google_name, r.google_address, r.google_phone,
     r.website, r.rating, r.reviews, r.status].map(csv).join(","))].join("\n"));

  const pct = (n) => `${((100 * n) / work.length).toFixed(0)}%`;
  console.log(`\n  ==== RESULT ====`);
  console.log(`    matched:   ${matched}  (${pct(matched)})   phone ${results.filter(r => r.how === "phone").length} · address ${results.filter(r => r.how === "address").length}`);
  console.log(`    weak:      ${weak}  (${pct(weak)})   Places returned something that did not clear the bar`);
  console.log(`    no result: ${none}  (${pct(none)})`);
  if (errored) console.log(`    errors:    ${errored}`);
  console.log(`\n  CSV: ${file}`);
  if (!COMMIT) console.log(`  Re-run with --commit to write the matches.`);
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
