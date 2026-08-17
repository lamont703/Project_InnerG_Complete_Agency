#!/usr/bin/env node
/**
 * Watches the regulators for changes that are worth saying out loud.
 *
 * ============================================================================
 * IT DIFFS CLAIMS, NOT PAGES, AND THAT IS THE WHOLE DESIGN
 * ============================================================================
 * The obvious build — fetch each page, diff the HTML — fires on nav markup,
 * timestamps, reordered lists and session tokens. It alerts every day, everyone
 * learns to ignore it, and the one real change hides in the noise. That is how
 * change monitoring usually dies.
 *
 * So nothing here compares documents. It EXTRACTS the facts the site actually
 * relies on — a fee, an hour count, a deadline, a percentage, a rule number —
 * and diffs those. A navigation change touches no claim and produces nothing.
 *
 * THE CLAIM KEY IS THE IDEA THAT MAKES IT WORK. A number on its own is not
 * identifiable: a page with six dollar amounts gives six anonymous values, and
 * next month they may be in a different order. So each extracted value is keyed
 * by the WORDS AROUND IT with all digits stripped — "renewal fee for an
 * establishment is" is a stable identity, and the value hanging off it is what
 * we watch. Reordering the page does not change any key; changing a fee does.
 *
 * WHY lib/tdlr-sources.ts IS THE INPUT. That file already declares what each
 * page settles ("Establishment renewal fee ($78)"), which is a claim registry
 * written for a different reason. Watching the pages it names means the diff is
 * scoped to what the site actually cites, rather than to whatever TDLR happens
 * to publish.
 *
 * THREE OUTCOMES, and the second matters as much as the first:
 *   CARD   a change big enough and concrete enough to be a Short
 *   WATCH  a real change that is not worth a post — logged, and it means a page
 *          on this site may now be stale, which is the other half of the job
 *   NOISE  filtered before anyone sees it
 *
 * THE FIRST RUN PRODUCES NOTHING. It has no prior snapshot to compare against;
 * it establishes the baseline. That is expected, not a failure.
 *
 * IT DOES NOT WRITE THE CARD. A diff can say "this value went from X to Y". It
 * cannot say what that means, and inventing the meaning is exactly where a
 * wrong claim would enter with our mark on it. Candidates carry the stat and
 * the source filled in; the sentence around them is authored, then approved.
 *
 * Usage:
 *   node scripts/shorts/regulator-diff.js --baseline     # first run, no diff
 *   node scripts/shorts/regulator-diff.js
 *   node scripts/shorts/regulator-diff.js --only continuing-education
 *   node scripts/shorts/regulator-diff.js --json
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env.local") });
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const SNAP_DIR = path.join(ROOT, "reference", "Regulator Snapshots");
const CANDIDATES = path.join(ROOT, "reference", "Podcast Visuals", "Shorts", "_candidates.json");

const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : null; };
const BASELINE = argv.includes("--baseline");
const AS_JSON = argv.includes("--json");
const ONLY = arg("only");

/* ------------------------------------------------------------------ sources */

/**
 * Parsed out of lib/tdlr-sources.ts rather than duplicated. That file is
 * TypeScript and these scripts are CommonJS, and a second copy of 25 URLs would
 * drift — silently, and in the direction of watching a page nobody cites.
 */
function loadSources() {
  const src = fs.readFileSync(path.join(ROOT, "lib", "tdlr-sources.ts"), "utf8");
  /**
   * Split on entry boundaries and parse each block independently, rather than
   * one regex spanning the whole record. A single spanning pattern silently
   * DROPPED an entry whose fields were ordered differently — and a watcher that
   * quietly stops watching one page is the worst failure this script has, since
   * it looks identical to that page never changing.
   */
  /**
   * Slice between `id:` occurrences rather than on `{` boundaries. An entry
   * carrying a comment between its brace and its id defeated every
   * brace-anchored pattern I tried, and it defeated them SILENTLY — the source
   * simply vanished from the watch list, which looks identical to a page that
   * never changes. Anchoring on the field that must exist removes the class of
   * bug rather than the instance.
   */
  const marks = [...src.matchAll(/id:\s*"([^"]+)"/g)];
  const out = [];
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].index;
    const end = i + 1 < marks.length ? marks[i + 1].index : src.length;
    const block = src.slice(start, end);
    const pick = (field) => (new RegExp(field + ':\\s*"([^"]+)"').exec(block) || [])[1] || null;
    const url = pick("url");
    if (!url) continue;
    const settlesRaw = (/settles:\s*\[([\s\S]*?)\]/.exec(block) || [])[1] || "";
    out.push({
      id: marks[i][1],
      url: url.replace(/&amp;/g, "&"),
      title: pick("title") || marks[i][1],
      settles: [...settlesRaw.matchAll(/"([^"]+)"/g)].map((x) => x[1]),
      checked: pick("checked") || "",
    });
  }
  return out;
}

/* --------------------------------------------------------------- extraction */

/**
 * The claim kinds worth watching. Each is a number a person acts on — money
 * they pay, time they must complete, a threshold they must clear, or the rule
 * that binds them. Deliberately narrow: every additional pattern is more
 * surface for false positives, and a false positive here becomes a video.
 */
const PATTERNS = [
  { kind: "fee", re: /\$\s?([\d,]+(?:\.\d{2})?)/g },
  { kind: "hours", re: /([\d,]+)\s+hours?\b/gi },
  { kind: "days", re: /\b(\d+)\s+(?:calendar\s+|business\s+)?days?\b/gi },
  { kind: "months", re: /\b(\d+)\s+months?\b/gi },
  { kind: "years", re: /\b(\d+)\s+years?\b/gi },
  { kind: "percent", re: /\b(\d+(?:\.\d+)?)\s?%/g },
  { kind: "rule", re: /\b(\d{2}\.\d{1,3}(?:\([a-z0-9]\))?)\b/g },
];

const stripHtml = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * The identity of a claim: the words immediately before it, lowercased, with
 * every digit removed. Digits must go — otherwise the key contains the value
 * and a changed fee looks like a brand new claim rather than a changed one,
 * which is the difference between "fee rose to $92" and "a $92 fee appeared".
 */
function claimKey(text, index) {
  const before = text.slice(Math.max(0, index - 70), index);
  return before
    .toLowerCase()
    .replace(/[\d$%,.]/g, " ")
    .replace(/[^a-z ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(-6)
    .join(" ");
}

function extractClaims(text) {
  const claims = {};
  for (const { kind, re } of PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const key = claimKey(text, m.index);
      // A key with fewer than three words is not distinctive enough to track;
      // it will collide with unrelated numbers elsewhere on the page.
      if (key.split(" ").length < 3) continue;
      claims[`${kind}::${key}`] = m[1].replace(/,/g, "");
    }
  }
  return claims;
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ShearQuery-Monitor" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get("content-type") || "";
  if (/pdf/i.test(type) || /\.pdf$/i.test(url)) {
    const { PDFParse } = require("pdf-parse");
    const buf = Buffer.from(await res.arrayBuffer());
    const p = new PDFParse({ data: buf });
    const r = await p.getText();
    await p.destroy();
    return r.text.replace(/\s+/g, " ").trim();
  }
  return stripHtml(await res.text());
}

/* ----------------------------------------------------------- classification */

/**
 * Card-worthiness. All five must hold — see the theory note in the header.
 * The thresholds are OURS and are meant to be argued with; they are set so a
 * rounding correction never becomes a video.
 */
function classify(kind, before, after) {
  const a = parseFloat(before), b = parseFloat(after);
  if (!isFinite(a) || !isFinite(b) || a === 0) {
    return { bucket: "WATCH", why: "value is not numerically comparable" };
  }
  const delta = Math.abs(b - a) / a;

  // A rule number changing is always material — it means the citation on our
  // pages now points somewhere else.
  if (kind === "rule") return { bucket: "CARD", why: "a cited rule number changed", delta };

  // Money and required time are what people act on.
  const actionable = ["fee", "hours", "days", "months", "years", "percent"].includes(kind);
  if (!actionable) return { bucket: "WATCH", why: "not a figure anyone acts on", delta };

  if (delta < 0.05) return { bucket: "WATCH", why: `moved ${(delta * 100).toFixed(1)}% — under the 5% floor`, delta };
  return { bucket: "CARD", why: `${kind} moved ${(delta * 100).toFixed(0)}%`, delta };
}

/* -------------------------------------------------------------------- main */

async function main() {
  fs.mkdirSync(SNAP_DIR, { recursive: true });
  const sources = loadSources().filter((s) => !ONLY || s.id === ONLY);
  if (!sources.length) { console.error(`No source matching "${ONLY}"`); process.exit(1); }

  const results = [];
  for (const s of sources) {
    const snapPath = path.join(SNAP_DIR, `${s.id}.json`);
    let text;
    try {
      text = await fetchText(s.url);
    } catch (e) {
      results.push({ id: s.id, status: "UNREACHABLE", detail: e.message });
      console.log(`  ${s.id.padEnd(28)} UNREACHABLE  ${e.message}`);
      continue;
    }

    const claims = extractClaims(text);
    const prior = fs.existsSync(snapPath) ? JSON.parse(fs.readFileSync(snapPath, "utf8")) : null;

    if (!prior || BASELINE) {
      fs.writeFileSync(snapPath, JSON.stringify({ id: s.id, url: s.url, fetchedAt: new Date().toISOString(), claims }, null, 2) + "\n");
      results.push({ id: s.id, status: "BASELINE", claimCount: Object.keys(claims).length });
      console.log(`  ${s.id.padEnd(28)} BASELINE     ${Object.keys(claims).length} claims`);
      continue;
    }

    const changes = [];
    for (const [k, v] of Object.entries(claims)) {
      const was = prior.claims[k];
      if (was === undefined) continue;              // new claim — see below
      if (was === v) continue;
      const [kind] = k.split("::");
      changes.push({ key: k, kind, before: was, after: v, ...classify(kind, was, v) });
    }
    const added = Object.keys(claims).filter((k) => prior.claims[k] === undefined);
    const removed = Object.keys(prior.claims).filter((k) => claims[k] === undefined);

    fs.writeFileSync(snapPath, JSON.stringify({ id: s.id, url: s.url, fetchedAt: new Date().toISOString(), claims }, null, 2) + "\n");

    const cards = changes.filter((c) => c.bucket === "CARD");
    results.push({ id: s.id, title: s.title, url: s.url, settles: s.settles, status: "CHECKED", changes, added: added.length, removed: removed.length });

    const flag = cards.length ? `${cards.length} CARD` : changes.length ? `${changes.length} watch` : "no change";
    console.log(`  ${s.id.padEnd(28)} ${String(Object.keys(claims).length).padStart(3)} claims   ${flag}${added.length || removed.length ? `   (+${added.length}/-${removed.length} keys)` : ""}`);
    for (const c of cards) {
      console.log(`      CARD  ${c.kind}  ${c.before} -> ${c.after}   ${c.why}`);
      console.log(`            "${c.key.split("::")[1]}"`);
    }
  }

  /**
   * Candidates carry the FACTS only. The label, punch and question are left
   * null on purpose — a diff has no business authoring the sentence around a
   * number, and a null is a visible gap where an invented line would not be.
   */
  const candidates = [];
  for (const r of results) {
    for (const c of (r.changes || []).filter((x) => x.bucket === "CARD")) {
      candidates.push({
        id: `${r.id}--${c.key.replace(/[^a-z0-9]+/gi, "-").slice(0, 48)}`,
        detectedAt: new Date().toISOString(),
        chip: "Texas · TDLR",
        stat: c.kind === "fee" ? `$${c.after}` : String(c.after),
        was: c.before,
        kind: c.kind,
        context: c.key.split("::")[1],
        source: `Source: TDLR · ${r.title}`,
        sourceUrl: r.url,
        settles: r.settles,
        label: null,
        punch: null,
        question: null,
        approved: false,
      });
    }
  }

  if (candidates.length) {
    const existing = (() => { try { return JSON.parse(fs.readFileSync(CANDIDATES, "utf8")); } catch { return []; } })();
    const byId = new Map(existing.map((c) => [c.id, c]));
    for (const c of candidates) if (!byId.has(c.id)) byId.set(c.id, c);
    fs.mkdirSync(path.dirname(CANDIDATES), { recursive: true });
    fs.writeFileSync(CANDIDATES, JSON.stringify([...byId.values()], null, 2) + "\n");
  }

  if (AS_JSON) { console.log(JSON.stringify(results, null, 2)); return; }

  const totalCards = results.reduce((n, r) => n + (r.changes || []).filter((c) => c.bucket === "CARD").length, 0);
  const totalWatch = results.reduce((n, r) => n + (r.changes || []).filter((c) => c.bucket === "WATCH").length, 0);
  const stale = results.filter((r) => (r.changes || []).length).map((r) => r.id);

  console.log(`\n  ${results.length} sources · ${totalCards} card candidates · ${totalWatch} watch`);
  if (candidates.length) console.log(`  candidates -> ${path.relative(ROOT, CANDIDATES)}  (label/punch/question are null — author them, then approve)`);
  if (stale.length) {
    console.log(`\n  PAGES THAT MAY NOW BE STALE ON THIS SITE — anything citing:`);
    for (const id of stale) console.log(`    ${id}`);
  }
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
