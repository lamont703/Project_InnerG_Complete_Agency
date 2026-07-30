import { describe, it, expect } from "vitest";
import { projectGscPerformance, type GscPerformance } from "./gsc-performance";
import { catalogGscKeys } from "./seo-keyword-catalog";

/**
 * Projection is what keeps the cached payload under Next's 2MB data-cache
 * ceiling. Measured against the live API: a 90-day window is ~2710 KB raw, which
 * the cache silently refuses (surfacing as an unhandledRejection, not a miss),
 * and ~7 KB once projected onto the catalog's keys.
 */
const PERF: GscPerformance = {
  byPath: {
    "/barber-booth-rent-houston": { clicks: 5, impressions: 100, ctr: 0.05, position: 8 },
    "/some-page-not-in-catalog": { clicks: 99, impressions: 9999, ctr: 0.01, position: 40 },
  },
  byQuery: {
    "barber booth rental near me": { clicks: 2, impressions: 50, ctr: 0.04, position: 6 },
    "totally unrelated query": { clicks: 1, impressions: 10, ctr: 0.1, position: 30 },
  },
  window: { start: "2026-07-01", end: "2026-07-28" },
  fetchedAt: "2026-07-30T00:00:00.000Z",
};

describe("projectGscPerformance", () => {
  it("keeps requested keys and drops everything else", () => {
    const out = projectGscPerformance(PERF, {
      paths: ["/barber-booth-rent-houston"],
      queries: ["barber booth rental near me"],
    });
    expect(Object.keys(out.byPath)).toEqual(["/barber-booth-rent-houston"]);
    expect(Object.keys(out.byQuery)).toEqual(["barber booth rental near me"]);
    expect(out.byPath["/barber-booth-rent-houston"].impressions).toBe(100);
  });

  it("preserves the window and fetch time, which the banner renders", () => {
    const out = projectGscPerformance(PERF, { paths: [], queries: [] });
    expect(out.window).toEqual(PERF.window);
    expect(out.fetchedAt).toBe(PERF.fetchedAt);
  });

  it("silently omits requested keys with no data, rather than inventing zeroes", () => {
    // A page with no impressions must stay absent so the UI shows "No data"
    // instead of a real-looking position of 0.
    const out = projectGscPerformance(PERF, { paths: ["/never-ranked"], queries: [] });
    expect(out.byPath["/never-ranked"]).toBeUndefined();
    expect(Object.keys(out.byPath)).toHaveLength(0);
  });

  it("shrinks a realistic payload by orders of magnitude", () => {
    // Stand in for the live response: far more rows than the catalog needs.
    const big: GscPerformance = { ...PERF, byPath: {}, byQuery: {} };
    for (let i = 0; i < 9000; i++) {
      big.byPath[`/junk-${i}`] = { clicks: 0, impressions: 1, ctr: 0, position: 50 };
    }
    Object.assign(big.byPath, PERF.byPath);
    const out = projectGscPerformance(big, { paths: ["/barber-booth-rent-houston"], queries: [] });
    expect(Object.keys(big.byPath).length).toBeGreaterThan(9000);
    expect(Object.keys(out.byPath)).toHaveLength(1);
    expect(Buffer.byteLength(JSON.stringify(out))).toBeLessThan(2 * 1024 * 1024);
  });
});

describe("catalogGscKeys", () => {
  it("derives lookup keys from the catalog", () => {
    const keys = catalogGscKeys();
    expect(keys.paths.length).toBeGreaterThan(50);
    expect(keys.queries.length).toBeGreaterThan(300);
  });

  it("lowercases and trims queries to match how GSC rows are indexed", () => {
    const keys = catalogGscKeys();
    expect(keys.queries.every((q) => q === q.toLowerCase().trim())).toBe(true);
  });

  it("emits no duplicates, so the cache key stays stable", () => {
    const keys = catalogGscKeys();
    expect(new Set(keys.paths).size).toBe(keys.paths.length);
    expect(new Set(keys.queries).size).toBe(keys.queries.length);
  });
});
