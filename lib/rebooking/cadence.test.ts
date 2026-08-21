import { describe, it, expect } from "vitest";
import {
  computeCadence,
  buildDueList,
  visitGaps,
  median,
  regularityScore,
  GONE_AFTER_DAYS,
  CONTACT_THRESHOLD_DAYS,
  type VisitHistory,
} from "./cadence";

const NOW = new Date("2026-08-20T12:00:00Z");

/** n visits, `every` days apart, the last one `endedDaysAgo` before NOW. */
function history(over: Partial<VisitHistory> & { every: number; n: number; endedDaysAgo: number }): VisitHistory {
  const dates: string[] = [];
  for (let i = 0; i < over.n; i++) {
    const back = over.endedDaysAgo + (over.n - 1 - i) * over.every;
    dates.push(new Date(NOW.getTime() - back * 86_400_000).toISOString());
  }
  return {
    customerId: over.customerId ?? "gid://1",
    name: over.name ?? "Test Client",
    email: over.email ?? "t@example.com",
    phone: over.phone ?? null,
    orderDates: dates,
    lifetimeRevenue: over.lifetimeRevenue ?? over.n * 50,
  };
}

describe("median", () => {
  it("takes the middle of an odd-length set", () => {
    expect(median([10, 2, 6])).toBe(6);
  });
  it("averages the two middles of an even-length set", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

describe("visitGaps", () => {
  it("collapses same-day orders into one visit", () => {
    // A cut and a tip are two Shopify orders and one trip to the chair. Counting
    // them separately injects a 0-day gap and halves the computed cadence.
    const { dayKeys, gaps } = visitGaps([
      "2026-08-01T14:00:00Z",
      "2026-08-01T14:02:00Z",
      "2026-08-15T14:00:00Z",
    ]);
    expect(dayKeys).toEqual(["2026-08-01", "2026-08-15"]);
    expect(gaps).toEqual([14]);
  });

  it("drops gaps longer than the rhythm window so one break can't skew a cadence", () => {
    const { gaps } = visitGaps([
      "2026-01-01T00:00:00Z",
      "2026-01-15T00:00:00Z",
      "2026-07-01T00:00:00Z", // ~5.5 month break
      "2026-07-15T00:00:00Z",
    ]);
    expect(gaps).toEqual([14, 14]);
  });
});

describe("regularityScore", () => {
  it("scores a perfectly steady client at 1", () => {
    expect(regularityScore([14, 14, 14, 14])).toBe(1);
  });

  it("is not wrecked by a single outlier", () => {
    // The reason this uses MAD and not standard deviation: one holiday should
    // not reclassify a reliable client as erratic.
    expect(regularityScore([14, 14, 14, 14, 60])).toBeGreaterThan(0.9);
  });
});

describe("computeCadence", () => {
  it("returns null when there is not enough history to claim a rhythm", () => {
    expect(computeCadence(history({ every: 14, n: 3, endedDaysAgo: 5 }), NOW)).toBeNull();
  });

  it("finds a fortnightly rhythm and reports someone on time as upcoming", () => {
    const c = computeCadence(history({ every: 14, n: 8, endedDaysAgo: 12 }), NOW)!;
    expect(c.cadenceDays).toBe(14);
    expect(c.visits).toBe(8);
    expect(c.status).toBe("upcoming");
    expect(c.daysOverdue).toBeLessThan(0);
  });

  it("marks someone past their own interval as due", () => {
    const c = computeCadence(history({ every: 14, n: 8, endedDaysAgo: 17 }), NOW)!;
    expect(c.status).toBe("due");
    expect(c.daysOverdue).toBe(3);
  });

  it("escalates to at_risk once someone is far past their rhythm", () => {
    // The Justin Avery case: an 8.8-day client 84 days gone is not "a bit late",
    // and the queue must not show him with the same urgency as a 3-day slip.
    const c = computeCadence(history({ every: 9, n: 10, endedDaysAgo: 84 }), NOW)!;
    expect(c.status).toBe("at_risk");
  });

  it("values the relationship per year at their own rhythm, not per visit", () => {
    const c = computeCadence(
      history({ every: 10, n: 10, endedDaysAgo: 5, lifetimeRevenue: 500 }),
      NOW,
    )!;
    expect(c.averageTicket).toBe(50);
    expect(c.annualValue).toBeCloseTo(50 * 36.5, 0);
  });

  it("uses recent gaps, so a client who slowed down is judged on who they are now", () => {
    const dates = [
      // long-ago weekly stretch
      "2025-01-01", "2025-01-08", "2025-01-15", "2025-01-22", "2025-01-29",
      // recent monthly stretch
      "2026-04-20", "2026-05-20", "2026-06-19", "2026-07-19", "2026-08-18",
    ].map((d) => `${d}T12:00:00Z`);
    const c = computeCadence(
      { customerId: "g", name: "Slowed Down", email: null, phone: null, orderDates: dates, lifetimeRevenue: 500 },
      NOW,
    )!;
    expect(c.cadenceDays).toBeGreaterThan(25);
  });
});

describe("buildDueList", () => {
  it("excludes people who have stopped coming rather than run late", () => {
    const gone = history({ every: 14, n: 8, endedDaysAgo: GONE_AFTER_DAYS + 30, customerId: "gone" });
    const due = history({ every: 14, n: 8, endedDaysAgo: 35, customerId: "due" });
    const ids = buildDueList([gone, due], NOW).map((c) => c.customerId);
    expect(ids).toEqual(["due"]);
  });

  it("excludes anyone not yet near their next visit", () => {
    const fresh = history({ every: 30, n: 8, endedDaysAgo: 2 });
    expect(buildDueList([fresh], NOW)).toHaveLength(0);
  });

  it("does NOT surface someone who is barely late, because they come back anyway", () => {
    // Four years of this shop's history: 91.8% of clients 0-6 days late return
    // with no message at all, and 84.9% at 7-13 days. Chasing them spends a
    // message on a decision the client had already made. CONTACT_THRESHOLD_DAYS
    // is where the natural return rate first drops enough to be worth a text.
    expect(buildDueList([history({ every: 14, n: 8, endedDaysAgo: 12 })], NOW)).toHaveLength(0);
    expect(buildDueList([history({ every: 14, n: 8, endedDaysAgo: 20 })], NOW)).toHaveLength(0);
    expect(buildDueList([history({ every: 14, n: 8, endedDaysAgo: 28 })], NOW)).toHaveLength(1);
  });

  it("starts exactly at the threshold, not a day either side", () => {
    const justUnder = history({ every: 14, n: 8, endedDaysAgo: 14 + CONTACT_THRESHOLD_DAYS - 1 });
    const exactly = history({ every: 14, n: 8, endedDaysAgo: 14 + CONTACT_THRESHOLD_DAYS });
    expect(buildDueList([justUnder], NOW)).toHaveLength(0);
    expect(buildDueList([exactly], NOW)).toHaveLength(1);
  });

  it("ranks a valuable client's lateness above a cheap client's identical lateness", () => {
    // Sorting purely by days-overdue buries the client who actually matters.
    const valuable = history({ every: 10, n: 10, endedDaysAgo: 30, lifetimeRevenue: 1000, customerId: "valuable" });
    const cheap = history({ every: 10, n: 10, endedDaysAgo: 30, lifetimeRevenue: 100, customerId: "cheap" });
    const ids = buildDueList([cheap, valuable], NOW).map((c) => c.customerId);
    expect(ids[0]).toBe("valuable");
  });
});

describe("cadence override", () => {
  it("uses the barber's number instead of the computed one", () => {
    // The maths says 14 days; the barber knows he's stretching to 30 now.
    const h = { ...history({ every: 14, n: 8, endedDaysAgo: 20 }), cadenceOverrideDays: 30 };
    const c = computeCadence(h, NOW)!;
    expect(c.cadenceDays).toBe(30);
    expect(c.daysOverdue).toBe(-10);
    expect(c.status).toBe("upcoming");
  });

  it("changes who lands in the due list, not just the number displayed", () => {
    // The override has to be applied before the due list is built. Applied
    // after, this client would be shown on a 40-day rhythm but filtered on a
    // 14-day one.
    const base = history({ every: 14, n: 8, endedDaysAgo: 35 });
    expect(buildDueList([base], NOW)).toHaveLength(1); // 21 days late on the computed rhythm
    const overridden = { ...base, cadenceOverrideDays: 40 };
    expect(buildDueList([overridden], NOW)).toHaveLength(0); // not due at all on the real one
  });

  it("ignores a zero or negative override rather than dividing by it", () => {
    const h = { ...history({ every: 14, n: 8, endedDaysAgo: 20 }), cadenceOverrideDays: 0 };
    expect(computeCadence(h, NOW)!.cadenceDays).toBe(14);
  });
});
