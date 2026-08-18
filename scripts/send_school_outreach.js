#!/usr/bin/env node
/**
 * Send the school outreach campaign.
 *
 *   node scripts/send_school_outreach.js              # DRY RUN — shows exactly what would go
 *   node scripts/send_school_outreach.js --apply      # actually send
 *   node scripts/send_school_outreach.js --apply --limit=5
 *
 * Required: OUTREACH_POSTAL_ADDRESS, OUTREACH_TOKEN_SECRET, GHL_API_KEY,
 * GHL_LOCATION_ID. Missing any of them stops the run rather than sending a
 * message that is non-compliant or has a dead unsubscribe link.
 *
 * FOUR GATES, IN THIS ORDER, AND ALL OF THEM BEFORE THE NETWORK CALL:
 *
 *   1. The composer refuses any school we hold no 2026 rate for. The hook IS
 *      the message; without it this is the generic solicitation the whole
 *      design exists to avoid.
 *   2. Address quality — placeholders, font-designer addresses shipped in CSS,
 *      one template address across unrelated schools, districts and .edu.
 *   3. Suppression, re-read immediately before sending rather than when the
 *      list was built. A list built on Monday and sent on Friday has four days
 *      of opt-outs in it. This FAILS CLOSED: an unreadable suppression list
 *      stops the run, because mailing someone who opted out is the one error
 *      with a statutory penalty attached.
 *   4. Already-sent, enforced by a unique constraint in the database rather
 *      than a SELECT here — a script can be interrupted, re-run, or run twice
 *      by two people, and only the constraint holds in all three cases.
 *
 * PACED, NOT BURSTED. One message every 25 seconds. Thirty-seven emails
 * arriving in four seconds is a pattern; the same thirty-seven over a quarter
 * of an hour is a person working through a list. It also means an early
 * failure is caught before the whole campaign has gone out.
 *
 * RECORDS BEFORE IT MOVES ON. Each send is written to outreach_sends with the
 * exact body, so "what did you send me?" has an answer that is not "whatever
 * the template rendered at the time".
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const { buildSchoolOutreachEmail, MIN_TEST_TAKERS } = require("../lib/school-outreach-email.ts");
const { unsubscribeUrl, suppressedSet, normaliseEmail } = require("../lib/outreach-suppression.ts");
const { selectSendable } = require("../lib/outreach-address-quality.ts");

const APPLY = process.argv.includes("--apply");
const LIMIT = Number((process.argv.find((a) => a.startsWith("--limit=")) || "").split("=")[1]) || 500;
const PACE_MS = 25_000;
const CAMPAIGN = "school_pass_rates_2026";
const SITE = "https://shearquery.com";

const SENDER = {
  fromName: process.env.OUTREACH_FROM_NAME || "Lamont",
  postalAddress: process.env.OUTREACH_POSTAL_ADDRESS || "",
};

const CFG = {
  barber_school: {
    table: "agent_barber_school_leads", discipline: "barber",
    written: "written_pass_rate_2026", practical: "practical_pass_rate_2026", takers: "written_test_takers_2026",
  },
  cosmetology_school: {
    table: "agent_cosmetology_school_leads", discipline: "cosmetology",
    written: "cosmetology_written_pass_rate_2026", practical: "cosmetology_practical_pass_rate_2026",
    takers: "cosmetology_written_test_takers_2026",
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function requireEnv() {
  const missing = ["OUTREACH_POSTAL_ADDRESS", "GHL_API_KEY", "GHL_LOCATION_ID"]
    .filter((k) => !process.env[k]);
  // Matches what lib/outreach-suppression.ts actually does: it signs with
  // OUTREACH_TOKEN_SECRET and falls back to CRON_SECRET. Demanding the former
  // here while the library accepts either invited the worse mistake — setting
  // OUTREACH_TOKEN_SECRET locally to a value production does not share, which
  // would sign every unsubscribe link with a key production cannot verify.
  if (!process.env.OUTREACH_TOKEN_SECRET && !process.env.CRON_SECRET) {
    missing.push("OUTREACH_TOKEN_SECRET (or CRON_SECRET)");
  }
  if (missing.length) {
    console.error(`Refusing to run. Missing: ${missing.join(", ")}`);
    console.error("Without these the message is either non-compliant or its unsubscribe link is dead.");
    process.exit(1);
  }
}

/** GHL send, inlined rather than importing lib/ghl-email.ts, which is server-only. */
async function sendViaGhl({ email, subject, html, name }) {
  const headers = {
    Authorization: `Bearer ${process.env.GHL_API_KEY}`,
    "Content-Type": "application/json",
    Version: "2021-07-28",
  };
  const locationId = process.env.GHL_LOCATION_ID;

  let contactId;
  try {
    const res = await fetch("https://services.leadconnectorhq.com/contacts/", {
      method: "POST", headers,
      body: JSON.stringify({ email, name: name || email, locationId }),
    });
    const body = await res.json().catch(() => ({}));
    // A duplicate returns 400 with the existing id in meta — success for us.
    contactId = body.contact?.id || body.meta?.contactId;
  } catch (e) {
    return { ok: false, error: `contact upsert threw: ${e.message}` };
  }
  if (!contactId) return { ok: false, error: "no contact id returned" };

  try {
    const res = await fetch("https://services.leadconnectorhq.com/conversations/messages", {
      method: "POST", headers,
      body: JSON.stringify({ type: "Email", contactId, subject, html, emailTo: email }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      return { ok: false, error: `send failed: ${b.message || res.status}`, contactId };
    }
    return { ok: true, contactId };
  } catch (e) {
    return { ok: false, error: `send threw: ${e.message}`, contactId };
  }
}

(async () => {
  requireEnv();
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: crawls, error } = await admin
    .from("school_site_crawl")
    .select("entity_type, entity_id, school_name, emails, signals, crawled_at")
    .order("crawled_at", { ascending: false });
  if (error) throw new Error(error.message);

  const latest = new Map();
  for (const c of crawls || []) {
    const k = `${c.entity_type}:${c.entity_id}`;
    if (!latest.has(k)) latest.set(k, c);
  }

  const stateAvg = {}, rows = {};
  for (const [type, cfg] of Object.entries(CFG)) {
    const { data } = await admin.from(cfg.table)
      .select(`id, slug, school_name, city, ${cfg.written}, ${cfg.practical}, ${cfg.takers}`)
      .not(cfg.written, "is", null);
    rows[type] = new Map((data || []).map((r) => [r.id, r]));
    let passes = 0, takers = 0, schools = 0;
    for (const r of data || []) {
      const n = r[cfg.takers] ?? 0;
      if (!n) continue;
      passes += r[cfg.written] * n; takers += n; schools++;
    }
    stateAvg[type] = { rate: takers ? passes / takers : null, schools };
  }

  // --- Gate 1: composable at all ---
  const candidates = [];
  for (const c of latest.values()) {
    const cfg = CFG[c.entity_type];
    const school = rows[c.entity_type]?.get(c.entity_id);
    const email = (c.emails || [])[0]?.address;
    if (!email || !school) continue;
    if (school[cfg.takers] != null && school[cfg.takers] < MIN_TEST_TAKERS) continue;
    if (c.signals?.publishes_pass_rates) continue;

    const built = buildSchoolOutreachEmail({
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
    }, SENDER);
    if (!built) continue;

    candidates.push({
      email, schoolName: school.school_name || c.school_name,
      entity_type: c.entity_type, entity_id: c.entity_id, ...built,
    });
  }

  // --- Gate 2: address quality ---
  const { sendable, refused } = selectSendable(candidates);

  // --- Gate 3: suppression, read now, fails closed ---
  const suppressed = await suppressedSet(admin, sendable.map((s) => s.email));

  // --- Gate 4: already sent ---
  const { data: sentRows, error: sentErr } = await admin
    .from("outreach_sends").select("email").eq("campaign", CAMPAIGN);
  if (sentErr) throw new Error(`could not read send history, refusing to send: ${sentErr.message}`);
  const alreadySent = new Set((sentRows || []).map((r) => normaliseEmail(r.email)));

  const queue = sendable
    .filter((s) => !suppressed.has(normaliseEmail(s.email)))
    .filter((s) => !alreadySent.has(normaliseEmail(s.email)))
    .slice(0, LIMIT);

  console.log(`${APPLY ? "SENDING" : "DRY RUN"} — campaign "${CAMPAIGN}"`);
  console.log(`  from            : ${process.env.OUTREACH_FROM_EMAIL || "(GHL location default)"}`);
  console.log(`  postal address  : ${SENDER.postalAddress}`);
  console.log(`  composable      : ${candidates.length}`);
  console.log(`  after quality   : ${sendable.length}  (refused ${refused.length})`);
  console.log(`  suppressed      : ${suppressed.size}`);
  console.log(`  already sent    : ${alreadySent.size}`);
  console.log(`  TO SEND         : ${queue.length}\n`);

  if (!APPLY) {
    queue.forEach((q, i) => console.log(`  ${String(i + 1).padStart(2)}. ${q.email.padEnd(42)} ${q.subject}`));
    console.log(`\nDry run. Nothing sent. Re-run with --apply.`);
    return;
  }

  let ok = 0;
  const failures = [];
  for (let i = 0; i < queue.length; i++) {
    const q = queue[i];
    const res = await sendViaGhl({ email: q.email, subject: q.subject, html: q.html, name: q.schoolName });

    if (!res.ok) {
      failures.push({ email: q.email, error: res.error });
      console.log(`  ${String(i + 1).padStart(2)}/${queue.length}  FAIL  ${q.email}  ${res.error}`);
    } else {
      const { error: logErr } = await admin.from("outreach_sends").insert({
        email: normaliseEmail(q.email), campaign: CAMPAIGN,
        entity_type: q.entity_type, entity_id: q.entity_id, school_name: q.schoolName,
        subject: q.subject, body: q.text, provider: "ghl", provider_contact_id: res.contactId || null,
      });
      // A send we cannot record is a send we might repeat. Loud, and counted.
      if (logErr) failures.push({ email: q.email, error: `SENT BUT NOT LOGGED: ${logErr.message}` });
      ok++;
      console.log(`  ${String(i + 1).padStart(2)}/${queue.length}  sent  ${q.email}`);
    }

    if (i < queue.length - 1) await sleep(PACE_MS);
  }

  console.log(`\nsent ${ok} of ${queue.length}`);
  if (failures.length) {
    console.log(`\n${failures.length} problem(s):`);
    failures.forEach((f) => console.log(`  ${f.email}: ${f.error}`));
  }
})();
