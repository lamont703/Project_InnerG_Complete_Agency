#!/usr/bin/env node
/**
 * Crawl school websites for an outreach address and an outreach HOOK.
 *
 *   node scripts/crawl_school_sites.js                 # dry run, 25 schools
 *   node scripts/crawl_school_sites.js --limit=100     # dry run, more
 *   node scripts/crawl_school_sites.js --apply         # write to the lake
 *
 * TWO JOBS, AND THE SECOND ONE IS THE IMPORTANT ONE. Finding an email address
 * is easy and worth little on its own — a cold email that says "we list your
 * school, come claim it" is indistinguishable from the SEO spam every school
 * administrator already deletes. What makes a message worth reading is knowing
 * something specific about THAT school that its own site does not say. So this
 * records what each site publishes and, more usefully, what it omits.
 *
 * WRITES TO A LAKE, NEVER TO THE SCHOOL ROW. Everything here is inferred from
 * someone else's HTML by regex and none of it is verified until the school
 * replies. See the header of
 * supabase/migrations/20260818160000_create_school_site_crawl.sql for why that
 * distinction is load-bearing rather than fastidious.
 *
 * POLITE BY CONSTRUCTION. Serialised (never parallel), a delay between every
 * request, a short timeout, at most four pages per site, and a User-Agent that
 * says who we are with a URL to complain to. This reads public pages the way a
 * person would; it does not submit anything, and it stops at the door of any
 * site that asks it to.
 *
 * IT DOES NOT TOUCH CONTACT FORMS. It records that one exists and whether a
 * CAPTCHA guards it, because that is useful to know. Submitting them
 * automatically was considered and rejected — worse coverage than email, no way
 * to honour an opt-out, and it arrives in the exact envelope spam arrives in.
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const APPLY = process.argv.includes("--apply");
const LIMIT = Number((process.argv.find((a) => a.startsWith("--limit=")) || "").split("=")[1]) || 25;
const DELAY_MS = 900;

const PATHS = ["", "/contact", "/contact-us", "/about"];

const UA =
  "Mozilla/5.0 (compatible; ShearQueryBot/1.0; +https://shearquery.com/about) research crawler";

/**
 * Addresses that are not addresses. The first version of this captured
 * "ecom-swiper@11.css" and "sentry@o1234.ingest.sentry.io" — bundler filenames
 * and error-reporting DSNs both match the shape of an email closely enough.
 * Emailing one is harmless; putting it in front of a human as "the school's
 * address" is not, so they are filtered here rather than at review time.
 */
const JUNK_EMAIL =
  /\.(css|js|jsx|ts|png|jpe?g|gif|svg|webp|woff2?|map|json)$|^[0-9.]+@|sentry|wixpress|@sentry|ingest\.|example\.(com|org)|@2x|godaddy|@[0-9]+\.[0-9]/i;

/**
 * Addresses that reach a person, ranked. A school with both info@ and the
 * director's own address should be contacted at the one a human reads — but
 * `info@` is still far better than nothing, so this ranks rather than filters.
 */
function rankEmail(e) {
  if (/^(admissions|director|principal|owner|president)@/i.test(e)) return 0;
  if (/^(info|contact|hello|school|office|admin)@/i.test(e)) return 1;
  if (/gmail|yahoo|hotmail|outlook|icloud|aol/i.test(e)) return 2; // often the owner's real inbox
  if (/^(noreply|no-reply|donotreply|webmaster|postmaster|abuse|privacy)@/i.test(e)) return 9;
  return 3;
}

/** Strip tags so text matching isn't fooled by markup and attributes. */
function textOf(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;?/gi, " ")
    .replace(/\s+/g, " ");
}

/**
 * What the site says, and what it leaves out.
 *
 * `publishes_pass_rates` is the one that matters most. A school that does NOT
 * publish its pass rate is the strongest outreach target we have: we hold the
 * 2026 TDLR figure and its rank against every other school in the state, and
 * that is a fact about their business they cannot get anywhere else. A school
 * that already publishes it needs a different message, not a louder one.
 */
function extractSignals(text, html) {
  const t = text.toLowerCase();
  return {
    publishes_pass_rates: /\bpass rate|passage rate|licensure rate|exam results\b/.test(t),
    mentions_tdlr: /\btdlr|texas department of licensing\b/.test(t),
    mentions_naccas: /\bnaccas|accredit/.test(t),
    mentions_financial_aid: /\bfinancial aid|title iv|fafsa|pell\b/.test(t),
    lists_tuition: /\btuition|cost of (the )?program|program cost\b/.test(t),
    mentions_enrollment: /\benroll|apply now|start date|admissions\b/.test(t),
    has_booking_or_tour: /\bschedule a tour|book a tour|campus tour|schedule a visit\b/.test(t),
    // A school still pointing students at Facebook for hours is a different
    // conversation from one running a real site.
    social_only: /facebook\.com|instagram\.com/.test(html) && text.length < 800,
    text_length: text.length,
  };
}

/**
 * robots.txt, honoured.
 *
 * WE PUBLISH OPINIONS ABOUT CRAWLER ETIQUETTE — lib/robots-rules.ts exists
 * because we care which bots read this site and on what terms. Running a
 * crawler that ignores other people's robots.txt while maintaining our own
 * would be indefensible, and it is the kind of inconsistency that is only ever
 * noticed by the person it was done to.
 *
 * Deliberately strict: a site we cannot read the rules for is crawled (absent
 * robots.txt means no restriction), but a Disallow that matches is obeyed even
 * though almost none of these are aimed at us. Being over-polite to 546 small
 * businesses costs a few percent of coverage; being under-polite to one that
 * notices costs the brand we are trying to build with exactly this audience.
 */
const robotsCache = new Map();

async function disallowedPaths(origin) {
  if (robotsCache.has(origin)) return robotsCache.get(origin);
  let rules = [];
  try {
    const res = await fetch(origin + "/robots.txt", {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": UA },
    });
    if (res.ok) {
      const txt = await res.text();
      // Only groups that apply to us: `*` and any token containing our name.
      // Named groups do NOT inherit the `*` group — the same rule documented in
      // CLAUDE.md for our own robots.txt, applied from the other side.
      let applies = false;
      let sawOurGroup = false;
      const starRules = [];
      const ourRules = [];
      for (const line of txt.split(/\r?\n/)) {
        const m = line.match(/^\s*(user-agent|disallow)\s*:\s*(.*?)\s*(#.*)?$/i);
        if (!m) continue;
        const [, key, val] = m;
        if (/user-agent/i.test(key)) {
          applies = val === "*" || /shearquery/i.test(val);
          if (/shearquery/i.test(val)) sawOurGroup = true;
          continue;
        }
        if (applies && val) (sawOurGroup && /shearquery/i.test(val) ? ourRules : applies ? starRules : []).push(val);
      }
      rules = sawOurGroup && ourRules.length ? ourRules : starRules;
    }
  } catch {
    /* unreachable robots.txt is not a prohibition */
  }
  robotsCache.set(origin, rules);
  return rules;
}

function blockedByRobots(rules, path) {
  const p = path || "/";
  return rules.some((r) => r === "/" || (r && p.startsWith(r)));
}

async function fetchPage(url) {
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(9000),
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
  });
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("html")) return { status: res.status, html: "", finalUrl: res.url };
  return { status: res.status, html: await res.text(), finalUrl: res.url };
}

async function crawlSchool(school) {
  const base = (school.website.startsWith("http") ? school.website : "https://" + school.website).replace(/\/+$/, "");
  const row = {
    entity_type: school.entity_type,
    entity_id: school.id,
    school_name: school.school_name,
    site_url: base,
    final_url: null,
    http_status: null,
    fetch_error: null,
    emails: [],
    has_contact_form: false,
    contact_form_url: null,
    captcha_detected: false,
    signals: {},
    raw: {},
  };

  const found = new Map();
  let allText = "";
  let allHtml = "";
  let reached = false;

  const origin = new URL(base).origin;
  const rules = await disallowedPaths(origin);
  if (blockedByRobots(rules, "/")) {
    row.fetch_error = "robots.txt disallows crawling";
    return row;
  }

  for (const path of PATHS) {
    if (blockedByRobots(rules, path || "/")) continue;
    let page;
    try {
      page = await fetchPage(base + path);
    } catch (e) {
      if (path === "") row.fetch_error = String(e.message || e).slice(0, 120);
      await sleep(DELAY_MS);
      continue;
    }
    if (path === "") {
      row.http_status = page.status;
      row.final_url = page.finalUrl;
    }
    if (page.status !== 200 || !page.html) {
      await sleep(DELAY_MS);
      continue;
    }
    reached = true;
    const text = textOf(page.html);
    allText += " " + text;
    allHtml += page.html;
    row.raw[path || "/"] = text.slice(0, 4000);

    for (const m of page.html.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []) {
      const e = m.toLowerCase();
      if (JUNK_EMAIL.test(e)) continue;
      if (!found.has(e)) found.set(e, base + path);
    }

    if (/<form[\s\S]{0,4000}?(type=["']?email|name=["']?email|name=["']?message|<textarea)/i.test(page.html)) {
      if (!row.has_contact_form) {
        row.has_contact_form = true;
        row.contact_form_url = base + path;
      }
    }
    if (/recaptcha|hcaptcha|turnstile|g-recaptcha/i.test(page.html)) row.captcha_detected = true;

    await sleep(DELAY_MS);
  }

  if (!reached && !row.fetch_error) row.fetch_error = "no page returned 200";

  row.emails = [...found.entries()]
    .map(([address, source_url]) => ({ address, source_url, rank: rankEmail(address) }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 6);
  row.signals = reached ? extractSignals(allText, allHtml) : {};
  return row;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Independent school sites only. The .edu college districts are public
  // institutions with staff directories and procurement processes — a different
  // audience and a different message, held out so they don't distort the yield.
  let schools = [];
  for (const [table, entity_type] of [
    ["agent_barber_school_leads", "barber_school"],
    ["agent_cosmetology_school_leads", "cosmetology_school"],
  ]) {
    const { data, error } = await admin
      .from(table)
      .select("id, school_name, city, website, slug")
      .not("website", "is", null);
    if (error) throw new Error(`${table}: ${error.message}`);
    schools = schools.concat((data || []).map((s) => ({ ...s, entity_type })));
  }

  const seenHost = new Set();
  const queue = [];
  for (const s of schools) {
    let host;
    try {
      host = new URL(s.website.startsWith("http") ? s.website : "https://" + s.website).hostname.replace(/^www\./, "");
    } catch {
      continue;
    }
    if (/\.edu$/.test(host)) continue;
    if (/facebook|instagram|linktr|yelp|linkedin|google\.com/.test(host)) continue;

    // PUBLIC K-12 DISTRICTS ARE THE WRONG AUDIENCE, and there are 179 of them —
    // a third of the queue. A high school running a cosmetology program has no
    // owner to claim a listing, no marketing motive, and a district inbox that
    // routes nowhere useful; the .edu filter above misses them because
    // districts use .net/.org/.us. Excluded here rather than mailed and
    // ignored, which would depress every response rate we measure and teach us
    // the wrong lesson about the campaign.
    if (/isd|\.k12\.|risd/i.test(host) ||
        /high school|\bisd\b|career (and|&) technology/i.test(s.school_name || "")) continue;
    // One school per domain per run: several campuses share a site, and
    // fetching it once per campus is rude for no extra information.
    if (seenHost.has(host)) continue;
    seenHost.add(host);
    queue.push(s);
  }

  const batch = queue.slice(0, LIMIT);
  console.log(`${APPLY ? "APPLY" : "DRY RUN"} — ${queue.length} crawlable school sites, doing ${batch.length}\n`);

  const rows = [];
  for (let i = 0; i < batch.length; i++) {
    const row = await crawlSchool(batch[i]);
    rows.push(row);
    const mark = row.fetch_error ? "!" : row.emails.length ? "@" : ".";
    process.stdout.write(mark);
    if ((i + 1) % 50 === 0) process.stdout.write(` ${i + 1}\n`);
  }
  console.log("\n");

  const reached = rows.filter((r) => !r.fetch_error);
  const withEmail = reached.filter((r) => r.emails.length);
  const noPassRate = reached.filter((r) => r.signals.publishes_pass_rates === false);
  const hookable = withEmail.filter((r) => r.signals.publishes_pass_rates === false);

  console.log(`reached                     ${reached.length}/${rows.length}`);
  console.log(`  yielded an email          ${withEmail.length}  (${pct(withEmail.length, reached.length)})`);
  console.log(`  has a contact form        ${reached.filter((r) => r.has_contact_form).length}`);
  console.log(`  ...CAPTCHA-guarded        ${reached.filter((r) => r.has_contact_form && r.captcha_detected).length}`);
  console.log(`  does NOT publish a rate   ${noPassRate.length}  <- the hook`);
  console.log(`  EMAIL *AND* HOOK          ${hookable.length}  (${pct(hookable.length, reached.length)}) <- the actual target list\n`);

  console.log("sample targets:");
  hookable.slice(0, 8).forEach((r) =>
    console.log(`  ${(r.school_name || "").slice(0, 34).padEnd(36)} ${r.emails[0].address}`)
  );

  const errs = {};
  rows.filter((r) => r.fetch_error).forEach((r) => {
    const k = r.fetch_error.slice(0, 34);
    errs[k] = (errs[k] || 0) + 1;
  });
  if (Object.keys(errs).length) {
    console.log("\nfailures:");
    Object.entries(errs).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${String(v).padStart(3)}  ${k}`));
  }

  if (!APPLY) {
    console.log("\nNothing written. Re-run with --apply to record these in school_site_crawl.");
    return;
  }

  const { error } = await admin.from("school_site_crawl").insert(rows);
  if (error) throw new Error(`insert failed: ${error.message}`);
  console.log(`\nwrote ${rows.length} observations to school_site_crawl (all unverified — confirmed_at is null).`);
})();

function pct(a, b) {
  return b ? `${Math.round((a / b) * 100)}%` : "0%";
}
