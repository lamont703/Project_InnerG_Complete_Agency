#!/usr/bin/env node
/**
 * Render the school outreach emails from real crawl + TDLR data. Sends nothing.
 *
 *   node scripts/preview_school_outreach.js          # counts + 3 full drafts
 *   node scripts/preview_school_outreach.js --all    # every draft
 *   node scripts/preview_school_outreach.js --n=8    # how many to print
 *
 * WHY A PREVIEW EXISTS AT ALL. The email quotes a real school's exam results
 * back to them under our name. The failure mode is not a bad open rate — it is
 * telling a school with a perfect record that 1% of its students pass, which
 * this codebase has already done once in a different surface. Reading the real
 * output over real rows is the only check that catches that class of error, so
 * it is a first-class script rather than something done once by hand.
 *
 * THE STATE AVERAGE IS WEIGHTED BY COHORT, not a mean of rates. Averaging the
 * rates themselves lets a one-candidate school at 100% count as much as a
 * 539-candidate one, which is the same distortion that made a league position
 * unusable here. Sum the passes, divide by the candidates.
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

// Node strips the types on require, the same way scripts/repair_school_addresses.js
// consumes lib/listing-address-quality.ts. The composer stays a single source
// of truth so the preview cannot drift from what actually gets sent.
const { buildSchoolOutreachEmail, MIN_TEST_TAKERS } = require("../lib/school-outreach-email.ts");
const { unsubscribeUrl, suppressedSet, normaliseEmail } = require("../lib/outreach-suppression.ts");

const SITE = "https://shearquery.com";
const N = Number((process.argv.find((a) => a.startsWith("--n=")) || "").split("=")[1]) || 3;
const ALL = process.argv.includes("--all");

const SENDER = {
  fromName: process.env.OUTREACH_FROM_NAME || "Lamont",
  // Deliberately not defaulted to a placeholder that would pass silently.
  postalAddress: process.env.OUTREACH_POSTAL_ADDRESS || "",
};

const CFG = {
  barber_school: {
    table: "agent_barber_school_leads",
    discipline: "barber",
    written: "written_pass_rate_2026",
    practical: "practical_pass_rate_2026",
    takers: "written_test_takers_2026",
  },
  cosmetology_school: {
    table: "agent_cosmetology_school_leads",
    discipline: "cosmetology",
    written: "cosmetology_written_pass_rate_2026",
    practical: "cosmetology_practical_pass_rate_2026",
    takers: "cosmetology_written_test_takers_2026",
  },
};

(async () => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Latest crawl per school. Append-only means several rows per school over
  // time; only the most recent describes the site as it is now.
  const { data: crawls, error } = await admin
    .from("school_site_crawl")
    .select("entity_type, entity_id, school_name, emails, signals, confirmed_at, crawled_at")
    .order("crawled_at", { ascending: false });
  if (error) throw new Error(error.message);

  const latest = new Map();
  for (const c of crawls || []) {
    const k = `${c.entity_type}:${c.entity_id}`;
    if (!latest.has(k)) latest.set(k, c);
  }

  // Weighted statewide average per discipline, plus the row lookup.
  const stateAvg = {};
  const rows = {};
  for (const [type, cfg] of Object.entries(CFG)) {
    const { data } = await admin
      .from(cfg.table)
      .select(`id, slug, school_name, city, ${cfg.written}, ${cfg.practical}, ${cfg.takers}`)
      .not(cfg.written, "is", null);
    rows[type] = new Map((data || []).map((r) => [r.id, r]));
    let passes = 0;
    let takers = 0;
    let schools = 0;
    for (const r of data || []) {
      const n = r[cfg.takers] ?? 0;
      if (!n) continue;
      passes += r[cfg.written] * n;
      takers += n;
      schools++;
    }
    stateAvg[type] = { rate: takers ? passes / takers : null, schools };
  }

  const drafts = [];
  const skipped = { no_email: 0, no_rate: 0, small_cohort: 0, already_publishes: 0, unreachable: 0 };

  for (const c of latest.values()) {
    const cfg = CFG[c.entity_type];
    const school = rows[c.entity_type]?.get(c.entity_id);
    const email = (c.emails || [])[0]?.address;

    if (!email) { skipped.no_email++; continue; }
    if (!school) { skipped.no_rate++; continue; }
    if (school[cfg.takers] != null && school[cfg.takers] < MIN_TEST_TAKERS) { skipped.small_cohort++; continue; }

    const built = buildSchoolOutreachEmail(
      {
        schoolName: school.school_name || c.school_name,
        city: school.city,
        discipline: cfg.discipline,
        writtenRate: school[cfg.written],
        practicalRate: school[cfg.practical],
        writtenTestTakers: school[cfg.takers],
        stateAverageRate: stateAvg[c.entity_type].rate,
        stateAverageSchools: stateAvg[c.entity_type].schools,
        listingUrl: `${SITE}/schools/${school.slug}`,
        unsubscribeUrl: unsubscribeUrl(SITE, email),
      },
      SENDER
    );
    if (!built) { skipped.no_rate++; continue; }

    // A school that already publishes its rate needs a different conversation,
    // not this one. Counted rather than silently dropped.
    if (c.signals?.publishes_pass_rates) { skipped.already_publishes++; continue; }

    drafts.push({ to: email, school: school.school_name, ...built });
  }

  // The gate, applied here too. A preview that shows drafts for people who
  // already opted out teaches the wrong number and invites sending them.
  const suppressed = await suppressedSet(admin, drafts.map((d) => d.to));
  const blocked = drafts.filter((d) => suppressed.has(normaliseEmail(d.to))).length;
  const sendable = drafts.filter((d) => !suppressed.has(normaliseEmail(d.to)));
  drafts.length = 0;
  drafts.push(...sendable);

  console.log(`crawled schools (latest per school): ${latest.size}`);
  if (blocked) console.log(`SUPPRESSED (already opted out): ${blocked}`);
  console.log(`SENDABLE DRAFTS: ${drafts.length}\n`);
  console.log("not sendable:");
  console.log(`  ${String(skipped.no_email).padStart(4)}  no email found on the site`);
  console.log(`  ${String(skipped.no_rate).padStart(4)}  no 2026 TDLR rate we can quote`);
  console.log(`  ${String(skipped.small_cohort).padStart(4)}  cohort under ${MIN_TEST_TAKERS} — the rate would be noise`);
  console.log(`  ${String(skipped.already_publishes).padStart(4)}  already publish their pass rate (different message)`);

  const show = ALL ? drafts : drafts.slice(0, N);
  for (const d of show) {
    console.log("\n" + "=".repeat(74));
    console.log(`To:      ${d.to}`);
    console.log(`Subject: ${d.subject}`);
    console.log("=".repeat(74));
    console.log(d.text);
  }
  console.log("\n" + "=".repeat(74));
  console.log("Preview only. Nothing was sent.");
})();
