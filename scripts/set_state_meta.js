#!/usr/bin/env node
/**
 * Records what research established about a state, into its _urlmap.json.
 *
 * The PDFs are only half the archive. The other half is the answer to "who
 * regulates this, who runs the exam, is there a practical, and where are the
 * testing centres" — none of which is a file, and all of which is what a page
 * actually cites.
 *
 * EVERY CLAIM CARRIES ITS SOURCE. `hasPracticalExam` is not a boolean here, it
 * is a boolean plus the URL that establishes it. A state's practical-exam
 * status read off a licensing-guide content farm is worth nothing — this repo
 * has already been burned by a secondary source summarising a policy it had not
 * read — so the field is only ever set from an official board page or the
 * bulletin itself, and the evidence travels with it.
 *
 * Usage:
 *   node scripts/set_state_meta.js "New York" '{"board":{...},"hasPracticalExam":true,...}'
 */

const fs = require("fs");
const path = require("path");
const { folderFor } = require("./state_reference_scaffold");

function deepMerge(base, patch) {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === "object" && !Array.isArray(v) && out[k] && typeof out[k] === "object" && !Array.isArray(out[k])) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function main() {
  const [state, json] = process.argv.slice(2);
  if (!state || !json) {
    console.error(`usage: node scripts/set_state_meta.js "New York" '{"hasPracticalExam":true}'`);
    process.exit(1);
  }
  const mapPath = path.join(folderFor(state), "_urlmap.json");
  if (!fs.existsSync(mapPath)) {
    console.error(`no _urlmap.json for ${state} — run state_reference_scaffold.js`);
    process.exit(1);
  }
  const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  const patch = JSON.parse(json);

  // Setting the practical flag without saying where it came from is the one
  // thing this script refuses. That field will end up on a public page.
  if (patch.hasPracticalExam !== undefined && patch.hasPracticalExam !== null) {
    const ev = patch.practicalEvidence || map.practicalEvidence;
    const hasSource = ev && (ev.sourceUrl || ev.url || (Array.isArray(ev.sources) && ev.sources.length));
    if (!hasSource) {
      console.error("refusing: hasPracticalExam needs practicalEvidence with a sourceUrl");
      process.exit(1);
    }
  }

  const merged = deepMerge(map, patch);
  merged.research = { ...(merged.research || {}), lastCheckedAt: new Date().toISOString().slice(0, 10) };
  fs.writeFileSync(mapPath, JSON.stringify(merged, null, 2) + "\n");
  console.log(`${state}: updated`);
}

if (require.main === module) main();
