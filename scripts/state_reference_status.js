#!/usr/bin/env node
/**
 * What the reference archive actually holds, per state.
 *
 * Exists because "we have folders for every state" and "we have documents for
 * every state" look identical from a directory listing, and only one of them is
 * true. This prints the difference, so coverage is never assumed from the
 * scaffolding.
 *
 * The practical column is the one that matters most: it is what decides whether
 * the kit-list page format applies to a state at all, and an unanswered `?` is
 * a state we cannot write that page for yet.
 */

const fs = require("fs");
const path = require("path");
const { STATES, folderFor } = require("./state_reference_scaffold");

function main() {
  const rows = [];
  for (const state of STATES) {
    const dir = folderFor(state);
    const mapPath = path.join(dir, "_urlmap.json");
    const map = fs.existsSync(mapPath) ? JSON.parse(fs.readFileSync(mapPath, "utf8")) : null;
    const pdfs = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".pdf")).length
      : 0;

    const vendor = map?.examVendor?.name || null;
    const code = map?.examVendor?.psiClientCode || null;
    const board = map?.board?.url ? "yes" : "—";
    const namedPractical = map?.practicalEvidence?.testsNamedPractical?.length || 0;

    let practical = "?";
    if (map?.hasPracticalExam === true) practical = "YES";
    else if (map?.hasPracticalExam === false) practical = "no";
    else if (namedPractical > 0) practical = `~${namedPractical}`; // evidence, not verdict

    rows.push({ state, pdfs, vendor: vendor ? (code ? `PSI:${code}` : vendor) : "—", board, practical, status: map?.research?.status || "not-started" });
  }

  const w = (s, n) => String(s).padEnd(n);
  console.log(w("STATE", 22) + w("PDFs", 6) + w("VENDOR", 20) + w("BOARD", 7) + w("PRACTICAL", 11) + "STATUS");
  console.log("-".repeat(88));
  for (const r of rows) {
    console.log(w(r.state, 22) + w(r.pdfs || "—", 6) + w(r.vendor, 20) + w(r.board, 7) + w(r.practical, 11) + r.status);
  }

  const withPdfs = rows.filter((r) => r.pdfs > 0).length;
  const withVendor = rows.filter((r) => r.vendor !== "—").length;
  const withBoard = rows.filter((r) => r.board === "yes").length;
  const settled = rows.filter((r) => r.practical === "YES" || r.practical === "no").length;
  const totalPdfs = rows.reduce((s, r) => s + r.pdfs, 0);

  console.log("-".repeat(88));
  console.log(`states with documents : ${withPdfs}/${rows.length}   (${totalPdfs} PDFs total)`);
  console.log(`exam vendor known     : ${withVendor}/${rows.length}`);
  console.log(`board URL recorded    : ${withBoard}/${rows.length}`);
  console.log(`practical CONFIRMED   : ${settled}/${rows.length}   <- the number that gates kit-list pages`);
  console.log(`\n"~N" means N PSI tests are NAMED "Practical" — evidence, not confirmation.`);
}

if (require.main === module) main();
