import { describe, it, expect } from "vitest";
import { bucketOf, PLATFORM_LABELS } from "./content-insights";

describe("bucketOf", () => {
  it("keeps the day as-is day to day", () => {
    expect(bucketOf("2026-08-19", "day")).toBe("2026-08-19");
  });

  /*
   * Weeks start MONDAY. A locale-dependent week start would silently regroup
   * every point when the server's locale changed, moving a spike from one
   * bucket to another with nothing in the data having changed.
   */
  it("snaps a week to the Monday that starts it", () => {
    expect(bucketOf("2026-08-19", "week")).toBe("2026-08-17"); // Wed -> Mon
    expect(bucketOf("2026-08-17", "week")).toBe("2026-08-17"); // Mon -> itself
    expect(bucketOf("2026-08-23", "week")).toBe("2026-08-17"); // Sun -> same Mon
  });

  it("does not let Sunday start its own week", () => {
    // The off-by-one that a plain getUTCDay() would produce: Sunday is 0, so an
    // unadjusted subtraction moves it FORWARD into the following week.
    expect(bucketOf("2026-08-23", "week") < "2026-08-23").toBe(true);
  });

  it("snaps a month to the first", () => {
    expect(bucketOf("2026-08-19", "month")).toBe("2026-08-01");
    expect(bucketOf("2026-12-31", "month")).toBe("2026-12-01");
  });

  it("crosses a month boundary within one week", () => {
    // 2026-09-01 is a Tuesday; its week starts in August.
    expect(bucketOf("2026-09-01", "week")).toBe("2026-08-31");
  });
});

describe("platform labels", () => {
  it("names every platform the collector can write", () => {
    for (const p of ["youtube", "instagram", "gbp", "google", "linkedin", "tiktok_ghl", "x"])
      expect(PLATFORM_LABELS[p as keyof typeof PLATFORM_LABELS]).toBeTruthy();
  });
});
