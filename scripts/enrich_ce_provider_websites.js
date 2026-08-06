/**
 * Find and read each Texas CE provider's website.
 *
 * Usage:
 *   node scripts/enrich_ce_provider_websites.js --limit=25   # sample
 *   node scripts/enrich_ce_provider_websites.js              # all, DRY RUN
 *   node scripts/enrich_ce_provider_websites.js --commit     # write
 *
 * WHY THE WEBSITE RATHER THAN A MAPS LISTING. A licensee choosing a CE provider
 * is picking between about $10 and $25 for the same state-mandated four hours,
 * online. Hours, directions and a photo of a building answer nothing; price,
 * format and whether the business still exists answer everything. And most of
 * this dataset has no storefront by design — 8 names ARE domains, 20 say
 * "online", and one operator holds 20 licences across 20 cities on a single 888
 * number, so there is no Maps record to find for them at all.
 *
 * NO SEARCH-ENGINE SCRAPING. Candidate domains are DERIVED from the provider
 * name — "TEXAS COSMETOLOGY CE" -> texascosmetologyce.com — and then verified.
 * That is deterministic, free, and needs nobody's permission. It will not find
 * every site, and the ones it misses are recorded as unresolved rather than
 * guessed at. Reading a homepage over plain HTTP is what a browser does; these
 * are public marketing pages that want to be read.
 *
 * A 200 IS NOT EVIDENCE THE SITE IS THEIRS. Parked pages, domain squatters and
 * for-sale placeholders all answer 200 cheerfully, and writing a squatter's URL
 * onto a licensed provider would be worse than leaving the column null. Every
 * accepted URL has to tie back to the provider or to Texas CE by content, and
 * the reason is stored in website_verdict so it can be argued with.
 *
 * THE CHECK ALREADY CAUGHT SOMETHING. 1stopceus.com holds a Texas CE licence
 * and its homepage says "Ohio Cosmetology Continuing Education". Only reading
 * the site surfaces that, and it is exactly what a licensee would want flagged.
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const COMMIT = process.argv.includes("--commit");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;

const OUT_DIR = path.join(__dirname, "..", "scratchpad_reports");
const MIGRATION = path.join(__dirname, "..", "supabase", "migrations", "20260805140000_ce_provider_website_enrichment.sql");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Candidate domains for a provider name, best guess first.
 *
 * Deliberately conservative. A wrong guess that happens to resolve is worse
 * than no guess, so this only produces the obvious collapses of the name and
 * lets verification reject the rest.
 */
function candidateDomains(name) {
  const words = String(name || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(llc|inc|incorporated|co|corp|ltd|the|of)\b/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return [];

  const joined = words.join("");
  const out = new Set();

  // The name already contains a domain — by far the most reliable case.
  const inName = /([a-z0-9-]+\.(com|net|org|edu))/i.exec(String(name || ""));
  if (inName) out.add(inName[1].toLowerCase());

  if (joined.length >= 4 && joined.length <= 40) {
    out.add(`${joined}.com`);
    out.add(`${joined}.org`);
  }
  // Drop a leading numeral used purely to sort first ("1 A ACADEMY").
  if (/^\d/.test(words[0]) && words.length > 1) {
    const j2 = words.slice(1).join("");
    if (j2.length >= 4 && j2.length <= 40) out.add(`${j2}.com`);
  }
  return [...out].slice(0, 4);
}

const PARKED = /(domain (is )?for sale|buy this domain|parked (free )?courtesy|godaddy\.com\/domain|hugedomains|sedoparking|this domain (may be|is) for sale|under construction)/i;

/** Does anything on the page tie it to this provider, or to Texas CE at all? */
function confirms(html, provider) {
  const t = html.toLowerCase();
  const nameWords = String(provider.name || "")
    .toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/)
    .filter((w) => w.length > 3 && !["continuing", "education", "course", "courses", "texas"].includes(w));
  if (nameWords.some((w) => t.includes(w))) return true;
  // Or it is unmistakably a Texas cosmetology/barber CE page.
  const ce = /(cosmetolog|barber)/.test(t);
  const tx = /(texas|tdlr)/.test(t);
  const cont = /(continuing education|\bceu?s?\b|4[- ]hour)/.test(t);
  return ce && tx && cont;
}

/** Course prices only — a $ figure outside $5–$200 on a CE page is not one. */
function prices(html) {
  const found = [...html.matchAll(/\$\s?(\d{1,3}(?:\.\d{2})?)\b/g)]
    .map((m) => parseFloat(m[1]))
    .filter((n) => n >= 5 && n <= 200);
  if (!found.length) return { min: null, max: null };
  return { min: Math.min(...found), max: Math.max(...found) };
}

async function tryFetch(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ShearQueryDirectory/1.0; +https://agency.innergcomplete.com)" },
    });
    const html = await res.text();
    return { ok: res.ok, status: res.status, finalUrl: res.url, html };
  } catch (e) {
    return { ok: false, status: 0, finalUrl: url, html: "", error: e.name === "AbortError" ? "timeout" : e.message };
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  if (!process.env.SUPABASE_DB_PASSWORD) {
    console.error("SUPABASE_DB_PASSWORD is not set in .env.local");
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const c = new Client({
    host: "db.senkwhdxgtypcrtoggyf.supabase.co", port: 5432, user: "postgres",
    password: process.env.SUPABASE_DB_PASSWORD, database: "postgres", ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  try {
    if (COMMIT) { await c.query(fs.readFileSync(MIGRATION, "utf8")); console.log("columns ensured\n"); }
    else console.log("DRY RUN — nothing will be written\n");

    const { rows: all } = await c.query(
      `select id, slug, name, city, phone, is_active, address_provider_count
       from public.agent_texas_ce_provider_leads order by is_active desc nulls last, name`
    );
    const work = LIMIT ? all.slice(0, LIMIT) : all;
    console.log(`${work.length} providers to check\n`);

    const results = [];
    const tally = { confirmed: 0, unconfirmed: 0, parked: 0, dead: 0, unresolved: 0 };

    for (const [i, p] of work.entries()) {
      const cands = candidateDomains(p.name);
      let best = null;

      for (const d of cands) {
        const r = await tryFetch(`https://${d}`);
        if (!r.ok || !r.html) { await sleep(150); continue; }
        const parked = PARKED.test(r.html);
        const ok = confirms(r.html, p);
        const title = (/<title[^>]*>([^<]{0,120})/i.exec(r.html) || [])[1]?.trim().replace(/\s+/g, " ") || "";
        const pr = prices(r.html);
        const verdict = parked ? "parked" : ok ? "confirmed" : "unconfirmed";
        // Keep the strongest verdict seen; a confirmed hit ends the search.
        if (!best || verdict === "confirmed") {
          best = { domain: d, status: r.status, finalUrl: r.finalUrl, title, verdict, ...pr,
                   tdlr: /tdlr/i.test(r.html) };
        }
        if (verdict === "confirmed") break;
        await sleep(150);
      }

      if (!best) {
        tally.unresolved++;
        results.push({ ...p, verdict: "unresolved", tried: cands.join(" ") });
        console.log(`  [${i + 1}/${work.length}] unresolved  ${p.name}`);
      } else {
        tally[best.verdict]++;
        results.push({ ...p, ...best, tried: cands.join(" ") });
        const price = best.min != null ? `$${best.min}${best.max !== best.min ? `-$${best.max}` : ""}` : "";
        console.log(`  [${i + 1}/${work.length}] ${best.verdict.padEnd(11)} ${p.name.slice(0, 34).padEnd(34)} ${best.domain.padEnd(28)} ${price}`);
      }

      if (COMMIT && best) {
        await c.query(
          `update public.agent_texas_ce_provider_leads
             set website = $2, website_status = $3, website_final_url = $4, website_title = $5,
                 website_verdict = $6, price_min_usd = $7, price_max_usd = $8,
                 mentions_tdlr = $9, website_checked_at = now(), updated_at = now()
           where id = $1`,
          [p.id, best.verdict === "confirmed" ? `https://${best.domain}` : null,
           best.status, best.finalUrl, best.title, best.verdict, best.min, best.max, best.tdlr]
        );
      } else if (COMMIT) {
        await c.query(
          `update public.agent_texas_ce_provider_leads
             set website_verdict = 'unresolved', website_checked_at = now(), updated_at = now()
           where id = $1`, [p.id]
        );
      }
      await sleep(200);
    }

    const csv = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const file = path.join(OUT_DIR, "ce_provider_websites.csv");
    fs.writeFileSync(file, [
      "verdict,name,city,is_active,domain,final_url,title,price_min,price_max,mentions_tdlr,tried",
      ...results.map((r) => [r.verdict, r.name, r.city, r.is_active, r.domain, r.finalUrl,
        r.title, r.min, r.max, r.tdlr, r.tried].map(csv).join(",")),
    ].join("\n"));

    const priced = results.filter((r) => r.min != null);
    console.log(`\n  ==== RESULT over ${work.length} ====`);
    for (const [k, v] of Object.entries(tally)) console.log(`    ${k.padEnd(12)} ${v}`);
    if (priced.length) {
      const mins = priced.map((r) => r.min);
      console.log(`\n    with a price found: ${priced.length}   range $${Math.min(...mins)} – $${Math.max(...priced.map((r) => r.max))}`);
    }
    console.log(`\n  CSV: ${file}`);
    if (!COMMIT) console.log(`  Re-run with --commit to write.`);
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
