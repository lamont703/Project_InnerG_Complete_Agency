import { describe, it, expect } from "vitest";
import {
  buildPublicAudit,
  computeBenchmark,
  LOCKED_CHECKS,
  PUBLIC_ENTITY_TYPES,
  type PublicEntityFacts,
} from "./gbp-audit-public";

const NO_BENCH = computeBenchmark([], null);
const HOUSTON = computeBenchmark(
  Array.from({ length: 40 }, (_, i) => ({ photos: i, reviews: i * 5 })),
  "Houston"
);

const FACTS: PublicEntityFacts = {
  photos: 4, reviews: 12, rating: 4.6, hasHours: true,
  website: "https://x.com", phone: "+1 555 0100",
};

describe("computeBenchmark", () => {
  it("reports the median of the peer set", () => {
    const b = computeBenchmark([{ photos: 1, reviews: 10 }, { photos: 5, reviews: 30 }, { photos: 9, reviews: 50 }], "Houston");
    expect(b.medianPhotos).toBe(5);
    expect(b.medianReviews).toBe(30);
    expect(b.sampleSize).toBe(3);
  });

  it("returns nulls for an empty peer set rather than zero", () => {
    // Zero would read as "the median shop has no photos", which is a claim about
    // the market rather than an absence of data.
    expect(NO_BENCH.medianPhotos).toBeNull();
    expect(NO_BENCH.medianReviews).toBeNull();
  });
});

describe("buildPublicAudit", () => {
  it("always reports how little of the full audit it covers", () => {
    const r = buildPublicAudit(FACTS, HOUSTON);
    expect(r.coverage.visible).toBe(5);
    expect(r.coverage.total).toBe(5 + LOCKED_CHECKS.length);
    expect(r.coverage.total).toBeGreaterThan(r.coverage.visible);
  });

  it("does not let a perfect visible score imply a finished profile", () => {
    // The case that surfaced on real data: a school with hours, website, phone
    // and good reviews scored 100 while 8 checks were never looked at.
    const perfect = buildPublicAudit(
      { photos: null, reviews: 500, rating: 5, hasHours: true, website: "https://x.com", phone: "+1" },
      NO_BENCH
    );
    expect(perfect.score).toBe(100);
    expect(perfect.coverage.visible).toBeLessThan(perfect.coverage.total);
    expect(perfect.locked.length).toBeGreaterThan(0);
  });

  it("marks photos unavailable, not zero, where we hold no photo data", () => {
    // Schools have no photo column. Scoring zero would be a false finding about
    // the business rather than a gap in our data.
    const r = buildPublicAudit({ ...FACTS, photos: null }, HOUSTON);
    const photos = r.checks.find((c) => c.id === "photos")!;
    expect(photos.status).toBe("unavailable");
    expect(photos.weight).toBe(0);
    expect(photos.detail).not.toMatch(/\b0 photos\b/);
  });

  it("excludes unavailable checks from the denominator", () => {
    // Everything that can pass, passes — so a listing with no photo data must
    // still score 100 rather than being marked down for a column we don't hold.
    const maxed = { ...FACTS, reviews: 400 };
    expect(buildPublicAudit({ ...maxed, photos: 10 }, NO_BENCH).score).toBe(100);
    expect(buildPublicAudit({ ...maxed, photos: null }, NO_BENCH).score).toBe(100);
  });

  it("says so when a business matches its local median but both are low", () => {
    // Otherwise "you have 5, the median is 5" invites the owner to dismiss it.
    const bench = computeBenchmark(Array.from({ length: 20 }, () => ({ photos: 5, reviews: 40 })), "Houston");
    const r = buildPublicAudit({ ...FACTS, photos: 5 }, bench);
    const photos = r.checks.find((c) => c.id === "photos")!;
    expect(photos.detail).toMatch(/matches the Houston median/);
    expect(photos.detail).toMatch(/both are low/);
    expect(photos.detail).not.toMatch(/the in Houston/);
  });

  it("tells a business below the median that it is below it", () => {
    const r = buildPublicAudit({ ...FACTS, photos: 2 }, HOUSTON);
    expect(r.checks.find((c) => c.id === "photos")!.detail).toMatch(/below it/);
  });

  it("ignores a benchmark built from too few peers", () => {
    const thin = computeBenchmark([{ photos: 90, reviews: 900 }], "Nowhere");
    const r = buildPublicAudit({ ...FACTS, photos: 10 }, thin);
    // Falls back to the absolute target rather than judging against one shop.
    expect(r.checks.find((c) => c.id === "photos")!.status).toBe("pass");
  });

  it("flags missing essentials with a fix", () => {
    const r = buildPublicAudit(
      { photos: 0, reviews: 0, rating: null, hasHours: false, website: null, phone: null },
      NO_BENCH
    );
    expect(r.score).toBe(0);
    for (const c of r.checks) {
      expect(c.status, c.id).toBe("fail");
      expect(c.fix, c.id).toBeTruthy();
    }
  });

  it("offers no fix for a check that passes", () => {
    for (const c of buildPublicAudit({ ...FACTS, photos: 40, reviews: 400 }, HOUSTON).checks) {
      if (c.status === "pass") expect(c.fix, c.id).toBeUndefined();
    }
  });
});

describe("PUBLIC_ENTITY_TYPES", () => {
  it("uses the right review column per type — schools differ from shops", () => {
    expect(PUBLIC_ENTITY_TYPES.shop.reviewField).toBe("total_reviews");
    expect(PUBLIC_ENTITY_TYPES.barber_school.reviewField).toBe("google_review_count");
    expect(PUBLIC_ENTITY_TYPES.cosmetology_school.reviewField).toBe("google_review_count");
  });

  it("marks school tables as having no photo column", () => {
    expect(PUBLIC_ENTITY_TYPES.barber_school.imagesField).toBeNull();
    expect(PUBLIC_ENTITY_TYPES.shop.imagesField).toBe("google_images");
  });
});
