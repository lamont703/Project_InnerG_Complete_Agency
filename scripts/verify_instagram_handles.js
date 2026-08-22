#!/usr/bin/env node
/**
 * Triage scraped Instagram handles, 50 at a time.
 *
 * WHAT IT CAN AND CANNOT DO, because the difference decides the whole design.
 *
 * Three failure modes were measured on a 9-handle sample of the highest
 * confidence band (name_match_score >= 0.8), and roughly a third failed:
 *
 *   dead account      dieselbarbershop - blank name, 17 followers, ZERO posts,
 *                     squatting a national franchise name, scored 0.9
 *   personal account  bensluxe is "Ben Herrera"; in.his.image_barber is
 *                     "Ernest Garcia Jr." - the barber, not the business
 *   vendor account    glossgenius is attached to SIX different businesses;
 *                     vagaropro, sallybeauty and teepublic are in there too
 *
 * Only the third is decidable without opening the profile. Follower counts,
 * post counts and the account's display name all live on the page.
 *
 * AND THERE IS NO API FOR THAT PAGE. Both endpoints that would return it -
 * business_discovery and ig_hashtag_search - refused this token: they belong to
 * the Facebook Login flow and sit behind the Instagram Public Content Access
 * feature, which is a second OAuth integration plus App Review. Verified by
 * calling both; see the notes in this repo.
 *
 * So this script does the offline half honestly and REFUSES TO GUESS at the
 * other half. A row it cannot settle becomes 'needs_review' rather than a
 * confident-sounding score. Scripted fetching of profile pages was the obvious
 * alternative and is deliberately not here: bulk automated reads of other
 * people's profiles is the thing most likely to cost the account this project
 * just spent days getting webhooks working on.
 *
 *   node scripts/verify_instagram_handles.js            # 50 unevaluated rows
 *   node scripts/verify_instagram_handles.js --limit 200
 *   node scripts/verify_instagram_handles.js --dry      # decide, write nothing
 *   node scripts/verify_instagram_handles.js --recheck  # include already-evaluated
 *   node scripts/verify_instagram_handles.js --only=a,b  # named handles only
 *
 * MEASURED AGAINST THE FIVE HANDLES VERIFIED BY HAND, so the limits are a
 * number rather than a caveat:
 *
 *   bensluxe             personal  -> needs_review   caught
 *   cutthroatbarbers     real      -> pass           correct
 *   exhibitbarbershopdfw real      -> pass           correct
 *   in.his.image_barber  personal  -> pass           MISSED (has "barber" in it)
 *   dieselbarbershop     dead      -> pass           MISSED (0 posts is only on the page)
 *
 * One of two personal accounts caught, none of the dead ones — which is the
 * design working as described rather than failing. Both misses are the cases
 * that were always going to need the profile opened. Do not read 'pass' as
 * anything more than "get to this one first".
 */
require("dotenv").config({ path: ".env.local", quiet: true });

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const args = process.argv.slice(2);
const LIMIT = Number((args.find((a) => a.startsWith("--limit")) || "--limit=50").split("=")[1] || 50);
const DRY = args.includes("--dry");
const RECHECK = args.includes("--recheck");
/**
 * --only=handleA,handleB — evaluate named handles regardless of whether they
 * have been seen before. Exists so the checks can be re-run against the nine
 * handles that were verified by hand, which is the only way to tell whether a
 * change to the heuristics made them better or just different.
 */
const ONLY = (args.find((a) => a.startsWith("--only")) || "").split("=")[1];

/**
 * CHECK 1 - VENDORS AND RETAILERS.
 *
 * These are not the business's account and never will be. They get scraped
 * because a shop's website links its booking widget or its supplier, and the
 * crawler cannot tell that link from the shop's own. glossgenius alone is
 * attached to six different businesses in this table, which is the tell: a
 * handle that belongs to six shops belongs to none of them.
 *
 * Matched on the whole handle or as a clear component, not as a loose
 * substring - "vagaro" must not reject a shop legitimately called
 * "vagarobarbers".
 */
const VENDOR = [
  "booksy", "booksybiz", "styleseat", "vagaro", "vagaropro", "glossgenius",
  "squareup", "square", "schedulicity", "acuity", "calendly", "fresha",
  "thecutapp", "getsquire", "squire", "linktree", "linktr",
  "sallybeauty", "teepublic", "shopify", "wix", "godaddy", "yelp", "instagram",
];

/**
 * CHECK 2 - PERSONAL-NAME SHAPE.
 *
 * Weak on its own and deliberately never rejects. A handle like
 * "monica_resendez" is a person's name and probably a barber rather than a
 * shop, but plenty of real businesses are named after their owner. It can only
 * downgrade a row to needs_review, never decide it.
 */
const BUSINESSY = /barber|salon|shop|studio|cuts?|hair|beauty|spa|academy|college|school|lounge|parlor|parlour|grooming|styles?|fades?|clips?|shears?|supply|store|co$|llc|inc/i;

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Distinctive words from the business name - the generic trade words carry no identifying power. */
const GENERIC = new Set([
  "barber", "barbers", "barbershop", "barbershops", "salon", "salons", "shop", "shops",
  "hair", "beauty", "studio", "school", "schools", "college", "academy", "spa", "the",
  "and", "of", "llc", "inc", "co", "company", "center", "centre", "supply", "store",
  "cuts", "cut", "styles", "style", "lounge", "texas", "tx", "houston", "dallas", "austin",
]);

function distinctiveTokens(name) {
  return String(name || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !GENERIC.has(t));
}

function evaluate(row, handleUseCount) {
  const handle = String(row.handle || "").toLowerCase().replace(/^@/, "");
  const nh = norm(handle);
  const name = row.entity_name || "";

  if (!handle) return { verdict: "reject", reason: "empty handle" };

  // 1. Vendor / retailer / platform.
  const parts = handle.split(/[._-]/).filter(Boolean);
  const vendorHit = VENDOR.find((v) => handle === v || parts.includes(v));
  if (vendorHit) {
    return { verdict: "reject", reason: `vendor or platform account (${vendorHit}), not the business` };
  }

  // 2. The same handle scraped onto several different businesses.
  if ((handleUseCount.get(nh) || 0) > 1) {
    return {
      verdict: "reject",
      reason: `handle appears on ${handleUseCount.get(nh)} different businesses - cannot be any one of their accounts`,
    };
  }

  // 3. Does the handle actually contain the distinctive part of the name?
  const tokens = distinctiveTokens(name);
  const matched = tokens.filter((t) => nh.includes(norm(t)));

  if (tokens.length === 0) {
    return { verdict: "needs_review", reason: "business name is only generic words - nothing distinctive to match on" };
  }
  if (matched.length === 0) {
    return {
      verdict: "reject",
      reason: `handle contains none of the distinctive words in "${name}" (${tokens.join(", ")})`,
    };
  }

  /*
   * A name match is necessary and NOT sufficient. Every one of the three
   * sampled failures would clear it: bensluxe really does contain "luxe",
   * dieselbarbershop really does contain "diesel". Whether the account is
   * alive, and whether it belongs to the business or to somebody who works
   * there, is only visible on the page.
   *
   * So 'pass' does not mean verified. It means NOTHING OFFLINE IS WRONG WITH
   * IT, and the split that follows is the whole value of this script: it turns
   * one undifferentiated pile of 1,141 into a queue worth opening in order.
   * A handle carrying a business word alongside the matched name is the shape
   * a shop's own account usually takes; one without is the shape both personal
   * accounts in the sample took (bensluxe, in.his.image_barber), so it is worth
   * looking at those with more suspicion rather than in the same breath.
   */
  if (BUSINESSY.test(handle)) {
    return {
      verdict: "pass",
      reason: `matches "${matched.join(", ")}" and reads as a business handle - open the profile to confirm it is alive and not a personal account`,
    };
  }
  return {
    verdict: "needs_review",
    reason: `matches "${matched.join(", ")}" but has no business word in it - the shape both personal accounts in the sample took; open the profile`,
  };
}

async function get(path) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: H });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

(async () => {
  // Every handle, so check 2 can see reuse across the whole table rather than
  // only within this batch - a duplicate split across two runs would otherwise
  // look unique in both.
  const all = await get(
    "entity_social_profiles?select=handle&platform=eq.instagram&limit=5000"
  );
  const useCount = new Map();
  for (const r of all) {
    const n = norm(r.handle);
    if (n) useCount.set(n, (useCount.get(n) || 0) + 1);
  }

  const filter = ONLY
    ? `&handle=in.(${ONLY})`
    : RECHECK
      ? ""
      : "&evaluated_at=is.null";
  const batch = await get(
    `entity_social_profiles?select=id,handle,entity_name,entity_type,name_match_score` +
      `&platform=eq.instagram${filter}&order=name_match_score.desc.nullslast&limit=${LIMIT}`
  );

  if (!batch.length) {
    console.log("Nothing left to evaluate. Use --recheck to go over evaluated rows again.");
    return;
  }

  const tally = { pass: 0, reject: 0, needs_review: 0 };
  const now = new Date().toISOString();

  for (const row of batch) {
    const { verdict, reason } = evaluate(row, useCount);
    tally[verdict]++;
    console.log(
      `${verdict.padEnd(13)} @${String(row.handle).padEnd(30)} ${String(row.entity_name || "").slice(0, 34).padEnd(36)} ${reason}`
    );

    if (DRY) continue;

    const patch = {
      evaluated_at: now,
      evaluation_method: "offline",
      evaluation_verdict: verdict,
    };
    // rejected_reason already exists and is the field anything downstream
    // reads, so a reject writes there too rather than only into the new column.
    if (verdict === "reject") patch.rejected_reason = reason;

    const r = await fetch(`${URL_BASE}/rest/v1/entity_social_profiles?id=eq.${row.id}`, {
      method: "PATCH",
      headers: H,
      body: JSON.stringify(patch),
    });
    if (!r.ok) console.error(`  ! write failed for ${row.handle}: ${r.status}`);
  }

  const remaining = await fetch(
    `${URL_BASE}/rest/v1/entity_social_profiles?select=id&platform=eq.instagram&evaluated_at=is.null&limit=1`,
    { headers: { ...H, Prefer: "count=exact" } }
  ).then((r) => (r.headers.get("content-range") || "").split("/")[1]);

  console.log(
    `\n${DRY ? "[dry run] " : ""}${batch.length} evaluated  ` +
      `pass ${tally.pass}  reject ${tally.reject}  needs_review ${tally.needs_review}`
  );
  console.log(`unevaluated remaining: ${remaining}`);
  console.log(
    `\nA "pass" is NOT a confirmation and must not gate tagging on its own — ` +
      `dead and personal accounts can only be caught by opening the profile.`
  );
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
