import { describe, it, expect } from "vitest";
import { attribute, summarize, ATTRIBUTION_WINDOW_DAYS, type OutreachRecord } from "./attribution";
import type { BaselineBucket } from "./baseline";

const NOW = new Date("2026-08-20T12:00:00Z");
const DAY = 86_400_000;

const BASELINE: BaselineBucket[] = [
  { minDaysLate: 0, maxDaysLate: 7, label: "0–6 days late", reached: 687, returned: 631, returnRate: 0.918 },
  { minDaysLate: 7, maxDaysLate: 14, label: "7–13 days late", reached: 357, returned: 303, returnRate: 0.849 },
  { minDaysLate: 14, maxDaysLate: 30, label: "14–29 days late", reached: 207, returned: 155, returnRate: 0.749 },
  { minDaysLate: 30, maxDaysLate: 60, label: "30–59 days late", reached: 114, returned: 64, returnRate: 0.561 },
  { minDaysLate: 60, maxDaysLate: 120, label: "60–119 days late", reached: 78, returned: 32, returnRate: 0.41 },
  { minDaysLate: 120, maxDaysLate: null, label: "120+ days late", reached: 65, returned: 22, returnRate: 0.338 },
];

function send(over: Partial<OutreachRecord> & { daysAgo: number }): OutreachRecord {
  return {
    id: over.id ?? "o1",
    shopifyCustomerId: over.shopifyCustomerId ?? "gid://c1",
    clientName: "Test",
    sentAt: new Date(NOW.getTime() - over.daysAgo * DAY).toISOString(),
    channel: "sms",
    daysOverdue: over.daysOverdue ?? 40,
    latenessBucket: null,
    annualValue: 600,
    averageTicket: over.averageTicket ?? 50,
    costCents: over.costCents ?? 1,
    ...over,
  };
}

const visits = (customerId: string, days: string[]) => new Map([[customerId, days]]);

describe("attribute", () => {
  it("marks a client who came back inside the window as returned", () => {
    const [a] = attribute(
      [send({ daysAgo: 40, shopifyCustomerId: "c" })],
      visits("c", ["2026-07-20"]),
      BASELINE,
      NOW,
    );
    expect(a.outcome).toBe("returned");
    expect(a.returnedOn).toBe("2026-07-20");
  });

  it("counts a same-day visit — a text at 9am and a cut at 2pm is the point", () => {
    const sentAt = new Date(NOW.getTime() - 40 * DAY);
    const sameDay = sentAt.toISOString().slice(0, 10);
    const [a] = attribute([send({ daysAgo: 40, shopifyCustomerId: "c" })], visits("c", [sameDay]), BASELINE, NOW);
    expect(a.outcome).toBe("returned");
    expect(a.daysToReturn).toBe(0);
  });

  it("does not count visits from BEFORE the message", () => {
    // Otherwise every send to a regular scores instantly off their last cut.
    const [a] = attribute(
      [send({ daysAgo: 10, shopifyCustomerId: "c" })],
      visits("c", ["2026-01-01"]),
      BASELINE,
      NOW,
    );
    expect(a.outcome).toBe("pending");
    expect(a.returnedOn).toBeNull();
  });

  it("leaves a recent send PENDING rather than scoring it a failure", () => {
    // Counting yesterday's message as a non-return drags the rate down for no
    // reason — the client simply has not had time yet.
    const [a] = attribute([send({ daysAgo: 2, shopifyCustomerId: "c" })], visits("c", []), BASELINE, NOW);
    expect(a.outcome).toBe("pending");
  });

  it("scores a no-show only once the window has closed", () => {
    const [a] = attribute(
      [send({ daysAgo: ATTRIBUTION_WINDOW_DAYS + 5, shopifyCustomerId: "c" })],
      visits("c", []),
      BASELINE,
      NOW,
    );
    expect(a.outcome).toBe("no_return");
  });

  it("does not credit a visit that came long after the window", () => {
    const [a] = attribute(
      [send({ daysAgo: 200, shopifyCustomerId: "c" })],
      visits("c", ["2026-08-01"]), // ~180 days after the send
      BASELINE,
      NOW,
    );
    expect(a.outcome).toBe("no_return");
    expect(a.returnedOn).toBeNull();
  });

  it("attaches the baseline rate for how late that client was", () => {
    const [a] = attribute([send({ daysAgo: 40, daysOverdue: 45 })], new Map(), BASELINE, NOW);
    expect(a.baselineRate).toBe(0.561);
    expect(a.latenessBucket).toBe("30–59 days late");
  });
});

describe("summarize", () => {
  it("reports lift as the gap against baseline, not the raw return rate", () => {
    // THE WHOLE POINT. Ten clients at 30-59 days late, eight returned. Raw rate
    // 80% looks like a triumph; history says 56.1% of them would have come back
    // regardless, so the agent's claim is the 24 points of difference.
    const sends = Array.from({ length: 10 }, (_, i) =>
      send({ id: `o${i}`, shopifyCustomerId: `c${i}`, daysAgo: 40, daysOverdue: 45 }),
    );
    const v = new Map(sends.slice(0, 8).map((s) => [s.shopifyCustomerId, ["2026-07-20"]]));
    const s = summarize(attribute(sends, v, BASELINE, NOW));
    expect(s.observedRate).toBeCloseTo(0.8, 5);
    expect(s.expectedRate).toBeCloseTo(0.561, 3);
    expect(s.liftPoints).toBeCloseTo(23.9, 1);
    expect(s.attributableVisits).toBeCloseTo(2.4, 1);
  });

  it("can report NEGATIVE lift when contacted clients did worse than history", () => {
    // A tool that cannot show it is not working is not a measurement.
    const sends = Array.from({ length: 10 }, (_, i) =>
      send({ id: `o${i}`, shopifyCustomerId: `c${i}`, daysAgo: 40, daysOverdue: 45 }),
    );
    const v = new Map(sends.slice(0, 2).map((s) => [s.shopifyCustomerId, ["2026-07-20"]]));
    const s = summarize(attribute(sends, v, BASELINE, NOW));
    expect(s.liftPoints).toBeLessThan(0);
    expect(s.attributableVisits).toBeLessThan(0);
  });

  it("excludes pending sends from the rate entirely", () => {
    const settledSend = send({ id: "a", shopifyCustomerId: "a", daysAgo: 40, daysOverdue: 45 });
    const freshSend = send({ id: "b", shopifyCustomerId: "b", daysAgo: 1, daysOverdue: 45 });
    const s = summarize(
      attribute([settledSend, freshSend], visits("a", ["2026-07-20"]), BASELINE, NOW),
    );
    expect(s.settled).toBe(1);
    expect(s.pending).toBe(1);
    expect(s.observedRate).toBe(1);
  });

  it("flags itself as underpowered until enough sends have settled", () => {
    // The honest headline for a small sample, so a flattering number is never
    // printed without the caveat attached to it.
    const few = Array.from({ length: 5 }, (_, i) =>
      send({ id: `o${i}`, shopifyCustomerId: `c${i}`, daysAgo: 40 }),
    );
    const s = summarize(attribute(few, new Map(), BASELINE, NOW));
    expect(s.underpowered).toBe(true);
    expect(s.minimumUseful).toBeGreaterThan(5);
  });

  it("computes return on cost from attributable revenue, not gross revenue", () => {
    const sends = Array.from({ length: 10 }, (_, i) =>
      send({ id: `o${i}`, shopifyCustomerId: `c${i}`, daysAgo: 40, daysOverdue: 45, averageTicket: 50, costCents: 100 }),
    );
    const v = new Map(sends.slice(0, 8).map((s) => [s.shopifyCustomerId, ["2026-07-20"]]));
    const s = summarize(attribute(sends, v, BASELINE, NOW));
    // 2.39 attributable visits x $50 = ~$119.50 against $10 of sends
    expect(s.attributableRevenue).toBeGreaterThan(100);
    expect(s.attributableRevenue).toBeLessThan(140);
    expect(s.costDollars).toBe(10);
    expect(s.returnOnCost).toBeGreaterThan(10);
  });

  it("returns nulls rather than zeros when nothing has settled", () => {
    // Zero would read as "no impact"; null reads as "no answer yet", which is
    // the truth.
    const s = summarize(attribute([send({ daysAgo: 1 })], new Map(), BASELINE, NOW));
    expect(s.observedRate).toBeNull();
    expect(s.liftPoints).toBeNull();
    expect(s.attributableRevenue).toBeNull();
  });
});
