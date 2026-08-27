import { describe, it, expect } from "vitest";
import { buildReport, bandFor, MIN_MONTHS_TO_SCORE, type Tradeline } from "./model";
import { MOCK_TRADELINES } from "./mock";

const line = (shop: string, monthsOnTime: number): Tradeline => ({
  shopName: shop, shopSlug: null, city: "Houston, TX", rentPerWeek: 150,
  startedAt: "2026-01", endedAt: null,
  months: Array.from({ length: monthsOnTime }, (_, i) => ({
    month: `2026-${String(i + 1).padStart(2, "0")}`, status: "on_time" as const, daysLate: null, amount: 600,
  })),
});

describe("buildReport", () => {
  it("refuses to score a file too thin to mean anything", () => {
    const r = buildReport([line("A", MIN_MONTHS_TO_SCORE - 1)]);
    expect(r.score).toBeNull();
    expect(r.band.key).toBe("none");
    // The wording matters as much as the null: "no score" must not read as bad.
    expect(r.band.meaning.toLowerCase()).not.toContain("risk");
  });

  it("separates confidence from score", () => {
    // Both are flawless. Only one is evidence.
    const thin = buildReport([line("A", 4)]);
    const strong = buildReport([line("A", 12), line("B", 12)]);
    expect(thin.factors.find((f) => f.key === "onTime")!.earned).toBe(1);
    expect(strong.factors.find((f) => f.key === "onTime")!.earned).toBe(1);
    expect(thin.confidence).toBe("thin");
    expect(strong.confidence).toBe("strong");
    expect(strong.score!).toBeGreaterThan(thin.score!);
  });

  it("does not penalise a barber for staying at one shop", () => {
    // Three years, one shop, every week paid. That is what a good tenant looks
    // like, and an earlier version docked it 15% for lacking a second source.
    // The single-source caveat belongs to confidence, not to the score.
    const loyal = buildReport([line("A", 36)]);
    expect(loyal.score).toBe(100);
    expect(loyal.confidence).not.toBe("strong");
    expect(loyal.shopCount).toBe(1);
  });

  it("weights recent behaviour over old", () => {
    const older = MOCK_TRADELINES;
    const r = buildReport(older);
    const recency = r.factors.find((f) => f.key === "recency")!;
    // The mock's late months are all more than six months back.
    expect(recency.earned).toBe(1);
    expect(r.latePayments).toBe(3);
  });

  it("every factor is disclosed, and they sum to the whole score", () => {
    const r = buildReport(MOCK_TRADELINES);
    expect(r.factors.length).toBeGreaterThan(0);
    const total = r.factors.reduce((s, f) => s + f.weight, 0);
    expect(total).toBeCloseTo(1, 5);
  });
});

describe("bands", () => {
  it("never describes an absent score as a bad one", () => {
    for (const s of [null, 0, 49, 50, 69, 70, 84, 85, 100]) {
      const b = bandFor(s);
      expect(b.guidance.length).toBeGreaterThan(20);
    }
    expect(bandFor(null).key).toBe("none");
    expect(bandFor(40).key).toBe("limited");
    expect(bandFor(90).key).toBe("established");
  });
});
