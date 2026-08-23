/**
 * Is a listing's address good enough to publish an indexable page for?
 *
 * WHY THIS EXISTS. An audit of the 1,185 school listings found 34 with no
 * usable street address at all. Two were named "Sponsored" and carried
 * "Hair salon · 1519 Texas Avenue South" — scraped Google ad slots, not
 * schools. One was in India. Nineteen were school DISTRICTS rather than
 * campuses, so their address is a district boundary and there is no building to
 * send anyone to.
 *
 * A page with no address cannot answer the question it exists to answer. It
 * still occupies a URL, a sitemap entry and a share of crawl budget on a domain
 * mid-migration.
 *
 * IT IS A PREDICATE, NOT A LIST, and that is the whole design. A hardcoded set
 * of 34 slugs goes stale the moment one is repaired: the page stays noindexed
 * with a perfectly good address until somebody remembers to edit the list.
 * Deriving it from the row means a repaired listing re-enters the index by
 * itself, and a newly-scraped bad row is excluded without anyone noticing it
 * arrived.
 *
 * NOINDEX, NOT DELETE, AND NOT A REDIRECT. These pages have traffic — 67 events
 * from ~18 visitors, and Joshua ISD alone drew 6 separate people, which is above
 * the average school page. That traffic is real demand ("does my district have a
 * cosmetology program?"), so deleting it destroys the answer along with the
 * defect. There is also nowhere to redirect to: a district is not a duplicate of
 * a campus, and 301-ing it somewhere else would be a lie about what the URL was.
 * Google is explicit that noindex is the instrument for "keep it, don't list
 * it": /search/docs/crawling-indexing/block-indexing.
 *
 * Pure — no network, no database. Imported by the page's generateMetadata and by
 * the sitemap, which must agree; a sitemap that submits a noindexed URL is a
 * contradiction Search Console reports as an error.
 */

/**
 * Fragments TDLR and Google both use where a street address belongs.
 *
 * "COSMETOLOGY DEPARTMENT" is not a mistake on our side — TDLR writes it as the
 * street address on 75 of its 257 vocational/high-school licences, so the state
 * has no better address either. Those listings cannot be repaired from the
 * licence data and are a known gap rather than a bug.
 */
const NON_ADDRESS = [
  /\bCOSMETOLOGY\s+DEPARTMENT\b/i,
  /\bDEPARTMENT\b/i,
  /\bINDEPENDENT\s+SCHOOL\s+DISTRICT\b/i,
  /\bCONSOLIDATED\s+INDEPENDENT\s+SCHOOL\b/i,
  /^P\.?\s*O\.?\s*BOX\b/i,
];

/**
 * True when the address contains a house number we could actually route to.
 *
 * The rule is only "does a segment before the city start with a house number".
 * An earlier version also demanded a street-type word after it and wrongly
 * rejected 19 good addresses — state highways ("4200 TX-91") and
 * suite-lettered numbers ("2440B S Stemmons Fwy", "12974-A Willow Chase Dr")
 * do not have one.
 */
export function hasUsableStreetAddress(formattedAddress: string | null | undefined): boolean {
  const raw = String(formattedAddress ?? "").trim();
  if (!raw) return false;

  // Google's results-page formatting, which means this row was scraped from a
  // listing card rather than a place: "Hair salon · 1519 Texas Avenue South".
  if (raw.includes("·")) return false;

  if (NON_ADDRESS.some((re) => re.test(raw))) return false;

  // Drop the ", TX 77379, USA" tail so the city is not mistaken for a street.
  const head = raw.replace(/,\s*[A-Z]{2}\s*\d{5}.*$/, "");

  return head
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .some((seg) => {
      // A Plus Code ("757G+VJ") looks numeric and is not an address.
      if (seg.includes("+")) return false;
      // "117/N/79, near neer cheer chauraha" — a non-US format.
      if (/^\d+\/[\dA-Z]/i.test(seg)) return false;
      return /^\d+[A-Za-z]*(-[A-Za-z0-9]+)?(\s|$)/.test(seg);
    });
}

/*
 * isIndexableSchool MOVED. It now lives as isSchoolIndexable in lib/indexable.ts,
 * which applies the same street-address and permanently-closed tests and then
 * adds the outcome-data requirement introduced after the August 2026 spam
 * update. hasUsableStreetAddress below is still the address primitive it calls.
 */
