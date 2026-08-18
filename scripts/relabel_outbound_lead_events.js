#!/usr/bin/env node
/**
 * Repair pixel_events rows that were tagged `outbound_lead` but were not one.
 *
 *   node scripts/relabel_outbound_lead_events.js           # dry run (default)
 *   node scripts/relabel_outbound_lead_events.js --apply   # write
 *
 * WHAT outbound_lead IS SUPPOSED TO MEAN: the visitor left our site to reach
 * the business — its website, a phone call, an email, map directions, an
 * external booking page. It is the metric that answers "does an entity page
 * actually produce anything for this business", and it is the number any
 * owner-outreach campaign would be targeted on.
 *
 * WHAT IT ACTUALLY HELD: 561 of 854 rows — 66% — were something else. A Back
 * button, a banner dismiss, the owner-facing Claim CTA, "View Profile" links
 * that navigate deeper INTO our own site. Every one of those inflated the exact
 * number used to judge whether entity pages convert, and three of the four
 * categories pointed the opposite way to a lead: they are people staying on the
 * site, or the business owner arriving rather than a customer leaving.
 *
 * The emitters are fixed at source. This repairs the history they left behind,
 * because a query written against this column tomorrow reads the old rows too.
 *
 * RELABELS, NEVER DELETES. The click genuinely happened; only its name was
 * wrong. Every repaired row keeps `metadata.ig_click_was` so the correction is
 * auditable and reversible — an analytics table that gets quietly rewritten is
 * worse than one with a known, documented flaw.
 *
 * CONSERVATIVE BY DESIGN. Anything this cannot classify with confidence is left
 * exactly as it is and reported at the end. A row wrongly "corrected" into
 * silence is harder to notice than one left visibly wrong.
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const APPLY = process.argv.includes("--apply");

/**
 * Ordered — first match wins, so the specific patterns must precede the loose
 * ones. `text` is what the pixel captured (innerText, or aria-label when the
 * control is icon-only).
 */
const RULES = [
  [/dismiss banner|cerrar banner/i,                        "banner_dismiss"],
  [/^(back|atrás)$|back to search|volver a la búsqueda/i,  "nav_back"],
  [/^search directory$/i,                                  "nav_search"],
  [/claim (your|&)|reclama tu/i,                           "claim_listing"],
  [/^view profile$/i,                                      "entity_profile_open"],
  [/ask ai about this market/i,                            "ask_ai_market"],
  [/find shops near this store/i,                          "find_shops_near_store"],
  [/practice test|practice questions|intelligence prep/i,  "practice_deck"],
  [/waitlist|early access/i,                               "waitlist_anchor"],
  [/shop day|día de compras/i,                             "request_shop_day"],
];

/**
 * Texts that LOOK internal but are genuine outbound leads, checked before the
 * rules run. "GET TICKETS" is an event's external ticket_url — it leaves the
 * site to reach the organiser, which is exactly what the label means.
 */
const KEEP = /get tickets|obtener entradas/i;

function classify(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  if (KEEP.test(t)) return null;
  for (const [re, label] of RULES) if (re.test(t)) return label;
  return null;
}

(async () => {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("pixel_events")
      .select("id, created_at, element_name, metadata")
      .eq("element_name", "outbound_lead")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    rows = rows.concat(data || []);
    if (!data || data.length < 1000) break;
  }

  const plan = [];
  const unclassified = new Map();
  for (const r of rows) {
    // Already repaired by an earlier run — idempotent, so a re-run is safe.
    if (r.metadata?.ig_click_was) continue;
    const label = classify(r.metadata?.text);
    if (label) plan.push({ row: r, label });
  }
  for (const r of rows) {
    if (r.metadata?.ig_click_was) continue;
    if (!classify(r.metadata?.text)) {
      const t = String(r.metadata?.text || "(blank)").slice(0, 40);
      unclassified.set(t, (unclassified.get(t) || 0) + 1);
    }
  }

  const byLabel = {};
  for (const p of plan) byLabel[p.label] = (byLabel[p.label] || 0) + 1;

  console.log(`${APPLY ? "APPLY" : "DRY RUN"} — ${rows.length} rows labelled outbound_lead\n`);
  console.log("to relabel:");
  Object.entries(byLabel)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  -> ${k}`));
  console.log(`\n  ${String(plan.length).padStart(4)}  total to change`);
  console.log(`  ${String(rows.length - plan.length).padStart(4)}  left as genuine outbound_lead\n`);

  console.log("left alone (verify these really are outbound):");
  [...unclassified.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${JSON.stringify(k)}`));

  if (!APPLY) {
    console.log("\nNothing written. Re-run with --apply to make these changes.");
    return;
  }

  let done = 0;
  for (const { row, label } of plan) {
    const metadata = { ...(row.metadata || {}), ig_click: label, ig_click_was: "outbound_lead" };
    const { error } = await admin
      .from("pixel_events")
      .update({ element_name: label, metadata })
      .eq("id", row.id);
    if (error) {
      console.error(`  FAILED ${row.id}: ${error.message}`);
      continue;
    }
    if (++done % 100 === 0) console.log(`  ${done}/${plan.length}`);
  }
  console.log(`\nrelabelled ${done} of ${plan.length}`);
})();
