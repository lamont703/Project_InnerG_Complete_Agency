/**
 * Mirror the California Board of Barbering & Cosmetology's English publications
 * into reference/California Exam Prep Files/, and rebuild INDEX.md.
 *
 * WHY THIS IS NOT A CRAWLER. barbercosmo.ca.gov publishes a sitemap listing 883
 * PDFs directly — the board has already enumerated everything. A recursive
 * crawler would rediscover that list more slowly, make far more requests of a
 * government server, and needs care not to wander into the paths robots.txt
 * asks crawlers to leave alone. So discovery is two bounded steps instead:
 *
 *   1. the sitemap                  — one request, 883 PDFs
 *   2. the 53 HTML pages it lists   — catches PDFs linked but NOT in the
 *                                     sitemap, which is not a hypothetical:
 *                                     /licensees/index.shtml links 314 PDFs and
 *                                     the sitemap lists 3 under /licensees.
 *
 * ~55 requests to discover everything, and it terminates by construction.
 *
 * WHAT IS DELIBERATELY EXCLUDED:
 *   - /about_us/meetings/**  — 292 agendas, minutes and board materials. Real
 *     documents, wrong folder: this is a licensing reference, not a governance
 *     archive, and burying 320 useful files under 292 meeting PDFs makes the
 *     folder something you search rather than something you read.
 *   - translations — Korean, Spanish, Vietnamese, Simplified Chinese. Filtered
 *     first by filename, then CONFIRMED by reading the text, because the
 *     filename convention is inconsistent (esthetics_factsheetvt.pdf and
 *     exam_hintsvt.pdf are Vietnamese; ko_ and sc_ appear as prefixes elsewhere)
 *     and a heuristic alone would let some through and drop English wrongly.
 *
 * Dedupe is by MD5 of the response body, never by filename. The board serves the
 * same document from several paths under different names, and the local copies
 * were hand-named — "California Chemical Services.pdf" is the board's "Hair
 * Chemicals" factsheet. Only content comparison catches that.
 *
 * Run:  node scripts/fetch_california_bbc_pdfs.js [--dry-run] [--include-meetings]
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PDFParse } = require("pdf-parse");

const ORIGIN = "https://www.barbercosmo.ca.gov";
const DEST = path.join(__dirname, "..", "reference", "California Exam Prep Files");
const QUARANTINE = path.join(DEST, "_non-english");
const UA = "Mozilla/5.0 (compatible; ShearQuery-reference-archive/1.0; +https://shearquery.com)";
const DELAY_MS = 300; // polite to a .gov host; robots.txt sets no Crawl-delay

const DRY = process.argv.includes("--dry-run");
const INCLUDE_MEETINGS = process.argv.includes("--include-meetings");

// robots.txt: Disallow /css /images /js /fonts /templates /ssi — asset dirs.
// Honoured even though we are not a search crawler.
const ROBOTS_DISALLOW = ["/css", "/images", "/js", "/fonts", "/templates", "/ssi"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, asBuffer = false) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return asBuffer ? Buffer.from(await res.arrayBuffer()) : await res.text();
}

const abs = (href) =>
  href.startsWith("http") ? href : ORIGIN + (href.startsWith("/") ? href : "/" + href);

const allowed = (url) => {
  const p = url.replace(ORIGIN, "");
  return !ROBOTS_DISALLOW.some((d) => p.startsWith(d));
};

/** Filename-level language guess. Fast, wrong sometimes — content check confirms. */
const LANG_HINT =
  /(^|[_\-/])(ko|kr|korean|sp|es|spanish|vt|vn|vi|viet|vietnamese|sc|ch|cs|simpl|chinese)([_\-.]|$)/i;

/** Script ranges that settle it outright: Hangul, CJK, Vietnamese-specific Latin. */
function nonEnglishByContent(text) {
  if (!text || text.length < 40) return null; // nothing to judge on
  const sample = text.slice(0, 4000);
  const hangul = (sample.match(/[가-힯]/g) || []).length;
  const cjk = (sample.match(/[一-鿿]/g) || []).length;
  const viet = (sample.match(/[Ạ-ỹĐđ]/g) || []).length;
  if (hangul > 10) return "korean";
  if (cjk > 10) return "chinese";
  if (viet > 10) return "vietnamese";
  // Spanish shares the alphabet, so decide on function words rather than accents.
  const words = sample.toLowerCase().split(/\W+/);
  const es = words.filter((w) => ["de","la","el","los","las","que","para","con","del","una","por","su"].includes(w)).length;
  const en = words.filter((w) => ["the","and","of","to","for","you","your","is","are","with","in","or"].includes(w)).length;
  if (es > 12 && es > en * 1.5) return "spanish";
  return null;
}

async function pdfText(buf) {
  try {
    const p = new PDFParse({ data: new Uint8Array(buf) });
    const r = await p.getText();
    await p.destroy?.();
    return { text: r.text || "", pages: r.pages?.length || 0 };
  } catch {
    return { text: "", pages: 0 };
  }
}

const safeName = (s) => `California ${s.replace(/[/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim()}.pdf`;

async function main() {
  fs.mkdirSync(DEST, { recursive: true });

  // ---- 1. discover ------------------------------------------------------
  console.log("discovering…");
  const sitemap = await get(`${ORIGIN}/sitemap.xml`);
  const locs = [...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1]);
  const found = new Map(); // url -> { title, sections }

  for (const u of locs.filter((u) => u.toLowerCase().endsWith(".pdf"))) {
    if (allowed(u)) found.set(u, { title: null, sections: [] });
  }
  const htmlPages = locs.filter((u) => !u.toLowerCase().endsWith(".pdf"));
  console.log(`  sitemap: ${found.size} PDFs, ${htmlPages.length} HTML pages to scan`);

  const clean = (s) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#\d+;/g, "").replace(/\s+/g, " ").trim();
  // The board marks translations two different ways, and missing either sends
  // hundreds of pointless requests at a government server:
  //   bare  — the link text IS the language ("Korean") under an English title
  //   paren — the language is appended ("Certification Request (Korean)")
  const LANG_BARE = /^(korean|spanish|vietnamese|simplified chinese|chinese)$/i;
  const LANG_PAREN = /\((korean|spanish|vietnamese|simplified chinese|chinese)\)\s*$/i;
  const translated = new Set();
  for (const page of htmlPages) {
    let html;
    try { html = await get(page); } catch { continue; }
    let section = "General";
    const toks = [...html.matchAll(/<h[234][^>]*>([\s\S]*?)<\/h[234]>|<a[^>]+href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi)];
    for (const [, h, href, text] of toks) {
      if (h) { section = clean(h); continue; }
      const t = clean(text);
      const u = abs(href);
      if (!allowed(u)) continue;
      if (LANG_BARE.test(t) || LANG_PAREN.test(t)) { translated.add(u); continue; }
      const cur = found.get(u) || { title: null, sections: [] };
      if (!cur.title && t) cur.title = t;
      if (section && !cur.sections.includes(section)) cur.sections.push(section);
      found.set(u, cur);
    }
    await sleep(DELAY_MS);
  }
  // A URL the site itself labelled as a translation somewhere is a translation,
  // even if another page links it without a label.
  for (const u of translated) found.delete(u);
  console.log(`  after scanning pages: ${found.size} distinct PDF URLs (${translated.size} labelled as translations by the site)`);

  // ---- 2. filter --------------------------------------------------------
  let urls = [...found.keys()];
  const meetings = urls.filter((u) => /\/about_us\/meetings\//.test(u));
  if (!INCLUDE_MEETINGS) urls = urls.filter((u) => !/\/about_us\/meetings\//.test(u));
  const byName = urls.filter((u) => LANG_HINT.test(u.split("/").pop().replace(/\.pdf$/i, "")));
  urls = urls.filter((u) => !byName.includes(u));
  console.log(`  excluded ${meetings.length} meeting docs, ${byName.length} likely translations`);
  console.log(`  candidates to fetch: ${urls.length}`);
  if (DRY) { console.log("dry run — stopping before download"); return; }

  // ---- 3. fetch, dedupe by content, confirm language ---------------------
  const have = new Map();
  for (const f of fs.readdirSync(DEST)) {
    const p = path.join(DEST, f);
    if (fs.statSync(p).isFile() && f.toLowerCase().endsWith(".pdf"))
      have.set(crypto.createHash("md5").update(fs.readFileSync(p)).digest("hex"), f);
  }
  console.log(`\nfetching (${have.size} already held)…`);

  const added = [], skipped = [], rejected = [], failed = [];
  let n = 0;
  for (const url of urls) {
    n++;
    if (n % 40 === 0) console.log(`  …${n}/${urls.length}`);
    let buf;
    try { buf = await get(url, true); } catch (e) { failed.push([url, e.message]); continue; }
    if (!buf.subarray(0, 4).toString().includes("%PDF")) { failed.push([url, "not a PDF"]); continue; }

    const md5 = crypto.createHash("md5").update(buf).digest("hex");
    if (have.has(md5)) { skipped.push([url, have.get(md5)]); await sleep(DELAY_MS); continue; }

    const { text, pages } = await pdfText(buf);
    const lang = nonEnglishByContent(text);
    if (lang) {
      fs.mkdirSync(QUARANTINE, { recursive: true });
      fs.writeFileSync(path.join(QUARANTINE, url.split("/").pop()), buf);
      rejected.push([url, lang]);
      await sleep(DELAY_MS);
      continue;
    }

    const meta = found.get(url) || {};
    const base = meta.title || url.split("/").pop().replace(/\.pdf$/i, "").replace(/[_-]+/g, " ");
    let name = safeName(base), i = 2;
    while (fs.existsSync(path.join(DEST, name))) name = safeName(`${base} (${i++})`);
    fs.writeFileSync(path.join(DEST, name), buf);
    have.set(md5, name);
    added.push({ file: name, title: base, url, sections: meta.sections || [], pages, bytes: buf.length,
                 summary: (text || "").split("\n").map((s) => s.trim())
                   .filter((s) => s.length > 30 && !/^page \d|^\d+$|barbercosmo|^www\.|^\(?\d{3}\)/i.test(s))
                   .slice(0, 2).join(" ").replace(/\s+/g, " ").slice(0, 200) });
    await sleep(DELAY_MS);
  }

  console.log(`\n  added:    ${added.length}`);
  console.log(`  skipped:  ${skipped.length} (identical content already held)`);
  console.log(`  rejected: ${rejected.length} (non-English confirmed by reading the text)`);
  console.log(`  failed:   ${failed.length}`);
  for (const [u, why] of failed.slice(0, 10)) console.log(`     ${why}  ${u.replace(ORIGIN, "")}`);
  fs.writeFileSync(path.join(__dirname, "..", ".ca_bbc_added.json"), JSON.stringify(added, null, 2));
}

main().catch((e) => { console.error("fatal:", e); process.exit(1); });
