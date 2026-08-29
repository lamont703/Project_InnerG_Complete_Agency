import { describe, it, expect } from "vitest";
import { buildReport, bandFor, MIN_WEEKS_TO_SCORE, type Tradeline, type PaymentWeek, type PaymentStatus } from "./model";
import { MOCK_TRADELINES } from "./mock";

/**
 * A CONTINUOUS timeline built from segments.
 *
 * An earlier version restarted the calendar on every call, so segments meant to
 * run one after another shared dates and the recency sort interleaved them.
 * That failed the streak test and looked like a model bug; it was the fixture.
 * Anything ordered by date has to be built along one clock.
 */
function timeline(
  ...segments: Array<[count: number, status?: PaymentStatus, daysLate?: number | null]>
): PaymentWeek[] {
  const d = new Date("2026-01-05T00:00:00Z");
  const out: PaymentWeek[] = [];
  for (const [count, status = "on_time", daysLate = null] of segments) {
    for (let i = 0; i < count; i++) {
      out.push({ weekStart: d.toISOString().slice(0, 10), status, daysLate, amount: 175, note: null });
      d.setUTCDate(d.getUTCDate() + 7);
    }
  }
  return out;
}

const weeks = (count: number, status: PaymentStatus = "on_time", daysLate: number | null = null) =>
  timeline([count, status, daysLate]);

const line = (shop: string, w: PaymentWeek[]): Tradeline => ({
  shopName: shop, shopSlug: null, city: "Houston, TX", rentPerWeek: 175,
  dueDay: "Monday", startedAt: w[0]?.weekStart ?? "2026-01-05", endedAt: null, weeks: w,
});

describe("excused weeks", () => {
  it("leave the denominator entirely", () => {
    // A barber off sick owes nobody anything. Counting those weeks as unpaid
    // would be false, and would mark somebody down for being ill.
    const withLeave = buildReport([line("A", timeline([20], [6, "excused"]))]);
    const without = buildReport([line("A", weeks(20))]);
    expect(withLeave.weeksCounted).toBe(20);
    expect(withLeave.weeksExcused).toBe(6);
    expect(withLeave.factors.find((f) => f.key === "onTime")!.earned)
      .toBe(without.factors.find((f) => f.key === "onTime")!.earned);
  });

  it("do not count toward the length of the record either", () => {
    // Otherwise a long absence would look like a long history.
    const r = buildReport([line("A", timeline([10], [40, "excused"]))]);
    expect(r.weeksCounted).toBe(10);
  });
});

describe("catching up", () => {
  it("earns most of the credit, not none", () => {
    // Paying double the next Monday is how this trade absorbs a slow week.
    // Scoring it as a miss would mark down the ordinary recovery.
    const caught = buildReport([line("A", timeline([20], [4, "caught_up", 7]))]);
    const missed = buildReport([line("A", timeline([20], [4, "missed"]))]);
    expect(caught.score!).toBeGreaterThan(missed.score!);
    expect(caught.caughtUpCount).toBe(4);
  });
});

describe("lateness is measured against the weekly cycle", () => {
  it("treats a few days differently from most of a week", () => {
    // Six days late on a monthly bill is a slip. On a weekly one the next
    // payment is already due.
    const slightly = buildReport([line("A", timeline([20], [6, "late", 2]))]);
    const nearlyAWeek = buildReport([line("A", timeline([20], [6, "late", 6]))]);
    expect(slightly.score!).toBeGreaterThan(nearlyAWeek.score!);
  });
});

describe("scoring thresholds", () => {
  it("refuses to score a file too thin to mean anything", () => {
    const r = buildReport([line("A", weeks(MIN_WEEKS_TO_SCORE - 1))]);
    expect(r.score).toBeNull();
    expect(r.band.key).toBe("none");
    expect(r.band.meaning.toLowerCase()).not.toContain("risk");
  });

  it("scores in eight weeks, not eight months", () => {
    // The whole advantage of a weekly cycle: a record worth reading arrives in
    // a season rather than a year.
    const r = buildReport([line("A", weeks(MIN_WEEKS_TO_SCORE))]);
    expect(r.score).not.toBeNull();
  });
});

describe("confidence", () => {
  it("is separate from the score", () => {
    const thin = buildReport([line("A", weeks(10))]);
    const strong = buildReport([line("A", weeks(80)), line("B", weeks(40))]);
    expect(thin.factors.find((f) => f.key === "onTime")!.earned).toBe(1);
    expect(strong.factors.find((f) => f.key === "onTime")!.earned).toBe(1);
    expect(thin.confidence).toBe("thin");
    expect(strong.confidence).toBe("strong");
  });

  it("does not penalise a barber for staying at one shop", () => {
    // Two years, one shop, every week paid. An earlier version docked this for
    // lacking a second source, which punishes loyalty.
    const loyal = buildReport([line("A", weeks(104))]);
    expect(loyal.score).toBe(100);
    expect(loyal.confidence).not.toBe("strong");
  });
});

describe("streaks", () => {
  it("counts the current run of clean weeks, which is the number barbers quote", () => {
    const r = buildReport([line("A", timeline([10], [1, "late", 3], [12]))]);
    expect(r.currentStreak).toBe(12);
    expect(r.longestStreak).toBe(12);
  });
});

describe("the mock", () => {
  it("carries every shape a shop owner has to interpret", () => {
    const r = buildReport(MOCK_TRADELINES);
    expect(r.onTimeCount).toBeGreaterThan(0);
    expect(r.lateCount).toBeGreaterThan(0);
    expect(r.caughtUpCount).toBeGreaterThan(0);
    expect(r.missedCount).toBeGreaterThan(0);
    expect(r.weeksExcused).toBeGreaterThan(0);
  });

  it("discloses every factor, and they sum to the whole score", () => {
    const r = buildReport(MOCK_TRADELINES);
    expect(r.factors.reduce((s, f) => s + f.weight, 0)).toBeCloseTo(1, 5);
  });
});

describe("bands", () => {
  it("never describes an absent score as a bad one", () => {
    expect(bandFor(null).key).toBe("none");
    expect(bandFor(40).key).toBe("limited");
    expect(bandFor(90).key).toBe("established");
    for (const s of [null, 0, 49, 50, 69, 70, 84, 85, 100]) {
      expect(bandFor(s).guidance.length).toBeGreaterThan(20);
    }
  });
});
