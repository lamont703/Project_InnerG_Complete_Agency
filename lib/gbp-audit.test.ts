import { describe, it, expect } from "vitest";
import { buildGbpAudit, splitKeywords, type GbpAuditInput } from "./gbp-audit";

/** A profile with nothing filled in — the state most listings are actually in. */
const EMPTY: GbpAuditInput = {
  location: { title: "Test Salon", categories: {}, profile: {}, regularHours: {} },
  attributesSet: [],
  attributesAvailable: new Array(50).fill({}),
  photos: { count: 0 },
  reviews: { total: 0, average: null, sampled: 0, unanswered: 0 },
  posts: { count: 0, latestIso: null },
  performance: null,
  searchKeywords: [],
  googleUpdated: { diffMask: null },
  verification: { hasVoiceOfMerchant: false },
  placeActions: [],
  now: new Date("2026-07-30T00:00:00Z"),
};

/** Everything Google will let you fill in. */
const COMPLETE: GbpAuditInput = {
  ...EMPTY,
  location: {
    title: "Test Salon",
    categories: {
      primaryCategory: { displayName: "Hair salon", name: "categories/gcid:hair_salon" },
      additionalCategories: [{ displayName: "Loctician service" }, { displayName: "Wig shop" }, { displayName: "Barber shop" }],
    },
    profile: { description: "x".repeat(400) },
    regularHours: { periods: [1, 2, 3, 4, 5, 6, 7].map((d) => ({ openDay: `DAY_${d}` })) },
    specialHours: { specialHourPeriods: [{}] },
    openInfo: { status: "OPEN" },
    serviceItems: new Array(6).fill({}),
    websiteUri: "https://example.com",
    phoneNumbers: { primaryPhone: "+1 555 0100" },
  },
  attributesSet: new Array(25).fill({}),
  photos: { count: 24 },
  reviews: { total: 40, average: 4.9, sampled: 10, unanswered: 0 },
  posts: { count: 5, latestIso: "2026-07-20T00:00:00Z" },
  verification: { hasVoiceOfMerchant: true },
  placeActions: [{}],
};

describe("buildGbpAudit", () => {
  it("scores an empty profile near the floor and a complete one near the top", () => {
    // Not zero: unknowns (no reviews sampled, no Google disagreement, no
    // "temporarily closed" flag) aren't penalised, and that floor is deliberate.
    expect(buildGbpAudit(EMPTY).score).toBeLessThanOrEqual(15);
    expect(buildGbpAudit(COMPLETE).score).toBeGreaterThan(95);
  });

  it("gives partial credit rather than treating 'some' as 'none'", () => {
    // Four photos against a target of ten should land between the extremes —
    // a shop that has done half the work shouldn't score as if it did nothing.
    const half = buildGbpAudit({ ...EMPTY, photos: { count: 4 } });
    const photos = half.checks.find((c) => c.id === "photos")!;
    expect(photos.earned).toBeGreaterThan(0);
    expect(photos.earned).toBeLessThan(photos.weight);
    expect(photos.status).toBe("warn");
  });

  it("states the observed value in every finding, so it can be checked", () => {
    const r = buildGbpAudit({ ...EMPTY, photos: { count: 3 } });
    expect(r.checks.find((c) => c.id === "photos")!.detail).toContain("3");
    expect(r.checks.find((c) => c.id === "attributes")!.detail).toContain("0 of 50");
  });

  it("orders priorities by how much score is actually on the table", () => {
    const r = buildGbpAudit(EMPTY);
    const gaps = r.priorities.map((c) => c.weight - c.earned);
    expect(gaps).toEqual([...gaps].sort((a, b) => b - a));
    // Attributes carry the most weight, so they lead an empty profile's list.
    expect(r.priorities[0].id).toBe("attributes");
  });

  it("treats a temporarily-closed listing as a hard failure", () => {
    const r = buildGbpAudit({
      ...COMPLETE,
      location: { ...COMPLETE.location, openInfo: { status: "CLOSED_TEMPORARILY" } },
    });
    const check = r.checks.find((c) => c.id === "open-status")!;
    expect(check.status).toBe("fail");
    expect(check.earned).toBe(0);
    expect(check.fix).toMatch(/before anything else/);
  });

  it("reports Google's disagreement field by field", () => {
    const r = buildGbpAudit({ ...COMPLETE, googleUpdated: { diffMask: "categories,websiteUri" } });
    const check = r.checks.find((c) => c.id === "google-drift")!;
    expect(check.status).toBe("warn");
    expect(check.detail).toContain("categories, websiteUri");
  });

  it("does not penalise a listing for reviews it has no sample of", () => {
    // No reviews sampled is unknown, not bad — scoring it as a failure would
    // punish new businesses for the API returning nothing.
    const check = buildGbpAudit(EMPTY).checks.find((c) => c.id === "review-replies")!;
    expect(check.status).toBe("info");
    expect(check.earned).toBe(check.weight);
  });

  it("flags an unverified profile as the thing to fix before optimising", () => {
    const check = buildGbpAudit(EMPTY).checks.find((c) => c.id === "voice-of-merchant")!;
    expect(check.status).toBe("fail");
    expect(check.fix).toMatch(/before investing/);
  });

  it("marks verification unknown rather than failed when the API gave nothing", () => {
    const check = buildGbpAudit({ ...EMPTY, verification: null }).checks
      .find((c) => c.id === "voice-of-merchant")!;
    expect(check.status).toBe("info");
    expect(check.fix).toBeUndefined();
  });

  it("keeps every area's possible score stable so scores compare across locations", () => {
    const a = buildGbpAudit(EMPTY), b = buildGbpAudit(COMPLETE);
    expect(Object.fromEntries(Object.entries(a.areas).map(([k, v]) => [k, v.possible])))
      .toEqual(Object.fromEntries(Object.entries(b.areas).map(([k, v]) => [k, v.possible])));
    expect(a.checks.reduce((s, c) => s + c.weight, 0)).toBe(100);
  });

  it("passes a check only when there is nothing left to do", () => {
    for (const c of buildGbpAudit(COMPLETE).checks) {
      if (c.status === "pass") expect(c.fix, c.id).toBeUndefined();
    }
  });
});

describe("splitKeywords", () => {
  const KW = [
    { keyword: "unique cuts", value: 80, threshold: null },
    { keyword: "barber shops near me", value: 63, threshold: null },
    { keyword: "unique image barber", value: 20, threshold: null },
    { keyword: "barberia cerca de mi", value: null, threshold: 15 },
  ];

  it("separates branded from discovery, since branded traffic isn't evidence SEO works", () => {
    const s = splitKeywords(KW, "Unique Image Barber Salon");
    expect(s.branded.map((k) => k.keyword)).toEqual(["unique cuts", "unique image barber"]);
    expect(s.discovery.map((k) => k.keyword)).toEqual(["barber shops near me", "barberia cerca de mi"]);
  });

  it("counts thresholded queries as zero rather than producing NaN", () => {
    const s = splitKeywords(KW, "Unique Image Barber Salon");
    expect(s.discoveryImpressions).toBe(63);
    expect(Number.isNaN(s.brandedImpressions)).toBe(false);
  });

  it("ignores short words in the name so 'the' or 'inc' don't brand everything", () => {
    const s = splitKeywords([{ keyword: "the barber", value: 5, threshold: null }], "The Inc Co");
    expect(s.branded).toHaveLength(0);
  });

  it("does not treat the trade itself as a brand token", () => {
    // The bug this pins: for "Unique Image Barber Salon", the word "barber"
    // would otherwise make "barber shops near me" — the most valuable discovery
    // query there is — count as branded traffic.
    const s = splitKeywords(
      [{ keyword: "barber shops near me", value: 63, threshold: null }],
      "Unique Image Barber Salon"
    );
    expect(s.discovery.map((k) => k.keyword)).toEqual(["barber shops near me"]);
    expect(s.branded).toHaveLength(0);
  });

  it("finds nothing branded when the whole name is generic", () => {
    const s = splitKeywords([{ keyword: "barber shop", value: 9, threshold: null }], "The Barber Shop");
    expect(s.branded).toHaveLength(0);
    expect(s.discovery).toHaveLength(1);
  });
});
