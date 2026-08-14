#!/usr/bin/env node
/**
 * Harvests every Candidate Information Bulletin PSI publishes for a state
 * board, into reference/{State} Exam Prep Files/.
 *
 * THE THREE HOPS. Nothing links these PDFs; they come out of the API the
 * candidate portal's JavaScript calls:
 *
 *   /api/account/{client}/test              -> tests, each with a globalTestId
 *   /api/account/{client}/test/{globalId}   -> HTML mentioning bulletin/{n}
 *   /api/content/bulletin/{n}               -> the PDF
 *
 * DEDUPE ON CONTENT, NOT ON ID. This is the part that matters and the part
 * that is not obvious. California publishes ONE combined bulletin covering five
 * licences, served under five different IDs — 916, 930, 940, 941 and 942 are
 * byte for byte the same file. Maryland does the same for barber and barber
 * stylist (4175 / 5548). Saving per ID would produce an archive that looks
 * eight documents deep and is actually two, which is worse than a small archive
 * because it invites you to trust a coverage number that isn't real. So every
 * download is hashed, and a repeat is recorded as an alias rather than written
 * again.
 *
 * TRANSLATIONS ARE QUARANTINED, not deleted. PSI publishes Korean, Spanish,
 * Vietnamese and Portuguese editions alongside the English one. They are real
 * documents and may matter later, but they bury the English bulletin in a
 * directory listing, so they go to _non-english/.
 *
 * WHAT THIS SCRIPT WILL NOT DO: decide whether the state has a practical exam.
 * It records the evidence — test names, and the bulletin text — and leaves the
 * judgement to a human reading it. A test named "- Practical" is strong
 * evidence and not proof, and that distinction is the whole reason the kit-list
 * format cannot be scaled by inference.
 *
 * Usage:
 *   node scripts/fetch_psi_bulletins.js                 # every state with a code
 *   node scripts/fetch_psi_bulletins.js Alabama Georgia
 *   node scripts/fetch_psi_bulletins.js --dry-run
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { STATES, folderFor } = require("./state_reference_scaffold");

const BASE = "https://test-takers.psiexams.com/api";
const UA = "Mozilla/5.0 (compatible; ShearQuery-reference-archive/1.0; +https://shearquery.com)";
const DELAY_MS = 300;
const DRY = process.argv.includes("--dry-run");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Non-English editions, matched on the test name PSI gives them.
const LANG = /\b(korean|spanish|vietnamese|chinese|portuguese|russian|french|japanese|tagalog|arabic|nepali|somali|amharic)\b/i;

const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(30000) });
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("problem+json") || !ct.includes("application/json")) return null;
  return res.json();
}

async function getText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
  return res.text();
}

/** Filesystem-safe, and readable in a directory listing. */
function fileNameFor(state, testName) {
  const clean = testName.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
  return `${state} - ${clean}.pdf`;
}

async function harvestState(state, code) {
  const dir = folderFor(state);
  const mapPath = path.join(dir, "_urlmap.json");
  if (!fs.existsSync(mapPath)) {
    console.log(`  ${state}: no _urlmap.json — run state_reference_scaffold.js first`);
    return;
  }
  const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));

  const tests = await getJson(`${BASE}/account/${code}/test`);
  if (!Array.isArray(tests)) {
    console.log(`  ${state}: test list unavailable`);
    return;
  }

  const english = tests.filter((t) => !LANG.test(t.name || ""));
  console.log(`  ${state} (${code}): ${tests.length} tests, ${english.length} English`);

  // The practical signal, recorded as evidence rather than as a verdict.
  const practicalNamed = english.filter((t) => /\bpractical\b/i.test(t.name || "")).map((t) => t.name);

  const provPath = path.join(dir, ".provenance.json");
  const prov = fs.existsSync(provPath) ? JSON.parse(fs.readFileSync(provPath, "utf8")) : {};
  const byHash = new Map();
  for (const [fname, meta] of Object.entries(prov)) {
    if (meta && meta.sha256) byHash.set(meta.sha256, fname);
  }

  const documents = Array.isArray(map.documents) ? map.documents : [];
  const seenBulletins = new Set(documents.map((d) => d.bulletinId).filter(Boolean));
  let saved = 0, aliased = 0;

  for (const t of english) {
    await sleep(DELAY_MS);
    let bulletinId = null;
    try {
      const detail = await getText(`${BASE}/account/${code}/test/${t.globalTestId}`);
      const m = detail.match(/bulletin\/(\d+)/);
      bulletinId = m ? m[1] : null;
    } catch { /* a single test failing must not abort the state */ }
    if (!bulletinId || seenBulletins.has(bulletinId)) continue;
    seenBulletins.add(bulletinId);

    const url = `${BASE}/content/bulletin/${bulletinId}`;
    if (DRY) { console.log(`    would fetch ${t.name} -> ${url}`); continue; }

    await sleep(DELAY_MS);
    let buf;
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60000) });
      if (!res.ok) continue;
      buf = Buffer.from(await res.arrayBuffer());
    } catch { continue; }
    // A PDF starts %PDF-. Anything else is the app shell or an error page
    // wearing a 200, which is this portal's signature failure mode.
    if (!buf.slice(0, 5).toString("latin1").startsWith("%PDF")) continue;

    const hash = sha(buf);
    const isTranslation = LANG.test(t.name || "");
    const destDir = isTranslation ? path.join(dir, "_non-english") : dir;

    if (byHash.has(hash)) {
      // Same document under another ID. Record the alias; do not write again.
      documents.push({ bulletinId, url, testName: t.name, globalTestId: t.globalTestId, file: byHash.get(hash), duplicateOf: byHash.get(hash), sha256: hash });
      aliased++;
      continue;
    }

    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const fname = fileNameFor(state, t.name);
    fs.writeFileSync(path.join(destDir, fname), buf);
    byHash.set(hash, fname);
    prov[fname] = { url, bulletinId, testName: t.name, globalTestId: t.globalTestId, sha256: hash, bytes: buf.length, fetchedAt: new Date().toISOString().slice(0, 10) };
    documents.push({ bulletinId, url, testName: t.name, globalTestId: t.globalTestId, file: fname, sha256: hash });
    saved++;
  }

  if (!DRY) {
    map.documents = documents;
    map.examVendor = { ...(map.examVendor || {}), name: "PSI", psiClientCode: code };
    map.practicalEvidence = {
      testsNamedPractical: practicalNamed,
      note: practicalNamed.length
        ? "PSI lists tests named 'Practical' for this board. Strong evidence, not proof — confirm in the bulletin before publishing a kit list."
        : "No PSI test name contains 'Practical'. Suggestive of a written-only licence (as in California), but must be confirmed against the bulletin text.",
      checkedAt: new Date().toISOString().slice(0, 10),
    };
    map.research = { ...(map.research || {}), lastCheckedAt: new Date().toISOString().slice(0, 10), status: "psi-harvested" };
    fs.writeFileSync(mapPath, JSON.stringify(map, null, 2) + "\n");
    fs.writeFileSync(provPath, JSON.stringify(prov, null, 2) + "\n");
  }

  console.log(`    saved ${saved} new, ${aliased} duplicate-by-content, ${practicalNamed.length} tests named "Practical"`);
}

async function main() {
  const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const targets = only.length ? STATES.filter((s) => only.includes(s)) : STATES;

  for (const state of targets) {
    const mapPath = path.join(folderFor(state), "_urlmap.json");
    if (!fs.existsSync(mapPath)) continue;
    const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
    const code = map.examVendor && map.examVendor.psiClientCode;
    if (!code) continue;
    try {
      await harvestState(state, code);
    } catch (e) {
      console.log(`  ${state}: FAILED ${e.message}`);
    }
  }
}

if (require.main === module) main();
