import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildBundle, type GbpAuditRaw } from "./gbp-audit-fetch";

/**
 * THE BUG THIS EXISTS FOR, because a unit test could not have caught it and a
 * structural one can.
 *
 * `buildGbpAudit` used to run INSIDE the function wrapped by unstable_cache, so
 * the cached value contained the rendered report — findings, counts, scores.
 * The key held no code version, so a deploy changed nothing an owner could see
 * for up to six hours. It shipped exactly that way: the new footer appeared
 * (built outside the cache, fresh every call) while the findings beside it were
 * whatever the previous deployment had computed, including a phone line that
 * another test had supposedly made impossible to return.
 *
 * Every test in this file asserts a property of the SHAPE rather than of one
 * report, because the failure was never in the scoring — it was in what got
 * stored.
 */

const RAW: GbpAuditRaw = {
  business: { name: "Test Barbershop", location: "locations/1", category: "Barber shop", city: "Atlanta" },
  auditInput: {
    location: { title: "Test Barbershop", phoneNumbers: { primaryPhone: "(404) 555-0101" } },
    attributesSet: [],
    attributesAvailable: [],
    photos: { count: 80, byCategory: { COVER: 2, ADDITIONAL: 78 } },
    reviews: { total: 35, average: 5, sampled: 10, unanswered: 0 },
    posts: { count: 1, latestIso: new Date().toISOString() },
    performance: { impressions: 132, callClicks: 1, websiteClicks: 2, directionRequests: 61, days: 30 },
    searchKeywords: [],
    googleUpdated: { diffMask: "phoneNumbers", diffs: [{ field: "phoneNumbers", ours: "(404) 555-0101", google: null }] },
    verification: { hasVoiceOfMerchant: true, hasBusinessAuthority: true },
    placeActions: [],
  } as any,
  performance: { impressions: 132, calls: 1, website: 2, directions: 61 },
  keywords: [],
  fetchedAt: new Date().toISOString(),
};

describe("what goes in the cache", () => {
  it("keeps the rendered report OUT of the cached shape", () => {
    // GbpAuditRaw is what unstable_cache stores. If a `report` ever appears on
    // it, scoring is being frozen at fetch time again and a deploy stops
    // changing what owners read.
    expect(Object.keys(RAW)).not.toContain("report");
    expect(Object.keys(RAW)).not.toContain("keywordSplit");
  });

  it("scores from the raw material, so a wording change needs no invalidation", () => {
    const bundle = buildBundle(RAW);
    expect(bundle.report.checks.length).toBeGreaterThan(0);
    expect(bundle.report.score).toBeGreaterThan(0);
  });

  it("builds a fresh report every call rather than reusing one", () => {
    // Two calls on the same raw input must produce equal but distinct objects;
    // a shared reference would mean something is being held between reads.
    const a = buildBundle(RAW);
    const b = buildBundle(RAW);
    expect(a.report).toEqual(b.report);
    expect(a.report).not.toBe(b.report);
  });

  it("carries the fetch time through as generatedAt, not the render time", () => {
    // The age shown to an owner has to describe when GOOGLE was asked, not when
    // the text was assembled — otherwise a six-hour-old bundle reports as new.
    const bundle = buildBundle(RAW);
    expect(bundle.generatedAt).toBe(RAW.fetchedAt);
  });
});

describe("the cache key", () => {
  // Read from the project root: vitest's import.meta.url is not a file: URL
  // under the jsdom environment this suite runs in.
  const src = readFileSync(path.resolve(process.cwd(), "lib/gbp-audit-fetch.ts"), "utf8");

  it("includes the deployment, so shipping code cannot serve the last deploy's output", () => {
    expect(src).toContain("VERCEL_DEPLOYMENT_ID");
    expect(src).toMatch(/\["gbp-audit", build, memberId, locationName\]/);
  });

  it("caches the raw fetch and not the finished bundle", () => {
    // The wrapped call must be the raw fetch. If this ever reads
    // fetchGbpAudit( — the composed one — the report is back inside the cache.
    const cached = src.slice(src.indexOf("unstable_cache("), src.indexOf("{ revalidate: 21600"));
    expect(cached).toContain("fetchGbpAuditRaw(");
    expect(cached).not.toContain("buildBundle(");
  });
});
