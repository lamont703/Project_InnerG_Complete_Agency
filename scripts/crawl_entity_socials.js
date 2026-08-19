#!/usr/bin/env node
/**
 * Find social handles on entity websites, across every entity table.
 *
 *   node scripts/crawl_entity_socials.js                 # dry run, 40 sites
 *   node scripts/crawl_entity_socials.js --limit=3000    # dry run, all of them
 *   node scripts/crawl_entity_socials.js --limit=3000 --apply
 *
 * WHY: an Instagram handle reaches a business without a phone number we cannot
 * legally text and without an email address most sites do not publish. We hold
 * FIVE handles across 7,949 businesses, which is why every plan that depends on
 * tagging is stuck. 2,801 have a website, and a website almost always links its
 * own social accounts.
 *
 * WRITES TO A LAKE, NEVER TO THE ENTITY ROW, even though several tables already
 * have an instagram_handle column. Nothing here verifies the account exists --
 * Instagram blocks automated checking -- and the cost of being wrong is a
 * stranger publicly tagged in a post about a business they have no connection
 * to. See the migration header.
 *
 * POLITE, same shape as scripts/crawl_school_sites.js: serialised, a delay
 * between requests, one entity per domain, robots.txt honoured, a User-Agent
 * that says who we are. It reads public pages and submits nothing.
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const { extractHandles, rejectSharedHandles } = require("../lib/social-handle-extract.ts");

const APPLY = process.argv.includes("--apply");
const LIMIT = Number((process.argv.find((a) => a.startsWith("--limit=")) || "").split("=")[1]) || 40;
const DELAY_MS = 800;
const UA = "Mozilla/5.0 (compatible; ShearQueryBot/1.0; +https://shearquery.com/about) research crawler";

// Socials sit in the header or footer of the home page far more often than on a
// dedicated page, so this crawls fewer paths than the school crawler did.
const PATHS = ["", "/contact"];

const TABLES = [
  ["agent_barbershop_leads", "shop", "shop_name", "website"],
  ["agent_salon_leads", "salon", "shop_name", "website"],
  ["agent_barber_leads", "barber", "name", "website_url"],
  ["agent_cosmetologist_leads", "cosmetologist", "name", "website_url"],
  ["agent_barber_school_leads", "barber_school", "school_name", "website"],
  ["agent_cosmetology_school_leads", "cosmetology_school", "school_name", "website"],
  ["agent_barber_supply_store_leads", "barber_supply_store", "name", "website"],
  ["agent_beauty_supply_store_leads", "beauty_supply_store", "name", "website"],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Strip control characters and lone surrogates. Postgres rejects them, and
 * learning that cost a 388-site crawl: one null byte in one page's markup took
 * the whole batch insert down with it.
 */
function jsonSafe(s) {
  return String(s || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
    .replace(/(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "$1");
}

const robotsCache = new Map();
async function disallowedPaths(origin) {
  if (robotsCache.has(origin)) return robotsCache.get(origin);
  const rules = [];
  try {
    const res = await fetch(origin + "/robots.txt", { signal: AbortSignal.timeout(6000), headers: { "User-Agent": UA } });
    if (res.ok) {
      const txt = await res.text();
      let applies = false;
      for (const line of txt.split(/\r?\n/)) {
        const m = line.match(/^\s*(user-agent|disallow)\s*:\s*(.*?)\s*(#.*)?$/i);
        if (!m) continue;
        if (/user-agent/i.test(m[1])) { applies = m[2] === "*" || /shearquery/i.test(m[2]); continue; }
        if (applies && m[2]) rules.push(m[2]);
      }
    }
  } catch { /* an unreachable robots.txt is not a prohibition */ }
  robotsCache.set(origin, rules);
  return rules;
}
const blocked = (rules, p) => rules.some((r) => r === "/" || (r && (p || "/").startsWith(r)));

async function crawl(entity) {
  const base = (entity.website.startsWith("http") ? entity.website : "https://" + entity.website).replace(/\/+$/, "");
  let origin;
  try { origin = new URL(base).origin; } catch { return { error: "bad url", found: [] }; }

  const rules = await disallowedPaths(origin);
  if (blocked(rules, "/")) return { error: "robots.txt disallows", found: [] };

  const found = new Map();
  let reached = false;
  for (const path of PATHS) {
    if (blocked(rules, path || "/")) continue;
    try {
      const res = await fetch(base + path, {
        redirect: "follow", signal: AbortSignal.timeout(9000),
        headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      });
      if (!res.ok) { await sleep(DELAY_MS); continue; }
      if (!(res.headers.get("content-type") || "").includes("html")) { await sleep(DELAY_MS); continue; }
      reached = true;
      for (const h of extractHandles(await res.text(), base + path)) {
        const k = h.platform + ":" + h.handle;
        if (!found.has(k)) found.set(k, h);
      }
    } catch { /* one dead path is not a dead site */ }
    await sleep(DELAY_MS);
  }
  return { error: reached ? null : "unreachable", found: [...found.values()], base };
}

(async () => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  let queue = [];
  for (const [table, entity_type, nameCol, webCol] of TABLES) {
    const { data, error } = await admin.from(table).select("id, " + nameCol + ", " + webCol).not(webCol, "is", null);
    if (error) { console.error(table + ": " + error.message); continue; }
    for (const r of data || []) queue.push({ id: r.id, name: r[nameCol], website: r[webCol], entity_type });
  }

  // One entity per domain: chains share a site, and fetching it once per branch
  // is rude for no extra information.
  const seenHost = new Set();
  queue = queue.filter((e) => {
    let h;
    try { h = new URL(e.website.startsWith("http") ? e.website : "https://" + e.website).hostname.replace(/^www\./, ""); }
    catch { return false; }
    if (/facebook|instagram|linktr|yelp|google\.com/.test(h)) return false;
    if (seenHost.has(h)) return false;
    seenHost.add(h);
    return true;
  });

  const batch = queue.slice(0, LIMIT);
  console.log((APPLY ? "APPLY" : "DRY RUN") + " - " + queue.length + " crawlable sites, doing " + batch.length + "\n");

  const rows = [];
  const stats = { reached: 0, unreachable: 0, withAny: 0, withIg: 0 };
  for (let i = 0; i < batch.length; i++) {
    const e = batch[i];
    const r = await crawl(e);
    if (r.error) { stats.unreachable++; process.stdout.write("!"); }
    else {
      stats.reached++;
      const hasIg = r.found.some((h) => h.platform === "instagram");
      if (r.found.length) stats.withAny++;
      if (hasIg) stats.withIg++;
      process.stdout.write(hasIg ? "@" : r.found.length ? "+" : ".");
      for (const h of r.found) {
        rows.push({
          entity_type: e.entity_type, entity_id: e.id, entity_name: jsonSafe(e.name),
          platform: h.platform, handle: jsonSafe(h.handle),
          site_url: jsonSafe(r.base), source_url: jsonSafe(h.sourceUrl),
          rejected_reason: null,
        });
      }
    }
    if ((i + 1) % 50 === 0) process.stdout.write(" " + (i + 1) + "\n");
  }
  console.log("\n");

  // The agency check, across rows: a handle credited on three or more unrelated
  // businesses belongs to whoever built the sites, not to the businesses.
  const { rejected } = rejectSharedHandles(rows.map((r) => ({ ...r, entityId: r.entity_id })));
  const rejectedKeys = new Set(rejected.map((r) => r.entity_id + ":" + r.platform + ":" + r.handle));
  for (const r of rows) {
    if (rejectedKeys.has(r.entity_id + ":" + r.platform + ":" + r.handle)) r.rejected_reason = "shared_across_businesses";
  }

  const igUsable = rows.filter((r) => r.platform === "instagram" && !r.rejected_reason);
  const byPlatform = {};
  rows.filter((r) => !r.rejected_reason).forEach((r) => (byPlatform[r.platform] = (byPlatform[r.platform] || 0) + 1));

  console.log("reached                  " + stats.reached + "/" + batch.length + "   (unreachable " + stats.unreachable + ")");
  console.log("  sites with any handle  " + stats.withAny);
  console.log("  sites with INSTAGRAM   " + stats.withIg + "  (" + (stats.reached ? Math.round((stats.withIg / stats.reached) * 100) : 0) + "% of reached)\n");
  console.log("handles found            " + rows.length);
  console.log("  instagram, usable      " + igUsable.length);
  console.log("  rejected as agency     " + rows.filter((r) => r.rejected_reason).length);
  console.log("  by platform            " + JSON.stringify(byPlatform) + "\n");

  console.log("sample instagram handles:");
  igUsable.slice(0, 10).forEach((r) => console.log("  @" + String(r.handle).padEnd(28) + " " + String(r.entity_name).slice(0, 36)));

  const agency = rows.filter((r) => r.rejected_reason);
  if (agency.length) {
    const names = [...new Set(agency.map((r) => r.platform + ":" + r.handle))].slice(0, 6);
    console.log("\nrejected as shared across businesses: " + names.join(", "));
  }

  if (!APPLY) { console.log("\nNothing written. Re-run with --apply."); return; }

  require("fs").writeFileSync("/tmp/entity_socials_" + rows.length + ".json", JSON.stringify(rows));
  let written = 0;
  for (let i = 0; i < rows.length; i += 25) {
    const chunk = rows.slice(i, i + 25);
    const { error } = await admin.from("entity_social_profiles").insert(chunk);
    if (error) { console.error("  chunk " + i + ": " + error.message); continue; }
    written += chunk.length;
  }
  console.log("\nwrote " + written + " of " + rows.length + " to entity_social_profiles (all unverified - confirmed_at is null).");
})();
