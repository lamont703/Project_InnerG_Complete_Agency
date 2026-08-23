/**
 * Which entity pages Google is allowed to index.
 *
 * WHY THIS FILE EXISTS. The August 2026 spam update (started 2026-08-18) cut
 * this site's Search impressions by about 95% and dropped average position from
 * 8.3 to roughly 18 — uniformly, across every section, including the best
 * hand-written guide on the site. A uniform site-wide fall is Google judging the
 * DOMAIN, not the pages. There was no manual action, so it is algorithmic.
 *
 * The measurement that explains it, from Search Console for 2026-08-10..17:
 *
 *   4,300 queries -> 18,559 impressions -> 66 clicks. 0.36% CTR at position 8.3.
 *   98.6% of those queries got ZERO clicks, and they carried 95% of impressions.
 *
 * Every top query was a business someone was searching for by name — "supreme
 * beauty supply", "fraga barbershop", "ulta baytown". People who wanted that
 * business, shown a directory page instead. That is Google's doorway definition
 * almost verbatim: pages that rank for specific queries and "lead users to
 * intermediate pages that are not as useful as the final destination."
 *
 * And of 5,213 barbershop and salon rows, booth rent existed on 33, an owner
 * claim on 6, custom amenities on 4, an original write-up on 64 — while a Google
 * rating and review count existed on 100%. So ~99% of the pages restated Google
 * Maps and added nothing, which is the other policy: scaled content abuse,
 * "scraping feeds ... to generate many pages where little value is provided."
 *
 * THE RULE. An entity page may be indexed only if it carries at least one fact
 * Google Maps does not already have. Everything else gets `index: false,
 * follow: true` — it stays on the site, stays linked, stays useful to somebody
 * who arrives from elsewhere, and stops competing for a business's own name.
 *
 * `follow: true` is deliberate: link equity still flows to the pages that DO
 * earn their place, which is the opposite of what removing the pages would do.
 *
 * WHAT THIS IS NOT. It is not a fix for the "<name> Reviews · 4.8★" titles.
 * Those shipped 2026-08-11, a week before the drop, traffic rose afterwards, and
 * the page types that never carried that title fell just as hard. See
 * lib/entity-title.ts before changing them for SEO reasons.
 *
 * KEEP THE COLUMN LISTS AND THE PREDICATES TOGETHER. Every predicate below has
 * a matching `*_INDEX_COLUMNS` export naming exactly the columns it reads. A
 * caller that selects fewer columns does not get an error — it gets `undefined`
 * for the missing field and silently marks a good page noindex. app/shop has
 * already been bitten by exactly this (see the comment on its metaSelect), so
 * the lists exist to be spread into the select, never hand-copied.
 */

import { hasUsableStreetAddress } from "./listing-address-quality";

/** Present and meaningful — rejects null, undefined, "", [] and {}. */
function has(v: unknown): boolean {
  if (v === null || v === undefined || v === "") return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return true;
}

/**
 * A positive count.
 *
 * `booth_count_available` DEFAULTS TO 0 and `hiring_need` DEFAULTS TO false on
 * every row, so a plain null check passes all 5,213 shops and salons and the
 * rule does nothing at all. That mistake was made once while sizing this cut;
 * it is the reason these two helpers are separate from has().
 */
function positive(v: unknown): boolean {
  return v !== null && v !== undefined && Number(v) > 0;
}

/**
 * Rows that are not beauty schools.
 *
 * 201 of the 1,185 school rows are K-12 high schools — Klein High School,
 * Skyline High School, Hereford High School. Several genuinely run a TDLR
 * cosmetology program, so they are not bad data exactly, but a page competing
 * for "klein high school" is a doorway by definition: nobody making that search
 * wants a beauty-school directory.
 */
const K12 = /high school|middle school|\bisd\b/i;

export const SHOP_INDEX_COLUMNS = [
  "rent_rate", "claimed_at", "custom_amenities", "ai_culture_summary",
  "hiring_need", "booth_count_available",
] as const;

/**
 * Barbershops and salons: something the owner told us, or we wrote.
 *
 * Booth rent is the strongest signal here and the reason the rule is worth
 * having — "Month 1: $100/week, Month 2: $125/week" or "60/40 split with 100%
 * tips" is information that exists nowhere else on the web. Google Maps has the
 * rating and the hours; it does not have the chair rent.
 *
 * Census tract income is deliberately NOT on this list. It is public data keyed
 * to the neighbourhood, identical for every shop on the same block, so it makes
 * pages more template-like rather than less.
 */
export function isShopIndexable(row: Record<string, unknown> | null | undefined): boolean {
  if (!row) return false;
  return (
    has(row.rent_rate) ||
    has(row.claimed_at) ||
    has(row.custom_amenities) ||
    has(row.ai_culture_summary) ||
    row.hiring_need === true ||
    positive(row.booth_count_available)
  );
}

export const SCHOOL_INDEX_COLUMNS = [
  "school_name", "written_pass_rate_2026", "practical_pass_rate_2026",
  "annual_tuition", "completion_rate", "median_earnings",
  // The two the address/closed checks read, inherited from isIndexableSchool.
  "formatted_address", "google_business_status",
] as const;

/**
 * Schools: an outcome a prospective student would choose on.
 *
 * This is the strongest asset on the site. 2026 written and practical pass
 * rates, first-attempt rates and average attempts to pass, compiled from TDLR
 * and PSI, joined to College Scorecard tuition, completion, median earnings and
 * debt. No competitor publishes that combination.
 *
 * A TDLR licence number is NOT enough on its own — 481 rows carry one and no
 * outcome data, which makes them a directory listing again. Backfilling pass
 * rates is what promotes them, not loosening this check.
 */
export function isSchoolIndexable(row: Record<string, unknown> | null | undefined): boolean {
  if (!row) return false;

  /*
   * ABSORBED FROM isIndexableSchool in lib/listing-address-quality.ts, which
   * used to live there and carried a note that "the next reason to withhold a
   * page lands in one place that both callers already consult." This is that
   * place now — a school with no street address or a closed listing still fails
   * for the original reasons, and the outcome test below is added on top rather
   * than beside it. Two predicates for one question is the drift this codebase
   * keeps warning about.
   */
  if (!hasUsableStreetAddress(row.formatted_address as string | null | undefined)) return false;
  if (String(row.google_business_status ?? "").toUpperCase() === "CLOSED_PERMANENTLY") return false;

  if (K12.test(String(row.school_name ?? ""))) return false;

  return (
    has(row.written_pass_rate_2026) ||
    has(row.practical_pass_rate_2026) ||
    has(row.annual_tuition) ||
    has(row.completion_rate) ||
    has(row.median_earnings)
  );
}

export const PRO_INDEX_COLUMNS = [
  "licensure_status", "passport_submitted", "portfolio_images",
] as const;

/**
 * Barbers and cosmetologists: a credential or their own work.
 *
 * `booksy_services` is deliberately excluded, and it is the biggest judgement
 * call in this file — it would move 1,350 barber pages from noindex to indexed.
 * The prices are real and useful, but they are scraped from Booksy, who
 * outranks us for them, and we add nothing on top. Republishing another
 * aggregator's feed at scale is the precise pattern that got the site demoted,
 * so it is not the ground to rebuild on. A licence status or an uploaded
 * portfolio is ours; a scraped price list is not.
 */
export function isProIndexable(row: Record<string, unknown> | null | undefined): boolean {
  if (!row) return false;
  return (
    has(row.licensure_status) ||
    row.passport_submitted === true ||
    has(row.portfolio_images)
  );
}

/**
 * Supply stores: never.
 *
 * Not a policy choice so much as an observation about the schema. Every column
 * on both store tables — place_id, name, address, phone, website, rating,
 * total_reviews, place_types, hours, google_images — is a Google Maps field.
 * There is no first-party column to check because none was ever collected.
 *
 * These 910 pages were also the clearest doorways in the data: "supreme beauty
 * supply" 253 impressions and 0 clicks, "ulta baytown" 131 and 0, "bath and
 * body works modesto" 120 and 0. Ranking a directory page for a chain store's
 * own name helps nobody.
 *
 * If first-party data is ever collected for stores — brands actually carried,
 * pro-account terms, whether they sell to licensees only — this becomes a real
 * predicate. Until then it is honest for it to be constant.
 */
export function isStoreIndexable(): boolean {
  return false;
}

/** What Next.js should emit for a page the rule excludes. */
export const NOINDEX_FOLLOW = { index: false, follow: true } as const;
