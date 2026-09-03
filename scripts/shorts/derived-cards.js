#!/usr/bin/env node
/**
 * Cards computed from our own data, which is what actually keeps the pool full.
 *
 * ============================================================================
 * WHY THIS EXISTS ALONGSIDE regulator-diff.js
 * ============================================================================
 * The diff is a real source and a rare one. Twenty-five TDLR pages baselined
 * and not one had changed, because regulators revise fee schedules a couple of
 * times a year — not twice a day. A pipeline that publishes on a schedule
 * cannot be fed by an event that happens quarterly.
 *
 * What CAN feed it is data that moves on its own: licenses expiring this month,
 * the shape of the licensee base, the directory growing. Those are computable
 * every day from ~433,000 rows nobody else holds.
 *
 * THRESHOLD GATING IS THE WHOLE DIFFERENCE BETWEEN THIS AND A SPAM BOT. A
 * derived value is available every single day, so "is it available" is a
 * useless test. A card is only produced when the value has MOVED MATERIALLY
 * since the last time we published that card — `_derived-state.json` records
 * what was last said, and a figure that has not moved past its threshold
 * produces nothing. Without that, this posts the same number forever with a
 * different date on it.
 *
 * FIGURES ARE COUNTS AND SHARES, DELIBERATELY. A count of rows matching a
 * predicate is defensible and checkable. A derived ratio from a table nobody
 * has audited is a number we would have to defend without being able to. The
 * TDLR lake is a raw dump — `tdlr_licensees_raw` — so anything clever computed
 * on top of it inherits every quality problem in it.
 *
 * Usage:
 *   node scripts/shorts/derived-cards.js --list        # what is available today
 *   node scripts/shorts/derived-cards.js --refresh     # recompute and gate
 *   node scripts/shorts/derived-cards.js --json
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env.local") });
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.join(__dirname, "..", "..");
const STATE = path.join(ROOT, "reference", "Podcast Visuals", "Shorts", "_derived-state.json");
const OUT = path.join(ROOT, "reference", "Podcast Visuals", "Shorts", "_derived-cards.json");

const argv = process.argv.slice(2);
const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Count, or throw. Never `count || 0`.
 *
 * THIS IS THE MOST DANGEROUS LINE IN THE FILE and it was wrong first time. A
 * failed or timed-out count returns null, `|| 0` turns that into zero, and the
 * pipeline then publishes "0 Texas licenses expire this month" — a false claim,
 * stated confidently, with a source line under it. The metric ran twice here
 * and returned 15,174 then 0 for the same query, which is exactly what that
 * failure looks like from the outside: not an error, just a different fact.
 *
 * A metric that cannot compute must break the run, not quietly become zero.
 */
async function countOrThrow(query, what) {
  const { count, error } = await query;
  if (error) throw new Error(`${what}: ${error.message}`);
  if (count === null || count === undefined) throw new Error(`${what}: no count returned`);
  return count;
}

const monthLabel = (d) => new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "America/Chicago" }).format(d);
const todayLabel = () =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "America/Chicago", day: "numeric", month: "short", year: "numeric" }).format(new Date());

/**
 * Expiration dates in the lake are MMDDCCYY strings, not dates — it is a raw
 * dump of a state file. Comparing them requires building the pattern rather
 * than casting, and a cast would silently drop malformed rows instead of
 * failing loudly.
 */
function mmddccyyPrefixForMonth(date) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return { mm, yyyy };
}

/* ------------------------------------------------------------------ metrics */

const METRICS = {
  /**
   * How many Texas licenses expire this calendar month. A renewal wave is the
   * single most actionable thing we can tell a licensee, and it changes every
   * month by construction — which is why the threshold is "the month changed"
   * rather than a percentage.
   */
  "renewal-wave": {
    threshold: { kind: "monthly" },
    async compute() {
      const s = db();
      const now = new Date();
      const { mm, yyyy } = mmddccyyPrefixForMonth(now);
      // MMDDCCYY -> month is chars 1-2, year is chars 5-8.
      const count = await countOrThrow(
        s.from("tdlr_licensees_raw").select("*", { count: "exact", head: true })
          .like("license_expiration_date_mmddccyy", `${mm}%${yyyy}`),
        "renewal-wave"
      );
      return { value: count, month: monthLabel(now), period: `${yyyy}-${mm}` };
    },
    card: (m) => ({
      chip: "Texas · Renewals",
      stat: Number(m.value).toLocaleString(),
      label: `Texas barber and cosmetology licenses expire in ${m.month}.`,
      punch: "Late renewal costs 1.5x the fee. After 90 days it doubles.",
      source: `Source: TDLR licensee file · read ${todayLabel()}`,
      question: "Do you know your own expiry date?",
      tone: "bad",
      seoTitle: `${Number(m.value).toLocaleString()} Texas Beauty Licenses Expire This Month #Shorts`,
    }),
  },

  /**
   * The size of the licensed population. Moves slowly, so the gate is a 2%
   * change — enough that "the trade grew" is actually true when we say it.
   */
  "licensed-population": {
    threshold: { kind: "relative", pct: 0.02 },
    async compute() {
      const s = db();
      const count = await countOrThrow(
        s.from("tdlr_licensees_raw").select("*", { count: "exact", head: true }),
        "licensed-population"
      );
      return { value: count };
    },
    card: (m) => ({
      chip: "Texas · Licensing",
      stat: `${(m.value / 1000).toFixed(0)}k`,
      label: "license records are on file with TDLR for the beauty trades.",
      punch: "Every one of them renews on a clock most people forget.",
      source: `Source: TDLR licensee file · read ${todayLabel()}`,
      question: "Is the trade bigger than you thought?",
      tone: "good",
      seoTitle: `${(m.value / 1000).toFixed(0)},000 Texas Beauty License Records — The Real Number #Shorts`,
    }),
  },

  /**
   * Directory coverage. A count of what we track, which grows as the crawlers
   * run. Gate at 5% so it is a genuine milestone rather than a weekly nudge.
   */
  "directory-coverage": {
    threshold: { kind: "relative", pct: 0.05 },
    async compute() {
      const s = db();
      const tables = ["agent_barbershop_leads", "agent_salon_leads", "agent_barber_school_leads", "agent_cosmetology_school_leads"];
      const counts = await Promise.all(
        tables.map((t) => countOrThrow(s.from(t).select("*", { count: "exact", head: true }), t))
      );
      return { value: counts.reduce((a, b) => a + b, 0) };
    },
    card: (m) => ({
      chip: "Texas · Directory",
      stat: Number(m.value).toLocaleString(),
      label: "shops, salons and schools tracked with real outcome data.",
      punch: "Pass rates and penalties, not just star ratings.",
      source: `Source: ShearQuery directory · ${todayLabel()}`,
      question: "What would you check before picking a school?",
      tone: "good",
      seoTitle: `${Number(m.value).toLocaleString()} Texas Beauty Businesses, Ranked by Real Data #Shorts`,
    }),
  },
};

/* ------------------------------------------------------------------ gating */

const readState = () => { try { return JSON.parse(fs.readFileSync(STATE, "utf8")); } catch { return {}; } };

/**
 * Has this moved enough to be worth saying again?
 *
 * `monthly` fires once per calendar period — the right rule for anything whose
 * headline IS the period. `relative` needs the value to have moved by pct.
 * Never-published always passes, which is how a new metric gets its first run.
 */
function passesThreshold(key, metric, current, state) {
  const last = state[key];
  if (!last) return { pass: true, why: "never published" };
  if (metric.threshold.kind === "monthly") {
    return current.period !== last.period
      ? { pass: true, why: `new period ${current.period}` }
      : { pass: false, why: `already published for ${current.period}` };
  }
  const prev = Number(last.value) || 0;
  if (!prev) return { pass: true, why: "no prior value" };
  const delta = Math.abs(current.value - prev) / prev;
  return delta >= metric.threshold.pct
    ? { pass: true, why: `moved ${(delta * 100).toFixed(1)}%` }
    : { pass: false, why: `moved ${(delta * 100).toFixed(1)}%, under ${(metric.threshold.pct * 100).toFixed(0)}%` };
}

async function main() {
  const state = readState();
  const rows = [];

  for (const [key, metric] of Object.entries(METRICS)) {
    let current;
    try {
      current = await metric.compute();
    } catch (e) {
      console.log(`  ${key.padEnd(22)} FAILED  ${e.message.slice(0, 70)}`);
      continue;
    }
    /**
     * Zero is refused outright. Every metric here counts something that
     * demonstrably exists, so a zero means the query broke in a way that did
     * not raise — and "0 licenses expire this month" is worse than no card.
     */
    if (!current.value) {
      console.log(`  ${key.padEnd(22)} ${"0".padStart(9)}  SKIP   value is zero — treating as a failed query, not a fact`);
      continue;
    }
    const gate = passesThreshold(key, metric, current, state);
    rows.push({ key, current, gate, card: gate.pass ? metric.card(current) : null });
    console.log(`  ${key.padEnd(22)} ${String(current.value).padStart(9)}  ${gate.pass ? "READY" : "hold "}  ${gate.why}`);
  }

  const ready = rows.filter((r) => r.gate.pass);

  if (argv.includes("--refresh")) {
    /**
     * State is stamped only for cards we are actually emitting. Stamping a
     * held metric would reset its baseline and mean the next real move is
     * measured from the wrong place.
     */
    for (const r of ready) state[r.key] = { value: r.current.value, period: r.current.period || null, at: new Date().toISOString() };
    fs.mkdirSync(path.dirname(STATE), { recursive: true });
    fs.writeFileSync(STATE, JSON.stringify(state, null, 2) + "\n");
    /**
     * A PERIOD-SCOPED CARD CARRIES ITS PERIOD IN THE KEY. item_key is the
     * queue's dedupe key, and queue_entity_cards.js skips anything already
     * there. A monthly card emitted under a bare `derived:renewal-wave` would
     * therefore collide with the row it published LAST month and be skipped in
     * silence — the gate says READY, the queue says nothing to add, and no one
     * is told the two disagree. September 2026 hit exactly that.
     */
    const emitKey = (r) => (r.current.period ? `derived:${r.key}:${r.current.period}` : `derived:${r.key}`);
    /**
     * REFRESH IS NOT IDEMPOTENT, and this guard is why running it twice is now
     * survivable. State is stamped above, so the SECOND run in the same period
     * gates the same metric to "hold" and `ready` comes back empty — which
     * used to overwrite this file with `[]`, destroying the card the first run
     * had just emitted and leaving nothing to queue. An empty result now means
     * "nothing new to say", so the previous emission stands; the queue dedupes
     * on item_key anyway, so a card left here after being queued is inert.
     */
    if (ready.length) {
      fs.writeFileSync(OUT, JSON.stringify(ready.map((r) => ({ key: emitKey(r), ...r.card })), null, 2) + "\n");
      console.log(`\n  ${ready.length} card(s) written to ${path.relative(ROOT, OUT)}`);
    } else {
      console.log(`\n  0 ready — leaving ${path.relative(ROOT, OUT)} as it is.`);
    }
  } else {
    console.log(`\n  ${ready.length} ready. Nothing written — pass --refresh to emit and stamp state.`);
  }

  if (argv.includes("--json")) console.log(JSON.stringify(rows, null, 2));
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });

module.exports = { METRICS };
