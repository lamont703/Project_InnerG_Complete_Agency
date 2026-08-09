/**
 * Rebuild reference/California Exam Prep Files/INDEX.md from whatever is on disk.
 *
 * Split from the fetcher on purpose: the fetch is a long, network-bound run that
 * can be interrupted, and the index has to be reproducible from the files alone
 * without re-downloading 900 PDFs to regenerate a markdown file.
 *
 * Descriptions are the opening lines of each PDF, not summaries written here.
 * That is the whole point of the index — a claim traced to it can be checked
 * against the document without re-reading the document.
 *
 * Run:  node scripts/build_california_bbc_index.js
 */

const fs = require("fs");
const path = require("path");
const { PDFParse } = require("pdf-parse");

const DEST = path.join(__dirname, "..", "reference", "California Exam Prep Files");
const ADDED = path.join(__dirname, "..", ".ca_bbc_added.json");

const ORDER = [
  "Board Inspections", "Commonly Used Forms", "Board Resources", "Applicants", "Schools",
  "Barbers", "Cosmetology", "Hairstyling", "Esthetics", "Manicuring", "Electrology",
  "Establishments", "Personal Service Permit (PSP)", "Consumers", "Laws and Regulations",
  "Enforcement", "Popular Pages",
];

async function firstLines(file) {
  try {
    const p = new PDFParse({ data: new Uint8Array(fs.readFileSync(file)) });
    const r = await p.getText();
    await p.destroy?.();
    const text = (r.text || "")
      .split("\n").map((s) => s.trim())
      .filter((s) => s.length > 30 && !/^page \d|^\d+$|barbercosmo|^www\.|^\(?\d{3}\)/i.test(s))
      .slice(0, 2).join(" ").replace(/\s+/g, " ").slice(0, 200);
    return { text, pages: r.pages?.length || 0 };
  } catch {
    return { text: "", pages: 0 };
  }
}

(async () => {
  const meta = fs.existsSync(ADDED)
    ? Object.fromEntries(JSON.parse(fs.readFileSync(ADDED, "utf8")).map((m) => [m.file, m]))
    : {};
  const files = fs.readdirSync(DEST).filter((f) => f.toLowerCase().endsWith(".pdf")).sort();
  console.log(`indexing ${files.length} PDFs…`);

  const rows = [];
  for (const [i, f] of files.entries()) {
    if (i && i % 100 === 0) console.log(`  …${i}/${files.length}`);
    const full = path.join(DEST, f);
    const m = meta[f] || {};
    const { text, pages } = m.summary ? { text: m.summary, pages: m.pages } : await firstLines(full);
    rows.push({
      file: f,
      title: m.title || f.replace(/^California /, "").replace(/\.pdf$/, ""),
      sections: m.sections?.length ? m.sections : ["Uncategorised"],
      url: m.url || "",
      pages: pages || m.pages || 0,
      bytes: fs.statSync(full).size,
      summary: text,
    });
  }

  const by = {};
  for (const r of rows) (by[r.sections[0]] ||= []).push(r);
  const keys = [...ORDER.filter((k) => by[k]), ...Object.keys(by).filter((k) => !ORDER.includes(k))];

  const totalMb = (rows.reduce((a, r) => a + r.bytes, 0) / 1048576).toFixed(0);
  const quarantined = fs.existsSync(path.join(DEST, "_non-english"))
    ? fs.readdirSync(path.join(DEST, "_non-english")).length : 0;

  const o = [];
  o.push("# California Board of Barbering & Cosmetology — reference library\n");
  o.push(`Retrieved **${new Date().toISOString().slice(0, 10)}** from <https://www.barbercosmo.ca.gov>\n`);
  o.push(`**${rows.length} documents, ${totalMb} MB.** Rebuild with \`node scripts/fetch_california_bbc_pdfs.js\`.\n`);
  o.push("Every file is the board's own English publication, downloaded unmodified. Each");
  o.push("description is the **opening lines of the document itself**, not a summary written");
  o.push("here — so anything traced to this index can be checked against the PDF directly.\n");
  o.push("**These are point-in-time copies.** The board revises these without notice and does");
  o.push("not version them. Before putting a fee, hour count or rule from one of these on a");
  o.push("public page, re-fetch the source URL and confirm it still says the same thing. A");
  o.push("stale local copy that gets trusted is worse than no copy — the same reason this repo");
  o.push("refuses to vendor the Google and MCP docs.\n");
  o.push("**California is not Texas.** Nothing here transfers to a TDLR page and nothing in");
  o.push("`lib/tdlr-sources.ts` transfers here. The licence types, scopes of practice and");
  o.push("prohibited practices differ in ways the names do not suggest.\n");
  o.push("Excluded by design: ~297 board meeting agendas, minutes and materials (governance,");
  o.push("not licensing), and the Korean, Spanish, Vietnamese and Simplified Chinese editions.");
  if (quarantined) o.push(`${quarantined} files that read as non-English despite an English-looking name are in \`_non-english/\`.`);
  o.push("");

  for (const k of keys) {
    o.push(`\n## ${k}\n`);
    for (const r of by[k].sort((a, b) => a.title.localeCompare(b.title))) {
      o.push(`### ${r.title}`);
      o.push(`\`${r.file}\`  ·  ${r.pages} page(s)  ·  ${Math.round(r.bytes / 1024)} KB`);
      if (r.sections.length > 1) o.push(`Also listed under: ${r.sections.slice(1).join(", ")}`);
      o.push(r.url ? `Source: <${r.url}>` : "Source: added manually (not on the board site)");
      if (r.summary) o.push(`\n> ${r.summary}`);
      o.push("");
    }
  }

  fs.writeFileSync(path.join(DEST, "INDEX.md"), o.join("\n"));
  console.log(`wrote INDEX.md — ${rows.length} documents across ${keys.length} sections, ${totalMb} MB`);
  for (const k of keys) console.log(`  ${k.padEnd(34)} ${by[k].length}`);
})();
