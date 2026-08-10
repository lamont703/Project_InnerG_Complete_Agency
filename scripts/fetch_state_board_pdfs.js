/**
 * Mirror a state licensing board's English publications into reference/<folder>/
 * and write an INDEX.md describing each one.
 *
 * Generalised from the California-only version because the plan is 50 states,
 * and the second state should not be a copy-paste of the first. Per-board
 * differences live in STATES below; the discovery, filtering, dedupe and
 * indexing logic is shared.
 *
 *   node scripts/fetch_state_board_pdfs.js california [--dry-run]
 *   node scripts/fetch_state_board_pdfs.js maryland   [--dry-run]
 *
 * WHY NOT A CRAWLER. Both boards publish sitemaps, so a recursive crawler would
 * rediscover a list the board already maintains at far more cost to a government
 * server. But the sitemap alone is not enough: on barbercosmo.ca.gov, scanning
 * the 53 HTML pages it names turned up 1,617 PDFs against the sitemap's 883 —
 * 45% linked but unlisted. So discovery is two bounded steps (sitemap, then only
 * the HTML pages it names), which terminates by construction rather than by a
 * depth limit, and is re-runnable without surprises.
 *
 * A NOTE ON DEAD LINKS, AND ON BLAMING THE SOURCE. This header used to claim
 * "607 of California's PDFs return 404 — the board's sitemap is stale". That was
 * wrong, and wrong in the most embarrassing direction: 598 of those 404s were
 * this script requesting URLs it had built incorrectly. Links on
 * /laws_regs/index.shtml are written relative ("fsor_disciplinary_guidelines.pdf")
 * and were being resolved against the site root instead of the page. Fixing
 * resolution took candidates from 873 to 317, dead links from 607 to 9, and
 * recovered 42 real documents including a complete rulemaking package.
 *
 * Six of the original 404s were spot-checked and were genuine, which is exactly
 * how the wrong conclusion survived: a real sample, drawn from the wrong subset.
 * Nine dead links remain and those are the board's. When discovery code reports
 * that a source is broken, suspect the code first.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PDFParse } = require("pdf-parse");

const STATES = {
  california: {
    label: "California Board of Barbering & Cosmetology",
    origin: "https://www.barbercosmo.ca.gov",
    folder: "California Exam Prep Files",
    // Every path on the site is in scope.
    inScope: () => true,
    // Board governance, not licensing reference. ~297 documents that would bury
    // the useful files and turn a reference into an archive you have to search.
    exclude: (u) => /\/about_us\/meetings\//.test(u),
    robotsDisallow: ["/css", "/images", "/js", "/fonts", "/templates", "/ssi"],
    // PSI delivers California's exams and runs its own candidate portal at
    // test-takers.psiexams.com/cabacos. It is a JavaScript app with no sitemap
    // and no PDF links in its served HTML — everything comes from an API. So
    // discovery there means reading the API the app itself calls, found by
    // watching its network traffic. Yield is small (5 PDFs, 4 of them
    // translations) but it is the only place the board's ID-requirements and
    // reciprocity notices are published.
    jsonSources: ["https://test-takers.psiexams.com/api/account/cabacos/content"],
    // PSI's client code for this board. Unlocks the Candidate Information
    // Bulletins, which are the single most valuable documents here and are NOT
    // reachable from the board site or from any page's HTML — see psiBulletins().
    psiPortal: "cabacos",
    // A sister state agency, not a vendor. /forms_pubs/index.shtml links the
    // workplace posting that every establishment is legally required to display,
    // and it is hosted by the Department of Industrial Relations rather than the
    // board. dir.ca.gov's robots.txt permits /dlse/publications/.
    docHosts: ["https://www.dir.ca.gov/dlse/publications/"],
    // The Act and the regulations are HTML on external legal sites, not PDFs.
    // These two pages are complete section indexes — 145 B&P Code sections and
    // 80 of 16 CCR Division 9 — so we capture the MAP (number, title, url) and
    // deliberately not the text. leginfo and Westlaw are authoritative and
    // amended without notice; a local copy would be a stale duplicate of the
    // one thing that must never be stale. This is California's lib/tdlr-sources.
    lawIndex: [
      { page: "/laws_regs/laws.shtml", host: "leginfo", heading: "Act — Business & Professions Code" },
      { page: "/laws_regs/act_regs.shtml", host: "westlaw", heading: "Regulations — 16 CCR Division 9" },
    ],
    notes: null,
  },
  maryland: {
    label: "Maryland Board of Barbers and Board of Cosmetologists",
    origin: "https://labor.maryland.gov",
    folder: "Maryland Exam Prep Files",
    // labor.maryland.gov is the whole Department of Labor — 32,425 sitemap URLs
    // covering contractors, real estate, CPAs and more. Scope to the two boards.
    // The two board sections, PLUS their law pages, which live under
    // /license/law/ and are linked from every page's section menu as "Laws &
    // Regulations". A filter on /license/(barbers|cos)/ alone silently drops
    // the statutory basis for both boards.
    inScope: (u) => /\/license\/(barbers|cos)(\/|$)/.test(u) || /\/license\/law\/(barbers|cos)law\.shtml$/.test(u),
    exclude: () => false,
    robotsDisallow: [
      "/DLLR%20Forms/", "/DLLR/javascript/", "/DLLR/cfdocs/", "/DLLR/downfiles/",
      "/DLLR/secdocs/", "/ELS_applications/cgi-bin/", "/ELS_applications_Docs/",
      "/GWIB/javascript/", "/WiaWeb/",
    ],
    // PSI's client code for BOTH Maryland boards. The account is named
    // "Maryland Cosmetology" but carries the barber exams too — MD Barber,
    // MD Barber Stylist and MD Master Barber Theory all live under it. The
    // board's own barbers exam page links no barber bulletin at all, only
    // cosmetology documents, so this portal is the ONLY route to them.
    // Found by probing candidate codes: a real one returns application/json,
    // a wrong one returns application/problem+json, which is easy to misread
    // as a hit because the word "json" appears in both.
    psiPortal: "mdcos",
    // Recorded because it should travel with the documents, not be rediscovered.
    notes:
      "labor.maryland.gov's robots.txt carries `Content-Signal: ai-train=no, " +
      "search=yes, ai-input=no`. Crawling is permitted and these are public " +
      "government publications, but the department has expressed that it does " +
      "not want its content used to train models or fed to AI systems as input. " +
      "Treat that as binding on downstream use: cite and link these documents, " +
      "do not pipe them into the AI chat, the MCP server or the .md layer.",
  },
};

const key = process.argv[2];
const CFG = STATES[key];
if (!CFG) {
  console.error(`usage: node scripts/fetch_state_board_pdfs.js <${Object.keys(STATES).join("|")}> [--dry-run]`);
  process.exit(1);
}
const DRY = process.argv.includes("--dry-run");
// Skip sitemap/HTML discovery and pull only the JSON API sources. Exists so a
// small, fast-moving source can be re-checked without a 900-URL crawl.
const SOURCES_ONLY = process.argv.includes("--sources-only");
const DEST = path.join(__dirname, "..", "reference", CFG.folder);
/**
 * Provenance for every file ever fetched, kept beside the PDFs.
 *
 * Without this, a partial run (--sources-only, or an interrupted one) rebuilds
 * INDEX.md knowing only the handful of files IT fetched, and every other
 * document collapses into "Added manually" with no source URL — destroying
 * exactly what the index exists to record. Learned by doing it: one
 * --sources-only run took California's index from richly grouped to 2 groups.
 */
const PROV = path.join(DEST, ".provenance.json");
const QUARANTINE = path.join(DEST, "_non-english");
const UA = "Mozilla/5.0 (compatible; ShearQuery-reference-archive/1.0; +https://shearquery.com)";
const DELAY_MS = 300;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/**
 * Resolve an href against the page it appeared on, not against the site root.
 *
 * A link written "../consumers/x.pdf" on /licensees/index.shtml is
 * /consumers/x.pdf. Treating every relative href as root-relative produced
 * "/../consumers/x.pdf" — which the server happily served, so the download
 * worked and only the recorded URL was wrong, splitting one directory into two
 * groups in the index. new URL() collapses the dot segments correctly.
 */
const abs = (h, base) => {
  try { return new URL(h, base || CFG.origin).href; }
  catch { return h.startsWith("http") ? h : CFG.origin + (h.startsWith("/") ? h : "/" + h); }
};

/**
 * Hosts other than the board's own that we will fetch a linked PDF from.
 *
 * NOT general off-site crawling — an explicit, short allowlist. It exists
 * because the documents that matter most are frequently not on the board's
 * server at all: Maryland links its four PSI Candidate Information Bulletins
 * straight to proctor2.psionline.com, and those bulletins are the source a kit
 * list is built from. A same-host-only rule silently drops exactly the files
 * worth having, which is the worst possible failure mode — it looks like success.
 *
 * Only ever followed when the BOARD links to it. We never crawl these hosts.
 */
const DOC_HOSTS = ["https://proctor2.psionline.com", "https://candidate.psiexams.com", "https://test-takers.psiexams.com"];

const knownHost = (u) =>
  u.startsWith(CFG.origin) ||
  DOC_HOSTS.some((h) => u.startsWith(h)) ||          // exam vendor, common to all states
  (CFG.docHosts || []).some((h) => u.startsWith(h)); // sister agencies, state-specific
const allowed = (u) =>
  knownHost(u) && !CFG.robotsDisallow.some((d) => u.replace(CFG.origin, "").startsWith(d));
// Named entities matter here because this text becomes a FILENAME. The board
// writes "2024 &ndash; Issue No. 6", and decoding only &amp; and numerics left
// twelve newsletters on disk called "California 2024 &ndash; Issue No. 6.pdf".
const ENTITIES = { amp: "&", nbsp: " ", ndash: "\u2013", mdash: "\u2014", lsquo: "\u2018",
  rsquo: "\u2019", ldquo: "\u201c", rdquo: "\u201d", hellip: "\u2026", quot: '"',
  apos: "'", lt: "<", gt: ">", deg: "\u00b0", sect: "\u00a7", bull: "\u2022" };
const clean = (s) =>
  s.replace(/<[^>]+>/g, "")
   .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
   .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
   .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
   .replace(/\s+/g, " ")
   .trim();

async function get(url, buf = false) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return buf ? Buffer.from(await res.arrayBuffer()) : await res.text();
}

// Boards label translations two ways and missing either sends hundreds of
// pointless requests at a .gov host: the link text IS the language ("Korean"),
// or it is appended ("Certification Request (Korean)").
const LANG_BARE = /^(korean|spanish|vietnamese|simplified chinese|chinese|español)$/i;
const LANG_PAREN = /\((korean|spanish|vietnamese|simplified chinese|chinese|español)\)\s*$/i;
const LANG_FILE = /(^|[_\-/])(ko|kr|korean|sp|es|spanish|vt|vn|vi|viet|vietnamese|sc|ch|cs|simpl|chinese)([_\-.]|$)/i;

/**
 * The arbiter: what the document actually reads as. Filenames lie.
 *
 * MULTILINGUAL DOCUMENTS COUNT AS ENGLISH. PSI publishes some notices with the
 * English text first and Korean, Spanish and Chinese versions appended in the
 * same PDF. Judging on "does another script appear anywhere" rejected exactly
 * such a file — California's ID-requirements notice, which opens "Attention
 * California Board of Barbering and Cosmetology Examination and Reciprocity
 * Candidates". So a strong English signal wins outright; the script checks only
 * decide documents that are NOT substantially English.
 */
function nonEnglish(text) {
  if (!text || text.length < 40) return null;
  const s = text.slice(0, 6000);
  const w = s.toLowerCase().split(/\W+/);
  const en = w.filter((x) => ["the","and","of","to","for","you","your","is","are","with","in","or","must","not","be"].includes(x)).length;
  if (en >= 25) return null; // reads as English, whatever else it also contains

  if ((s.match(/[가-힯]/g) || []).length > 10) return "korean";
  if ((s.match(/[一-鿿]/g) || []).length > 10) return "chinese";
  if ((s.match(/[Ạ-ỹĐđ]/g) || []).length > 10) return "vietnamese";
  const es = w.filter((x) => ["de","la","el","los","las","que","para","con","del","una","por","su"].includes(x)).length;
  return es > 12 && es > en * 1.5 ? "spanish" : null;
}

async function readPdf(buf) {
  try {
    const p = new PDFParse({ data: new Uint8Array(buf) });
    const r = await p.getText();
    await p.destroy?.();
    return { text: r.text || "", pages: r.pages?.length || 0 };
  } catch { return { text: "", pages: 0 }; }
}

const prettyName = (s) => `${CFG.folder.split(" ")[0]} ${s.replace(/[/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim()}.pdf`;
/** The document's own first heading — better than a filename slug as a title. */
const titleFromText = (t) => {
  // Some board PDFs open with document properties rather than a heading —
  // "Author: …, Last updated: 2/2023 Nicole Fletcher -LABOR-" is a real first
  // line here, and naming a file after it would be worse than the slug.
  const META = /^(author|last updated|created|modified|subject|keywords|title)\s*[:\t]|last updated:|-LABOR-/i;
  const line = (t || "").split("\n").map((x) => x.trim())
    .find((x) => x.length > 8 && x.length < 90 && /[A-Za-z]/.test(x)
      && !/^page \d|^\d+$|^www\.|^https?:/i.test(x) && !META.test(x));
  if (!line) return null;
  // Boards shout their headings; Title Case reads better in an index.
  return /^[^a-z]+$/.test(line)
    ? line.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())
    : line;
};

const summarise = (t) => (t || "").split("\n").map((x) => x.trim())
  .filter((x) => x.length > 30 && !/^page \d|^\d+$|^www\.|^\(?\d{3}\)/i.test(x))
  .slice(0, 2).join(" ").replace(/\s+/g, " ").slice(0, 200);

async function main() {
  fs.mkdirSync(DEST, { recursive: true });
  console.log(`${CFG.label}\n  → reference/${CFG.folder}\n`);

  // ---- discover ---------------------------------------------------------
  const sm = SOURCES_ONLY ? "" : await get(`${CFG.origin}/sitemap.xml`);
  const locs = [...sm.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1]).filter(CFG.inScope);
  const found = new Map();
  for (const u of locs.filter((u) => u.toLowerCase().endsWith(".pdf"))) if (allowed(u)) found.set(u, { title: null, section: null });
  const pages = locs.filter((u) => !u.toLowerCase().endsWith(".pdf") && allowed(u));
  console.log(`  sitemap (in scope): ${found.size} PDFs, ${pages.length} HTML pages to scan`);

  /**
   * ONE extra level of HTML discovery, and only one.
   *
   * The sitemap's page list is incomplete in the same way its PDF list is: on
   * barbercosmo.ca.gov, 24 .shtml pages are linked from listed pages but are
   * not themselves listed — including /forms_pubs/publications/index.shtml,
   * which alone holds 13 documents (every board newsletter since 2023 plus the
   * 2026 Sunset Review Report) that nothing else links to.
   *
   * Deliberately not recursive. Fixed at one additional hop so the crawl still
   * terminates by construction rather than by a depth counter, which is the
   * whole reason for preferring this over a crawler.
   */
  if (!SOURCES_ONLY) {
    const seenPage = new Set(pages);
    const extra = [];
    for (const u of pages) {
      let html;
      try { html = await get(u); } catch { continue; }
      for (const [, href] of html.matchAll(/href="([^"]+\.shtml)"/gi)) {
        let abs2;
        try { abs2 = new URL(href, u).href; } catch { continue; }
        if (seenPage.has(abs2) || !allowed(abs2) || !CFG.inScope(abs2)) continue;
        seenPage.add(abs2); extra.push(abs2);
      }
      await sleep(DELAY_MS);
    }
    if (extra.length) {
      pages.push(...extra);
      console.log(`  + ${extra.length} pages linked but not listed in the sitemap`);
    }
  }

  const translated = new Set();
  for (const page of pages) {
    let html;
    try { html = await get(page); } catch { continue; }
    let section = null;
    for (const [, h, href, text] of html.matchAll(/<h[1234][^>]*>([\s\S]*?)<\/h[1234]>|<a[^>]+href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi)) {
      if (h) { section = clean(h) || section; continue; }
      const t = clean(text), u = abs(href, page);
      // SCOPE CONSTRAINS WHICH PAGES WE CRAWL, NOT WHICH DOCUMENTS WE ACCEPT.
      // The page we are reading is already in scope; a PDF it links is on-topic
      // by virtue of the board linking it, wherever the file happens to sit.
      // Applying inScope to the document too dropped Maryland's combined
      // barber/cosmetology sanitation guide and its complaint form, both linked
      // from board pages but filed under /forms/ — and dropped them silently.
      if (!allowed(u)) continue;
      if (LANG_BARE.test(t) || LANG_PAREN.test(t)) { translated.add(u); continue; }
      const cur = found.get(u) || { title: null, section: null };
      if (!cur.title && t) cur.title = t;
      if (!cur.section && section) cur.section = section;
      found.set(u, cur);
    }
    await sleep(DELAY_MS);
  }
  for (const u of translated) found.delete(u);
  console.log(`  after scanning pages: ${found.size} PDFs (${translated.size} labelled as translations by the site)`);

  for (const api of CFG.jsonSources || []) {
    try {
      const body = await get(api);
      // Spaces are legal in these URLs and PSI uses them —
      // ".../CADCA/CABBCReciprocity phone.pdf" is real. A pattern that stops at
      // whitespace silently drops it, so match non-greedily up to ".pdf" and
      // percent-encode afterwards.
      const urls = [...new Set((body.match(/https?:\/\/[^"'<>\\]+?\.pdf/gi) || []))]
        .map((u) => u.replace(/\\u0026/g, "&").trim().replace(/ /g, "%20"));
      let kept = 0;
      for (const u of urls) {
        if (!allowed(u)) continue;              // must be an allowlisted doc host
        if (found.has(u)) continue;
        found.set(u, { title: null, section: "PSI candidate portal" });
        kept++;
      }
      console.log(`  ${api.split("/").slice(2, 3)}: ${urls.length} PDFs, ${kept} new`);
    } catch (e) {
      console.log(`  ${api}: FAILED (${e.message})`);
    }
  }

  // ---- PSI candidate bulletins -----------------------------------------
  // Three hops, none of them guessable, and the first two return JSON that
  // mentions no PDF at all:
  //   /api/account/{client}/test            -> tests, each with a globalTestId
  //   /api/account/{client}/test/{id}       -> mentions bulletin/{n}
  //   /api/content/bulletin/{n}             -> the PDF
  // Nothing links these from the board site, the portal's served HTML contains
  // no PDF links, and every unknown /api/ path returns the SPA shell with a 200
  // so probing tells you nothing. Found only by opening a test page in a browser
  // and reading the rendered DOM. Recorded here so it never has to be
  // rediscovered — CLAUDE.md already notes the equivalent Texas ids (701-715),
  // and California's are entirely different (916, 930, 940-942, 11070).
  if (CFG.psiPortal && !DRY) {
    try {
      const base = `https://test-takers.psiexams.com/api/account/${CFG.psiPortal}`;
      const tests = JSON.parse(await get(`${base}/test`));
      const english = tests.filter((t) => !LANG_BARE.test(t.name) && !/\b(korean|spanish|vietnamese|simplified chinese|chinese)\b/i.test(t.name));
      let n = 0;
      for (const t of english) {
        const detail = await get(`${base}/test/${t.globalTestId}`);
        for (const id of new Set([...detail.matchAll(/bulletin\/(\d+)/g)].map((m) => m[1]))) {
          const u = `https://test-takers.psiexams.com/api/content/bulletin/${id}`;
          if (!found.has(u)) { found.set(u, { title: `${t.name} Candidate Bulletin`, section: "PSI Candidate Information Bulletin" }); n++; }
        }
        await sleep(DELAY_MS);
      }
      console.log(`  PSI portal (${CFG.psiPortal}): ${tests.length} tests, ${english.length} English, ${n} bulletins`);
    } catch (e) {
      console.log(`  PSI portal (${CFG.psiPortal}): FAILED (${e.message})`);
    }
  }

  let urls = [...found.keys()].filter((u) => !CFG.exclude(u));
  const excluded = found.size - urls.length;
  const byName = urls.filter((u) => LANG_FILE.test(u.split("/").pop().replace(/\.pdf$/i, "")));
  urls = urls.filter((u) => !byName.includes(u));
  console.log(`  excluded ${excluded} out-of-scope, ${byName.length} likely translations by filename`);
  console.log(`  candidates: ${urls.length}`);
  if (DRY) return console.log("\ndry run — stopping before download");

  // ---- fetch ------------------------------------------------------------
  const have = new Map();
  for (const f of fs.readdirSync(DEST)) {
    const p = path.join(DEST, f);
    if (fs.statSync(p).isFile() && f.toLowerCase().endsWith(".pdf"))
      have.set(crypto.createHash("md5").update(fs.readFileSync(p)).digest("hex"), f);
  }
  console.log(`\nfetching (${have.size} already held)…`);

  const records = [], stats = { added: 0, skipped: 0, rejected: 0, dead: 0 };
  // filename -> provenance, seeded from previous runs so a partial run adds to
  // the record rather than replacing it.
  const attribution = new Map(
    fs.existsSync(PROV) ? Object.entries(JSON.parse(fs.readFileSync(PROV, "utf8"))) : []
  );
  const deadList = [];
  for (const [i, url] of urls.entries()) {
    if (i && i % 40 === 0) console.log(`  …${i}/${urls.length}`);
    let buf;
    try { buf = await get(url, true); } catch (e) { stats.dead++; deadList.push([url, e.message]); continue; }
    if (!buf.subarray(0, 4).toString().includes("%PDF")) { stats.dead++; deadList.push([url, "not a PDF"]); continue; }

    const md5 = crypto.createHash("md5").update(buf).digest("hex");
    const meta = found.get(url) || {};
    if (have.has(md5)) {
      // Already on disk, often under a hand-chosen name. Keep the attribution
      // anyway — otherwise every pre-existing file shows in the index as
      // "added manually" with no source URL, which is precisely the provenance
      // the index exists to record.
      const existing = have.get(md5);
      const { text, pages: np } = await readPdf(buf);
      attribution.set(existing, { url, section: meta.section || null, pages: np, summary: summarise(text) });
      stats.skipped++; await sleep(DELAY_MS); continue;
    }

    const { text, pages: np } = await readPdf(buf);
    const lang = nonEnglish(text);
    if (lang) {
      fs.mkdirSync(QUARANTINE, { recursive: true });
      fs.writeFileSync(path.join(QUARANTINE, url.split("/").pop()), buf);
      stats.rejected++; await sleep(DELAY_MS); continue;
    }

    // A sitemap-only PDF has no link text, and the filename slug makes a poor
    // title ("cosdisc2022apr"). The document's own first heading is better.
    const base = meta.title || titleFromText(text) || url.split("/").pop().replace(/\.pdf$/i, "").replace(/[_-]+/g, " ");
    let name = prettyName(base), n = 2;
    while (fs.existsSync(path.join(DEST, name))) name = prettyName(`${base} (${n++})`);
    fs.writeFileSync(path.join(DEST, name), buf);
    have.set(md5, name);
    const rec = { file: name, title: base, url, section: meta.section || null, pages: np, bytes: buf.length, summary: summarise(text) };
    records.push(rec);
    attribution.set(name, { url, section: rec.section, pages: np, summary: rec.summary, title: base });
    stats.added++;
    await sleep(DELAY_MS);
  }

  console.log(`\n  added ${stats.added}   already held ${stats.skipped}   non-English ${stats.rejected}   dead links ${stats.dead}`);
  if (deadList.length) console.log(`  (dead links are the board's own stale references, verified as genuine 404s)`);

  // ---- index ------------------------------------------------------------
  // Grouped by SOURCE DIRECTORY, not by page heading: headings vary wildly
  // between pages and produced 20+ single-document groups on California.
  const disk = fs.readdirSync(DEST).filter((f) => f.toLowerCase().endsWith(".pdf"));
  const byFile = Object.fromEntries(records.map((r) => [r.file, r]));
  const rows = [];
  for (const f of disk.sort()) {
    const r = byFile[f];
    if (r) { rows.push(r); continue; }
    const full = path.join(DEST, f);
    const { text, pages: np } = await readPdf(fs.readFileSync(full));
    const a = attribution.get(f) || {};
    rows.push({ file: f, title: a.title || f.replace(/\.pdf$/, "").replace(new RegExp(`^${CFG.folder.split(" ")[0]} `), ""),
                url: a.url || "", section: a.section || null, pages: a.pages || np,
                bytes: fs.statSync(full).size, summary: a.summary || summarise(text) });
  }
  const dirOf = (r) => {
    if (!r.url) return "Added manually";
    // Off-site documents group under their host — a PSI bulletin is a different
    // kind of source from a board form and should read that way in the index.
    if (!r.url.startsWith(CFG.origin)) return `Exam vendor — ${r.url.split("/")[2]}`;
    return "/" + (r.url.replace(CFG.origin, "").split("/").filter(Boolean).slice(0, -1).join("/") || "");
  };
  const groups = {};
  for (const r of rows) (groups[dirOf(r)] ||= []).push(r);

  const mb = (rows.reduce((a, r) => a + r.bytes, 0) / 1048576).toFixed(0);
  const quar = fs.existsSync(QUARANTINE) ? fs.readdirSync(QUARANTINE).length : 0;
  const o = [];
  o.push(`# ${CFG.label} — reference library\n`);
  o.push(`Retrieved **${new Date().toISOString().slice(0, 10)}** from <${CFG.origin}>\n`);
  o.push(`**${rows.length} documents, ${mb} MB.** Rebuild: \`node scripts/fetch_state_board_pdfs.js ${key}\`\n`);
  if (CFG.notes) o.push(`> **Use restriction.** ${CFG.notes}\n`);
  o.push("Every file is the board's own English publication, downloaded unmodified. Each");
  o.push("description below is the **opening lines of the document itself**, not a summary");
  o.push("written here — so anything traced to this index can be checked against the PDF.\n");
  o.push("**Point-in-time copies.** Boards revise these without notice and do not version them.");
  o.push("Re-fetch the source URL before putting a fee, hour count or rule from one of these on");
  o.push("a public page. A stale local copy that gets trusted is worse than no copy — the same");
  o.push("reason this repo refuses to vendor the Google and MCP docs.\n");
  o.push("**State rules do not transfer.** Nothing here applies to another state's licensees,");
  o.push("and nothing in `lib/tdlr-sources.ts` applies here. Licence types, scopes of practice");
  o.push("and prohibited practices differ in ways the names do not suggest.\n");
  if (quar) o.push(`${quar} file(s) that read as non-English despite an English filename are in \`_non-english/\`.\n`);
  for (const g of Object.keys(groups).sort()) {
    o.push(`\n## ${g}\n`);
    for (const r of groups[g].sort((a, b) => a.title.localeCompare(b.title))) {
      o.push(`### ${r.title}`);
      o.push(`\`${r.file}\`  ·  ${r.pages} page(s)  ·  ${Math.round(r.bytes / 1024)} KB`);
      if (r.section) o.push(`Listed under: ${r.section}`);
      o.push(r.url ? `Source: <${r.url}>` : "Source: added manually (not found on the board site)");
      if (r.summary) o.push(`\n> ${r.summary}`);
      o.push("");
    }
  }
  // ---- HTML page map ---------------------------------------------------
  /**
   * Not every board publishes its rules as PDFs. Maryland puts the training
   * hours (1,200 for barber, 900 for barber-stylist limited), the whole fee
   * schedule and the endorsement rules in plain HTML, so a PDF-only mirror
   * captures none of it and looks complete while doing so.
   *
   * This map is the fallback and the freshness check. Every in-scope page gets
   * an entry with its live URL, so when we hold no PDF for a question, or when
   * the PDF we hold is older than the page, the map says where the current
   * answer actually lives. HTML pages change silently and without a version;
   * a dated pointer is worth more than a stale copy.
   */
  if (!SOURCES_ONLY && pages.length) {
    const entries = [];
    for (const u of pages) {
      let html;
      try { html = await get(u); } catch { continue; }
      const main = (html.match(/<main[^>]*id="[^"]*[Mm]ain[^"]*"[^>]*>([\s\S]*?)<\/main>/i)
                 || html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || [, html])[1];
      const body = main.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<nav[\s\S]*?<\/nav>/gi, "");
      const lines = body.replace(/<[^>]+>/g, "\n").replace(/&nbsp;/g, " ")
        .split("\n").map((x) => clean(x)).filter((x) => x.length > 2);
      const title = clean((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([\s\S]*?)<\/title>/i) || [, ""])[1])
        .split(" - ")[0].slice(0, 80);
      const words = lines.join(" ").split(/\s+/).length;
      // What the page actually settles, judged by what it contains.
      const flat = lines.join(" ");
      const signals = [];
      const fees = (flat.match(/\$\s?\d[\d,]*/g) || []).length;
      const hrs = [...new Set((flat.match(/\b\d{3,4}\s*hours\b/gi) || []))];
      if (fees >= 3) signals.push(`**${fees} fee amounts**`);
      if (hrs.length) signals.push(`**training hours: ${hrs.slice(0, 4).join(", ")}**`);
      if (/reciprocit|endorsement/i.test(flat)) signals.push("reciprocity/endorsement");
      if (/renew/i.test(title)) signals.push("renewal");
      if (/COMAR|Annotated Code|Title \d/i.test(flat)) signals.push("statute/regulation citations");
      const pdfs = [...new Set([...main.matchAll(/href="([^"]+\.pdf)"/gi)].map((m) => {
        try { return new URL(m[1], u).href; } catch { return null; } }).filter(Boolean))];
      const summary = lines.slice(1).find((l) => l.length > 45 && !/^(Skip|Search|JavaScript|Main Navigation)/i.test(l)) || "";
      entries.push({ url: u, title, words, signals, pdfs, summary: summary.slice(0, 190) });
      await sleep(DELAY_MS);
    }
    const o2 = [`# ${CFG.label} — HTML page map\n`];
    o2.push(`Checked **${new Date().toISOString().slice(0, 10)}**. ${entries.length} pages.\n`);
    o2.push("**Why this exists.** Not everything a board publishes is a PDF. Maryland states its");
    o2.push("training hours, its whole fee schedule and its endorsement rules in HTML only, so a");
    o2.push("PDF mirror captures none of it — and looks complete while doing so.\n");
    o2.push("**Use it two ways.** When no PDF answers a question, the map says which live page does.");
    o2.push("And when a PDF we hold looks old, the map is where to check whether the board has since");
    o2.push("changed the answer. These pages carry no version and change silently, so a dated");
    o2.push("pointer to the live page beats a local copy that quietly went out of date.\n");
    o2.push("Pages carrying figures worth citing are marked in bold.\n");
    for (const e of entries.sort((a, b) => b.words - a.words)) {
      o2.push(`\n### ${e.title}`);
      o2.push(`<${e.url}>  ·  ${e.words} words${e.signals.length ? "  ·  " + e.signals.join(", ") : ""}`);
      if (e.summary) o2.push(`\n> ${e.summary}`);
      if (e.pdfs.length) o2.push(`\nLinks ${e.pdfs.length} PDF(s): ` + e.pdfs.map((x) => `\`${x.split("/").pop()}\``).join(", "));
      o2.push("");
    }
    fs.writeFileSync(path.join(DEST, "HTML-PAGE-MAP.md"), o2.join("\n"));
    console.log(`  HTML page map: ${entries.length} pages`);
  }

  // ---- statute / regulation map ----------------------------------------
  if (CFG.lawIndex && !SOURCES_ONLY) {
    const out = [`# ${CFG.label} — statute & regulation index\n`];
    out.push(`Captured **${new Date().toISOString().slice(0, 10)}**.\n`);
    out.push("**A map, not a mirror.** The law lives on the sites linked below; they are");
    out.push("authoritative and are amended without notice. A section number, its title and");
    out.push("its URL are the citable unit — copying the text here would create exactly the");
    out.push("stale duplicate this repo refuses to keep of the Google and MCP docs.\n");
    for (const spec of CFG.lawIndex) {
      try {
        const html = await get(CFG.origin + spec.page);
        const seen = new Set(), rowsL = [];
        for (const [, href, text] of html.matchAll(/<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
          if (!href.includes(spec.host)) continue;
          const label = clean(text);
          if (!label || seen.has(href)) continue;
          seen.add(href); rowsL.push([label, href.replace(/&amp;/g, "&")]);
        }
        out.push(`\n## ${spec.heading} — ${rowsL.length} sections\n`);
        out.push("| Section | Title | Source |", "|---|---|---|");
        for (const [label, href] of rowsL) {
          const m = label.match(/^§?\s*([\d.]+)\.?\s*(.*)$/);
          out.push(`| ${m ? m[1] : ""} | ${m ? m[2] : label} | [source](${href}) |`);
        }
        console.log(`  law index ${spec.page}: ${rowsL.length} sections`);
      } catch (e) { console.log(`  law index ${spec.page}: FAILED (${e.message})`); }
      await sleep(DELAY_MS);
    }
    fs.writeFileSync(path.join(DEST, "STATUTES-AND-REGULATIONS.md"), out.join("\n"));
  }

  for (const r of rows) if (r.url) attribution.set(r.file, { url: r.url, section: r.section, pages: r.pages, summary: r.summary, title: r.title });
  fs.writeFileSync(PROV, JSON.stringify(Object.fromEntries(attribution), null, 2));
  fs.writeFileSync(path.join(DEST, "INDEX.md"), o.join("\n"));
  console.log(`\n  INDEX.md — ${rows.length} documents, ${Object.keys(groups).length} groups, ${mb} MB`);
}

main().catch((e) => { console.error("fatal:", e); process.exit(1); });
