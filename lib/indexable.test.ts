import { describe, it, expect } from "vitest";
import {
  isShopIndexable, isSchoolIndexable, isProIndexable, isStoreIndexable,
  SHOP_INDEX_COLUMNS, SCHOOL_INDEX_COLUMNS, PRO_INDEX_COLUMNS, NOINDEX_FOLLOW,
} from "./indexable";

/** A school that passes the inherited address + open-for-business checks. */
const school = (extra: Record<string, unknown> = {}) => ({
  school_name: "Alamo City Barber College",
  formatted_address: "1512 Bandera Rd, San Antonio, TX 78228",
  google_business_status: "OPERATIONAL",
  ...extra,
});

describe("isShopIndexable", () => {
  it("keeps a shop that publishes booth rent", () => {
    expect(isShopIndexable({ rent_rate: "$150/week" })).toBe(true);
  });

  it("keeps a claimed shop, an original write-up, and real open chairs", () => {
    expect(isShopIndexable({ claimed_at: "2026-08-01T10:56:24Z" })).toBe(true);
    expect(isShopIndexable({ ai_culture_summary: "Family-Friendly" })).toBe(true);
    expect(isShopIndexable({ hiring_need: true })).toBe(true);
    expect(isShopIndexable({ booth_count_available: 2 })).toBe(true);
  });

  /*
   * THE BUG THIS RULE WAS FIRST WRITTEN WITH. Both columns are NOT NULL with
   * falsy defaults, so a plain null check passed all 5,213 shops and salons and
   * the cut removed nothing. If these two ever go green while the ones above
   * stay green, the predicate has been loosened back to useless.
   */
  it("does not treat the false/zero defaults as data", () => {
    expect(isShopIndexable({ hiring_need: false, booth_count_available: 0 })).toBe(false);
  });

  it("drops a shop carrying only scraped Google Maps fields", () => {
    expect(isShopIndexable({
      shop_name: "Aliana Barbershop", rating: 4.6, total_reviews: 160,
      city: "Sugar Land", hiring_need: false, booth_count_available: 0,
    })).toBe(false);
  });

  it("ignores census data, which is identical across a whole neighbourhood", () => {
    expect(isShopIndexable({
      census_median_household_income: 91000, hiring_need: false, booth_count_available: 0,
    })).toBe(false);
  });

  it("survives a missing row", () => {
    expect(isShopIndexable(null)).toBe(false);
    expect(isShopIndexable(undefined)).toBe(false);
  });
});

describe("isSchoolIndexable", () => {
  it("keeps a school with exam or federal outcome data", () => {
    expect(isSchoolIndexable(school({ written_pass_rate_2026: 0.547 }))).toBe(true);
    expect(isSchoolIndexable(school({ practical_pass_rate_2026: 0.91 }))).toBe(true);
    expect(isSchoolIndexable(school({ annual_tuition: 10775 }))).toBe(true);
    expect(isSchoolIndexable(school({ median_earnings: 13654 }))).toBe(true);
  });

  it("keeps a 0% pass rate, which is an outcome and not a missing value", () => {
    expect(isSchoolIndexable(school({ written_pass_rate_2026: 0 }))).toBe(true);
  });

  it("drops a school whose only data is a TDLR licence number", () => {
    expect(isSchoolIndexable(school({ license_number: "1234567" }))).toBe(false);
  });

  it("drops K-12 schools, which are doorways for their own name", () => {
    expect(isSchoolIndexable(school({
      school_name: "Klein High School", written_pass_rate_2026: 0.8,
    }))).toBe(false);
  });

  // Inherited from the predicate this one absorbed — see lib/listing-address-quality.ts.
  it("still enforces the address and permanently-closed checks", () => {
    expect(isSchoolIndexable(school({
      formatted_address: "Klein, TX 77379, USA", written_pass_rate_2026: 0.8,
    }))).toBe(false);
    expect(isSchoolIndexable(school({
      google_business_status: "CLOSED_PERMANENTLY", written_pass_rate_2026: 0.8,
    }))).toBe(false);
  });
});

describe("isSchoolIndexable — behaviour inherited from isIndexableSchool", () => {
  // These moved here with the predicate. They now carry outcome data too,
  // because passing the address check alone is no longer enough to be indexed.
  it("re-indexes automatically once a broken address is repaired", () => {
    // The reason this is a predicate and not a list of slugs.
    const outcome = { school_name: "Joshua Beauty College", written_pass_rate_2026: 0.72 };
    expect(isSchoolIndexable({ ...outcome, formatted_address: "Joshua Independent School District, TX, USA" })).toBe(false);
    expect(isSchoolIndexable({ ...outcome, formatted_address: "909 S Broadway St, Joshua, TX 76058, USA" })).toBe(true);
  });
});

describe("isProIndexable", () => {
  it("keeps a licensed pro, a passport holder, and an uploaded portfolio", () => {
    expect(isProIndexable({ licensure_status: "Licensed" })).toBe(true);
    expect(isProIndexable({ passport_submitted: true })).toBe(true);
    expect(isProIndexable({ portfolio_images: ["https://example.com/a.jpg"] })).toBe(true);
  });

  it("treats an empty portfolio array as no portfolio", () => {
    expect(isProIndexable({ portfolio_images: [] })).toBe(false);
    expect(isProIndexable({ passport_submitted: false })).toBe(false);
  });

  /*
   * The deliberate exclusion, and the one most likely to be reversed by
   * someone who sees 1,350 pages go noindex and reaches for the nearest
   * populated column. Booksy prices are scraped from an aggregator that
   * outranks us for them; republishing a feed at scale is what got the site
   * demoted in the first place.
   */
  it("does not let scraped Booksy service lists qualify a profile", () => {
    expect(isProIndexable({
      booksy_services: [{ name: "Haircut", price: 45 }],
      booksy_price_range: "$30-$60",
      booksy_rating: 4.9,
    })).toBe(false);
  });
});

describe("isStoreIndexable", () => {
  it("is false by construction — stores hold no first-party data", () => {
    expect(isStoreIndexable()).toBe(false);
  });
});

describe("column lists stay in step with the predicates", () => {
  /*
   * A caller selecting fewer columns gets undefined, not an error, and quietly
   * marks a good page noindex. These assert the exported lists name every
   * column the predicate above actually reads.
   */
  it("names every column each rule depends on", () => {
    for (const c of ["rent_rate", "claimed_at", "custom_amenities", "ai_culture_summary", "hiring_need", "booth_count_available"])
      expect(SHOP_INDEX_COLUMNS).toContain(c);
    for (const c of ["school_name", "written_pass_rate_2026", "practical_pass_rate_2026", "annual_tuition", "completion_rate", "median_earnings", "formatted_address", "google_business_status"])
      expect(SCHOOL_INDEX_COLUMNS).toContain(c);
    for (const c of ["licensure_status", "passport_submitted", "portfolio_images"])
      expect(PRO_INDEX_COLUMNS).toContain(c);
  });

  it("emits follow so equity still reaches the pages that earned it", () => {
    expect(NOINDEX_FOLLOW).toEqual({ index: false, follow: true });
  });
});
