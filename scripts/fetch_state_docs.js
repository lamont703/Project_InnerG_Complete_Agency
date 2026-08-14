#!/usr/bin/env node
/**
 * Downloads named documents into a state's reference folder, recording where
 * each one came from.
 *
 * The companion to fetch_psi_bulletins.js, for the 36 states that are not PSI
 * clients. Those have no discoverable API — their documents are ordinary PDFs
 * on a board website, found by reading the board's own examination page. So the
 * URLs arrive from research rather than from a probe, and this script's job is
 * only to fetch them honestly and write the provenance.
 *
 * WHY PROVENANCE IS NOT OPTIONAL. A bulletin on disk with no origin cannot be
 * re-checked, and an unre-checkable bulletin is the stale local copy CLAUDE.md
 * warns against — trusted precisely because nobody can see how old it is. Every
 * file written here carries its source URL, a content hash and the date it was
 * fetched.
 *
 * Same content-dedupe as the PSI harvester: states routinely serve one document
 * from several paths, and an archive that counts those separately overstates
 * its own coverage.
 *
 * Usage:
 *   node scripts/fetch_state_docs.js "Florida" \
 *     https://.../barb_cib.pdf https://.../cos_cib.pdf
 *
 *   node scripts/fetch_state_docs.js "Florida" --json '[{"url":"...","title":"..."}]'
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { folderFor } = require("./state_reference_scaffold");

const UA = "Mozilla/5.0 (compatible; ShearQuery-reference-archive/1.0; +https://shearquery.com)";
const DELAY_MS = 400;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");

function titleFromUrl(u) {
  try {
    const base = decodeURIComponent(new URL(u).pathname.split("/").pop() || "document");
    return base.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim() || "document";
  } catch {
    return "document";
  }
}

async function run(state, docs) {
  const dir = folderFor(state);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const mapPath = path.join(dir, "_urlmap.json");
  const map = fs.existsSync(mapPath)
    ? JSON.parse(fs.readFileSync(mapPath, "utf8"))
    : { state, documents: [] };
  const provPath = path.join(dir, ".provenance.json");
  const prov = fs.existsSync(provPath) ? JSON.parse(fs.readFileSync(provPath, "utf8")) : {};

  const byHash = new Map();
  for (const [f, m] of Object.entries(prov)) if (m && m.sha256) byHash.set(m.sha256, f);

  map.documents = Array.isArray(map.documents) ? map.documents : [];
  const already = new Set(map.documents.map((d) => d.url));

  let saved = 0, dup = 0, failed = 0;
  for (const doc of docs) {
    const url = typeof doc === "string" ? doc : doc.url;
    if (!url || already.has(url)) continue;
    await sleep(DELAY_MS);

    let buf;
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60000) });
      if (!res.ok) { console.log(`    ${res.status} ${url}`); failed++; continue; }
      buf = Buffer.from(await res.arrayBuffer());
    } catch (e) {
      console.log(`    ERR ${url} — ${e.message}`);
      failed++;
      continue;
    }

    // Board sites return styled 404 pages with a 200 as often as not, so the
    // magic bytes decide, never the status code.
    if (!buf.slice(0, 5).toString("latin1").startsWith("%PDF")) {
      console.log(`    not a PDF (likely an error page wearing a 200): ${url}`);
      failed++;
      continue;
    }

    const hash = sha(buf);
    const title = (typeof doc === "object" && doc.title) || titleFromUrl(url);
    if (byHash.has(hash)) {
      map.documents.push({ url, title, file: byHash.get(hash), duplicateOf: byHash.get(hash), sha256: hash });
      dup++;
      continue;
    }

    const fname = `${state} - ${title}`.replace(/[\\/:*?"<>|]/g, "-").slice(0, 150) + ".pdf";
    fs.writeFileSync(path.join(dir, fname), buf);
    byHash.set(hash, fname);
    prov[fname] = { url, title, sha256: hash, bytes: buf.length, fetchedAt: new Date().toISOString().slice(0, 10) };
    map.documents.push({ url, title, file: fname, sha256: hash });
    saved++;
  }

  map.research = { ...(map.research || {}), lastCheckedAt: new Date().toISOString().slice(0, 10), status: "docs-fetched" };
  fs.writeFileSync(mapPath, JSON.stringify(map, null, 2) + "\n");
  fs.writeFileSync(provPath, JSON.stringify(prov, null, 2) + "\n");
  console.log(`  ${state}: ${saved} saved, ${dup} duplicate-by-content, ${failed} failed`);
}

async function main() {
  const args = process.argv.slice(2);
  const state = args.shift();
  if (!state) { console.error('usage: node scripts/fetch_state_docs.js "Florida" <url> [url...]'); process.exit(1); }

  let docs;
  const jsonIdx = args.indexOf("--json");
  if (jsonIdx !== -1) docs = JSON.parse(args[jsonIdx + 1]);
  else docs = args.filter((a) => a.startsWith("http"));

  await run(state, docs);
}

if (require.main === module) main();
module.exports = { run };
