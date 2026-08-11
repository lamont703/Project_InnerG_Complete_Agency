import { describe, it, expect } from "vitest";
import {
  MIN_REVIEWS_FOR_RATING_SORT,
  SERVICE_OPTIONS,
  milesBetween,
  newShareToken,
  sortRows,
  type ComparisonRow,
} from "./shortlist";

const row = (p: Partial<ComparisonRow>): ComparisonRow => ({
  entityType: "salon", slug: "x", name: "X", city: null, address: null,
  rating: null, reviewCount: null, category: null, photo: null, phone: null,
  website: null, lat: null, lng: null, ...p,
});

describe("the rating sort", () => {
  it("does not let a 5.0 from three people beat a 4.7 from nine hundred", () => {
    // This is the whole reason the sort has a floor. "Highest rated" without one
    // surfaces the least-known businesses, which is the opposite of what someone
    // comparing salons means by the phrase.
    const sorted = sortRows([
      row({ slug: "tiny", rating: 5.0, reviewCount: 3 }),
      row({ slug: "known", rating: 4.7, reviewCount: 900 }),
    ], "rating");
    expect(sorted[0].slug).toBe("known");
  });

  it("keeps thin-review rows visible at the bottom rather than hiding them", () => {
    // Hiding a business the visitor deliberately added would be a bug, not a
    // ranking decision.
    const sorted = sortRows([
      row({ slug: "tiny", rating: 5.0, reviewCount: 3 }),
      row({ slug: "known", rating: 4.7, reviewCount: 900 }),
    ], "rating");
    expect(sorted).toHaveLength(2);
    expect(sorted[1].slug).toBe("tiny");
  });

  it("applies the floor at the boundary, not above it", () => {
    const at = sortRows([
      row({ slug: "at-floor", rating: 4.9, reviewCount: MIN_REVIEWS_FOR_RATING_SORT }),
      row({ slug: "below", rating: 5.0, reviewCount: MIN_REVIEWS_FOR_RATING_SORT - 1 }),
    ], "rating");
    expect(at[0].slug).toBe("at-floor");
  });
});

describe("other sorts", () => {
  it("puts rows with no distance last rather than first", () => {
    // A null distance sorting to the top would read as "closest".
    const sorted = sortRows([
      row({ slug: "unknown", distanceMiles: null }),
      row({ slug: "near", distanceMiles: 0.4 }),
    ], "distance");
    expect(sorted[0].slug).toBe("near");
  });

  it("leaves the visitor's own order alone by default", () => {
    const input = [row({ slug: "b", rating: 5 }), row({ slug: "a", rating: 1 })];
    expect(sortRows(input, "added").map((r) => r.slug)).toEqual(["b", "a"]);
  });

  it("treats a missing review count as zero, not as infinity", () => {
    const sorted = sortRows([
      row({ slug: "none", reviewCount: null }),
      row({ slug: "some", reviewCount: 5 }),
    ], "reviews");
    expect(sorted[0].slug).toBe("some");
  });
});

describe("distance", () => {
  it("computes a believable real-world distance", () => {
    // Downtown Houston to Sugar Land is roughly 20 miles.
    const d = milesBetween({ lat: 29.7604, lng: -95.3698 }, { lat: 29.6197, lng: -95.6349 });
    expect(d).toBeGreaterThan(15);
    expect(d).toBeLessThan(25);
  });

  it("is zero for the same point", () => {
    expect(milesBetween({ lat: 29.7, lng: -95.3 }, { lat: 29.7, lng: -95.3 })).toBeCloseTo(0, 5);
  });
});

describe("share tokens", () => {
  it("is long enough not to be guessable", () => {
    // The row can carry an email address; enumerable tokens would expose every
    // saved list to anyone who can count.
    expect(newShareToken()).toMatch(/^[0-9a-f]{32}$/);
  });

  it("does not repeat", () => {
    const seen = new Set(Array.from({ length: 500 }, () => newShareToken()));
    expect(seen.size).toBe(500);
  });
});

describe("service options", () => {
  it("does not offer salon services on a barbershop", () => {
    // Asking a barbershop visitor about silk press produces noise, not signal.
    expect(SERVICE_OPTIONS.shop).not.toContain("Silk press");
    expect(SERVICE_OPTIONS.salon).toContain("Silk press");
  });

  it("offers a usable number of choices for both", () => {
    for (const k of ["shop", "salon"] as const) {
      expect(SERVICE_OPTIONS[k].length).toBeGreaterThanOrEqual(4);
      expect(SERVICE_OPTIONS[k].length).toBeLessThanOrEqual(10);
    }
  });
});
