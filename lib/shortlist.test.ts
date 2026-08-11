import { describe, it, expect } from "vitest";
import {
  MIN_REVIEWS_FOR_RATING_SORT,
  SERVICE_OPTIONS,
  milesBetween,
  browseLinksFor,
  confidenceScore,
  deriveContext,
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

describe("keeping the search going", () => {
  it("follows the weight of the list, not the first row added", () => {
    // Four Houston salons and one Dallas barbershop is somebody shopping for a
    // salon in Houston, whichever they happened to add first.
    const ctx = deriveContext([
      row({ entityType: "shop", city: "Dallas" }),
      row({ entityType: "salon", city: "Houston" }),
      row({ entityType: "salon", city: "Houston" }),
      row({ entityType: "salon", city: "Houston" }),
      row({ entityType: "salon", city: "Houston" }),
    ]);
    expect(ctx).toEqual({ entityType: "salon", city: "Houston" });
  });

  it("survives a list with no city on any row", () => {
    expect(deriveContext([row({ city: null })]).city).toBeNull();
  });

  it("links to a best-of page only for cities that have one", () => {
    // The alternative is generating /best-salons-in-{city} from a database
    // value and linking confidently to a 404.
    const houston = browseLinksFor("salon", "Houston");
    expect(houston.some((l) => l.href === "/best-salons-in-houston")).toBe(true);

    const conroe = browseLinksFor("salon", "Conroe");
    expect(conroe.some((l) => l.href.startsWith("/best-"))).toBe(false);
    // …but it still gets a way to keep looking.
    expect(conroe.length).toBeGreaterThan(0);
  });

  it("pre-fills the search with the city and type rather than a blank box", () => {
    const [, all] = browseLinksFor("shop", "Austin");
    expect(all.href).toContain("q=Austin");
    expect(all.href).toContain("tab=Barbershops");
  });

  it("always offers a way out even with no city at all", () => {
    const links = browseLinksFor("salon", null);
    expect(links).toHaveLength(1);
    expect(links[0].href).toContain("tab=Salons");
  });

  it("slugifies multi-word cities correctly", () => {
    expect(browseLinksFor("shop", "San Antonio")[0].href).toBe("/best-barbershops-in-san-antonio");
  });
});

describe("confidence-adjusted ranking", () => {
  it("ranks 4.8 from 1,120 above 5.0 from 14", () => {
    // The live failure this exists for: comparing Salon Rose (4.8 / 1,120) and
    // being offered three 5.0s from 14, 26 and 56 reviews. All cleared the
    // floor; raw-rating order put every one of them on top.
    // The prior is the average of every nearby business, including the 3.8s —
    // NOT the average of the ones that already cleared the review floor, which
    // was the first version's bug and left the mean at 4.9 where shrinkage
    // barely moved anything.
    const pool = 4.5;
    expect(confidenceScore(4.8, 1120, pool)).toBeGreaterThan(confidenceScore(5.0, 14, pool));
  });

  it("still lets a well-evidenced 5.0 win", () => {
    const pool = 4.8;
    expect(confidenceScore(5.0, 900, pool)).toBeGreaterThan(confidenceScore(4.8, 1120, pool));
  });

  it("pulls a thin rating toward the pool mean, not past it", () => {
    // A single 5-star review should land just above the mean, not at 5.0.
    const pool = 4.5;
    const s = confidenceScore(5.0, 1, pool);
    expect(s).toBeGreaterThan(pool);
    expect(s).toBeLessThan(4.6);
  });

  it("is monotonic in review count for the same rating", () => {
    const pool = 4.5;
    const a = confidenceScore(4.9, 20, pool);
    const b = confidenceScore(4.9, 500, pool);
    expect(b).toBeGreaterThan(a);
  });

  it("does not divide by zero for a business with no reviews", () => {
    expect(Number.isFinite(confidenceScore(0, 0, 4.5))).toBe(true);
  });
});
