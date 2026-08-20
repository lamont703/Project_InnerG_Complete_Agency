#!/usr/bin/env node
/**
 * Cards computed from the shop and salon directory.
 *
 * WHY THESE ARE LIVE QUERIES, NOT CONSTANTS. The directory grows as crawlers
 * run, so a figure baked in at author time starts drifting the day it is
 * written. Every number here is recomputed at render time from the row count it
 * actually describes.
 *
 * ============================================================================
 * NO PERSONAL DETAIL, EVER — AND THE TABLES ARE FULL OF IT
 * ============================================================================
 * These are CRM tables. They carry owner_name, owner_first_name,
 * owner_last_name, phone, email and conversation history. None of that is
 * touched here and none of it may ever reach a card: a public video naming a
 * business owner, or implying we hold their number, is a different kind of
 * object from one quoting an aggregate.
 *
 * SAFE_COLUMNS below is the allowlist, and it is an allowlist rather than a
 * blocklist on purpose — a new personal column added to these tables later is
 * excluded by default instead of being included until somebody notices.
 *
 * AGGREGATES ONLY. No card names a single business. A count or a share is a
 * statement about a market; a named shop with a bad rating is a statement about
 * a person's livelihood, and we have no standing to make it.
 *
 * WHAT WAS REJECTED, and why it matters more than what was kept:
 *   google_hours      100% null on both tables. Nothing to say.
 *   rent_rate         33 shops, 0 salons. Far too thin to generalise.
 *   competitor_count  61 shops, and median == max == 20, which is a capped
 *                     value rather than a measurement. Salons have none.
 *   claimed_at        4 and 2. A fact about our product, not the industry.
 *   city mix          54.6% of salons are Houston — that is where WE collected,
 *                     not where salons are. Publishing it as an industry fact
 *                     would be false.
 *
 * Usage:
 *   node scripts/shorts/entity-cards.js --list
 *   node scripts/shorts/entity-cards.js --json
 */
require("dotenv").config({ path: ".env.local", override: true });
const { createClient } = require("@supabase/supabase-js");

/** Allowlist. Nothing outside this is read — see the note above. */
const SAFE_COLUMNS = "rating,total_reviews,website";

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const todayLabel = () =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "America/Chicago", day: "numeric", month: "short", year: "numeric" }).format(new Date());

async function pullAll(table) {
  const s = db();
  let all = [], from = 0;
  while (true) {
    const { data, error } = await s.from(table).select(SAFE_COLUMNS).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || !data.length) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  if (!all.length) throw new Error(`${table}: no rows — refusing to build a card from nothing`);
  return all;
}

const median = (nums) => {
  const s = [...nums].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

async function stats(table) {
  const rows = await pullAll(table);
  const rated = rows.filter((r) => r.rating != null).map((r) => Number(r.rating));
  const reviews = rows.filter((r) => r.total_reviews != null).map((r) => Number(r.total_reviews));
  return {
    n: rows.length,
    ratedN: rated.length,
    avg: rated.reduce((a, b) => a + b, 0) / Math.max(1, rated.length),
    perfect: rated.filter((r) => r === 5).length,
    belowFour: rated.filter((r) => r < 4).length,
    medianReviews: median(reviews),
    noWebsite: rows.filter((r) => !r.website).length,
  };
}

const SRC = (table, n) => `Source: ShearQuery directory · ${n.toLocaleString()} listings · ${todayLabel()}`;

async function build() {
  const shop = await stats("agent_barbershop_leads");
  const salon = await stats("agent_salon_leads");
  const pct = (a, b) => ((a / b) * 100).toFixed(0);
  /**
   * One decimal for the sub-4-star shares. Rounded to whole numbers they read
   * 1% and 3%, which makes the "twice the rate" comparison look like three
   * times — the rounding would have contradicted the sentence beside it.
   */
  const pct1 = (a, b) => ((a / b) * 100).toFixed(1);

  return [
    /* ------------------------------------------------------------ SHOPS */
    {
      key: "shops-no-website",
      chip: "Texas · Barbershops", tone: "bad",
      stat: shop.noWebsite.toLocaleString(),
      label: `Texas barbershops have no website listed on Google.`,
      punch: `That is ${pct(shop.noWebsite, shop.n)}% of every shop we track.`,
      source: SRC("shops", shop.n),
      question: "Does your shop have a website?",
      seoTitle: `${shop.noWebsite.toLocaleString()} Texas Barbershops Have No Website #Shorts`,
    },
    {
      key: "shops-avg-rating",
      chip: "Texas · Barbershops", tone: "good",
      stat: shop.avg.toFixed(2),
      label: `is the average Google rating across Texas barbershops.`,
      punch: `Measured across ${shop.ratedN.toLocaleString()} rated shops.`,
      source: SRC("shops", shop.n),
      question: "Would you go somewhere rated 4.2?",
      seoTitle: `Texas Barbershops Average ${shop.avg.toFixed(2)} Stars — Here's Why #Shorts`,
    },
    {
      key: "shops-perfect-five",
      chip: "Texas · Barbershops", tone: "good",
      stat: shop.perfect.toLocaleString(),
      label: `Texas barbershops hold a perfect 5.0 rating.`,
      punch: `Roughly one in ${Math.round(shop.ratedN / Math.max(1, shop.perfect))} of every shop rated.`,
      source: SRC("shops", shop.n),
      question: "Is a perfect 5.0 a green flag or a red one?",
      seoTitle: `${shop.perfect.toLocaleString()} Texas Barbershops Have a Perfect 5.0 #Shorts`,
    },
    {
      key: "shops-median-reviews",
      chip: "Texas · Barbershops", tone: "good",
      stat: shop.medianReviews.toLocaleString(),
      label: `reviews is the median for a Texas barbershop.`,
      punch: `Half of all shops have more. Half have fewer.`,
      source: SRC("shops", shop.n),
      question: "How many reviews before you trust a shop?",
      seoTitle: `The Median Texas Barbershop Has ${shop.medianReviews} Reviews #Shorts`,
    },
    {
      key: "shops-below-four",
      chip: "Texas · Barbershops", tone: "bad",
      stat: `${pct1(shop.belowFour, shop.ratedN)}%`,
      label: `of Texas barbershops rate below 4.0 stars.`,
      punch: `${shop.belowFour} shops out of ${shop.ratedN.toLocaleString()}. A bad barbershop is rare.`,
      source: SRC("shops", shop.n),
      question: "So why is finding a good one still hard?",
      seoTitle: `Only ${pct1(shop.belowFour, shop.ratedN)}% of Texas Barbershops Rate Below 4 Stars #Shorts`,
    },

    /* ----------------------------------------------------------- SALONS */
    {
      key: "salons-no-website",
      chip: "Texas · Salons", tone: "bad",
      stat: salon.noWebsite.toLocaleString(),
      label: `Texas salons have no website listed on Google.`,
      punch: `${pct(salon.noWebsite, salon.n)}% — higher than barbershops.`,
      source: SRC("salons", salon.n),
      question: "Would you book somewhere with no website?",
      seoTitle: `${salon.noWebsite.toLocaleString()} Texas Salons Have No Website #Shorts`,
    },
    {
      key: "salons-avg-rating",
      chip: "Texas · Salons", tone: "good",
      stat: salon.avg.toFixed(2),
      label: `is the average Google rating across Texas salons.`,
      punch: `Across ${salon.ratedN.toLocaleString()} rated salons.`,
      source: SRC("salons", salon.n),
      question: "Do salon reviews mean more than barber reviews?",
      seoTitle: `Texas Salons Average ${salon.avg.toFixed(2)} Stars #Shorts`,
    },
    {
      key: "salons-perfect-five",
      chip: "Texas · Salons", tone: "good",
      stat: salon.perfect.toLocaleString(),
      label: `Texas salons hold a perfect 5.0 rating.`,
      punch: `Slightly more common than in barbershops.`,
      source: SRC("salons", salon.n),
      question: "Does a 5.0 make you more or less suspicious?",
      seoTitle: `${salon.perfect.toLocaleString()} Texas Salons Have a Perfect 5.0 Rating #Shorts`,
    },
    {
      key: "salons-median-reviews",
      chip: "Texas · Salons", tone: "bad",
      stat: salon.medianReviews.toLocaleString(),
      label: `reviews is the median for a Texas salon.`,
      punch: `Barbershops sit at ${shop.medianReviews}. Nearly double.`,
      source: SRC("salons", salon.n),
      question: "Why do barbers get more reviews than salons?",
      seoTitle: `Texas Salons Get Half the Reviews Barbershops Do #Shorts`,
    },
    {
      key: "salons-below-four",
      chip: "Texas · Salons", tone: "bad",
      stat: `${pct1(salon.belowFour, salon.ratedN)}%`,
      label: `of Texas salons rate below 4.0 stars.`,
      punch: `Twice the rate of barbershops, at ${pct1(shop.belowFour, shop.ratedN)}%.`,
      source: SRC("salons", salon.n),
      question: "Is a salon just a harder room to please?",
      seoTitle: `Salons Get Bad Reviews Twice as Often as Barbershops #Shorts`,
    },
  ].map((c) => ({ ...c, date: todayLabel() }));
}

if (require.main === module) {
  (async () => {
    const cards = await build();
    if (process.argv.includes("--json")) { console.log(JSON.stringify(cards, null, 2)); return; }
    console.log(`\n  ${cards.length} entity cards\n`);
    for (const c of cards) {
      console.log(`  ${c.key.padEnd(24)} ${String(c.stat).padEnd(9)} ${c.label.slice(0, 52)}`);
      console.log(`  ${"".padEnd(24)} ${"".padEnd(9)} ${c.punch.slice(0, 52)}`);
    }
    console.log("");
  })().catch((e) => { console.error(e.message); process.exit(1); });
}

module.exports = { build };
