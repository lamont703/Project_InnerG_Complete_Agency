import { describe, it, expect } from "vitest";
import { buildReport } from "@/lib/credit-report/model";
import { MOCK_TRADELINES } from "@/lib/credit-report/mock";

/**
 * The public sample must be produced by the real scorer.
 *
 * A marketing page showing a number the product could never produce is the
 * quiet kind of dishonesty — nobody notices until an owner enrols, sees a
 * different shape of report, and stops trusting the rest of the page.
 */
describe("the sample report on the landing page", () => {
  it("is computed by buildReport, not hardcoded", () => {
    const r = buildReport(MOCK_TRADELINES);
    expect(r.score).not.toBeNull();
    expect(r.score!).toBeGreaterThan(0);
    expect(r.score!).toBeLessThanOrEqual(100);
  });

  it("shows a record with imperfections in it", () => {
    // A flawless sample would set an expectation the product cannot meet and
    // would duck the question every owner actually has, which is what a rough
    // patch looks like.
    const r = buildReport(MOCK_TRADELINES);
    expect(r.lateCount + r.missedCount).toBeGreaterThan(0);
    expect(r.weeksExcused).toBeGreaterThan(0);
  });
});
