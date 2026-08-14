#!/usr/bin/env node
/**
 * Finds which state boards run their exams through PSI, and under what client
 * code, by probing PSI's own candidate API.
 *
 * WHY PROBING IS THE ONLY WAY. Nothing links these codes. The board sites do
 * not reference them, PSI's marketing pages do not list them, and the candidate
 * portal is a JavaScript app whose served HTML contains no PDF links at all —
 * every document comes from an API the app calls. The two codes we already know
 * (cabacos, mdcos) were each found by opening a page in a browser and reading
 * the rendered DOM.
 *
 * THE TRAP THIS SCRIPT EXISTS TO AVOID. Probing PSI paths is actively
 * misleading: every unknown path under /api/ returns the JavaScript app's shell
 * with HTTP 200, so a wrong guess looks exactly like a hit. Status code is
 * useless here. The discriminator is the CONTENT TYPE:
 *
 *     application/json          -> a real account
 *     application/problem+json  -> no such account
 *
 * Both contain the word "json", and a naive `includes("json")` check treats
 * every wrong guess as a success. That is the single reason this file is not
 * three lines long.
 *
 * Usage:
 *   node scripts/probe_psi_client_codes.js            # all states
 *   node scripts/probe_psi_client_codes.js Ohio Iowa  # just these
 */

const fs = require("fs");
const path = require("path");
const { STATES, ABBR, folderFor } = require("./state_reference_scaffold");

const API = "https://test-takers.psiexams.com/api/account";
const DELAY_MS = 250;
const UA = "Mozilla/5.0 (compatible; ShearQuery-reference-archive/1.0; +https://shearquery.com)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Candidate codes for a state, cheapest guesses first.
 *
 * Built from the shape of the two known codes rather than invented: California
 * is "cabacos" (CA + BArbering + COSmetology) and Maryland is "mdcos" (MD +
 * COS). Both are the postal abbreviation followed by a contraction of the
 * board's name, so that is the pattern worth trying.
 */
function candidates(state) {
  const ab = ABBR[state].toLowerCase();
  const bare = state.toLowerCase().replace(/[^a-z]/g, "");
  return [
    `${ab}cos`,
    `${ab}bacos`,
    `${ab}cosmo`,
    `${ab}bc`,
    `${ab}barber`,
    `${ab}cosmetology`,
    `${bare}cos`,
    `${bare}cosmo`,
    // Second pass. Tennessee turned out to be "tnbarber" rather than a
    // cosmetology contraction, which is the clue that the naming follows
    // whichever board actually holds the contract — barber and cosmetology are
    // separate boards in many states, and either may be the PSI client.
    `${ab}bar`,
    `${ab}barbers`,
    `${ab}barbercos`,
    `${ab}cosbar`,
    `${ab}bcb`,
    `${ab}bcos`,
    `${ab}board`,
    `${ab}cosmetologyboard`,
    `${bare}barber`,
    `${bare}bacos`,
  ];
}

async function probe(code) {
  try {
    const res = await fetch(`${API}/${code}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    // Order matters: problem+json also contains "application/json" as a
    // substring in some servers' spellings, so the negative is checked first.
    if (ct.includes("problem+json")) return { hit: false, ct, status: res.status };
    if (ct.includes("application/json")) {
      let body = null;
      try { body = await res.json(); } catch { /* shape is theirs to change */ }
      return { hit: true, ct, status: res.status, body };
    }
    return { hit: false, ct, status: res.status };
  } catch (e) {
    return { hit: false, ct: null, status: null, error: e.message };
  }
}

async function main() {
  const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const targets = only.length ? STATES.filter((s) => only.includes(s)) : STATES;

  const found = [];
  for (const state of targets) {
    let result = null;
    for (const code of candidates(state)) {
      const r = await probe(code);
      await sleep(DELAY_MS);
      if (r.hit) {
        result = { code, ...r };
        break;
      }
    }

    if (result) {
      const name = result.body?.name || result.body?.accountName || null;
      console.log(`HIT   ${state.padEnd(22)} ${result.code.padEnd(16)} ${name || ""}`);
      found.push({ state, code: result.code, name });

      // Record it on the state's URL map immediately — a discovery that only
      // exists in a terminal scrollback has to be made twice.
      const mapPath = path.join(folderFor(state), "_urlmap.json");
      if (fs.existsSync(mapPath)) {
        const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
        map.examVendor = {
          name: "PSI",
          psiClientCode: result.code,
          portalUrl: `https://test-takers.psiexams.com/${result.code}`,
          accountName: name,
          discoveredAt: new Date().toISOString().slice(0, 10),
          method: "api/account content-type probe",
        };
        fs.writeFileSync(mapPath, JSON.stringify(map, null, 2) + "\n");
      }
    } else {
      console.log(` --   ${state.padEnd(22)} no PSI account under the tried codes`);
    }
  }

  console.log(`\n${found.length} of ${targets.length} states matched a PSI client code.`);
  console.log("A miss is NOT proof the state does not use PSI — only that none of");
  console.log("the guessed codes matched. Those states need looking up by hand.");
}

if (require.main === module) main();
