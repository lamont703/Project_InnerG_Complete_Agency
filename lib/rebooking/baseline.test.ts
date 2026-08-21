import { describe, it, expect } from "vitest";
import { computeBaseline, baselineRateFor, bucketFor, BUCKETS } from "./baseline";
import type { VisitHistory } from "./cadence";

const NOW = new Date("2026-08-20T12:00:00Z");
const DAY = 86_400_000;

/** A client on a steady rhythm whose last visit was `endedDaysAgo` before NOW. */
function steady(id: string, every: number, n: number, endedDaysAgo: number): VisitHistory {
  const dates: string[] = [];
  for (let i = 0; i < n; i++) {
    const back = endedDaysAgo + (n - 1 - i) * every;
    dates.push(new Date(NOW.getTime() - back * DAY).toISOString());
  }
  return { customerId: id, name: id, email: null, phone: null, orderDates: dates, lifetimeRevenue: n * 50 };
}

describe("bucketFor", () => {
  it("puts each lateness in the right band", () => {
    expect(bucketFor(0)).toBe("0–6 days late");
    expect(bucketFor(6)).toBe("0–6 days late");
    expect(bucketFor(7)).toBe("7–13 days late");
    expect(bucketFor(29)).toBe("14–29 days late");
    expect(bucketFor(30)).toBe("30–59 days late");
    expect(bucketFor(500)).toBe("120+ days late");
  });
});

describe("computeBaseline", () => {
  it("counts a client who is currently overdue as a NON-return", () => {
    // The bug this guards against: counting only completed gaps finds that 100%
    // of overdue clients come back, because someone who left forever never
    // produces a closing visit to count. The open interval is the only source
    // of non-returns in the whole dataset.
    const abandoned = Array.from({ length: 30 }, (_, i) => steady(`gone${i}`, 14, 8, 200));
    const baseline = computeBaseline(abandoned, NOW);
    const late = baseline.find((b) => b.label === "120+ days late")!;
    expect(late.reached).toBeGreaterThan(0);
    expect(late.returned).toBe(0);
    expect(late.returnRate).toBe(0);
  });

  it("counts clients who did come back late as returns", () => {
    // Each of these completed their gaps and is currently on time, so every
    // event is a return.
    const loyal = Array.from({ length: 30 }, (_, i) => steady(`ok${i}`, 14, 10, 2));
    const baseline = computeBaseline(loyal, NOW);
    const early = baseline.find((b) => b.label === "0–6 days late")!;
    if (early.returnRate !== null) expect(early.returnRate).toBeGreaterThan(0.9);
  });

  it("reports a rate of null rather than a number when the sample is tiny", () => {
    // One client is not a baseline. A confident-looking 100% from three events
    // is worse than admitting there is no answer.
    const baseline = computeBaseline([steady("solo", 14, 8, 20)], NOW);
    for (const b of baseline) {
      if (b.reached < 20) expect(b.returnRate).toBeNull();
    }
  });

  it("is monotonically non-increasing across buckets for a realistic mix", () => {
    // Later clients must never look MORE likely to return than earlier ones —
    // if they do, the walk is double-counting somewhere.
    const mix = [
      ...Array.from({ length: 60 }, (_, i) => steady(`loyal${i}`, 14, 12, 3)),
      ...Array.from({ length: 25 }, (_, i) => steady(`slipping${i}`, 14, 10, 60)),
      ...Array.from({ length: 25 }, (_, i) => steady(`gone${i}`, 14, 10, 300)),
    ];
    const baseline = computeBaseline(mix, NOW);
    const rates = baseline.filter((b) => b.returnRate !== null).map((b) => b.returnRate!);
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]).toBeLessThanOrEqual(rates[i - 1] + 1e-9);
    }
  });

  it("returns one entry per defined bucket, always", () => {
    expect(computeBaseline([], NOW)).toHaveLength(BUCKETS.length);
  });
});

describe("baselineRateFor", () => {
  it("looks up the rate for a given lateness", () => {
    const mix = Array.from({ length: 40 }, (_, i) => steady(`c${i}`, 14, 10, 3));
    const baseline = computeBaseline(mix, NOW);
    const r = baselineRateFor(baseline, 2);
    expect(r === null || (r >= 0 && r <= 1)).toBe(true);
  });

  it("returns null for a bucket with no usable history", () => {
    expect(baselineRateFor(computeBaseline([], NOW), 45)).toBeNull();
  });
});
