import { describe, it, expect } from "vitest";
import {
  buildHolidayPlan, mergeSpecialHours, usualHoursFor, formatTime, parseTime,
  type SpecialHourPeriod, type RegularPeriod,
} from "./gbp-special-hours";
import { holidaysForYear } from "./us-holidays";

const xmas = holidaysForYear(2026).find((h) => h.id === "christmas-day-2026")!;   // Friday
const thanksgiving = holidaysForYear(2026).find((h) => h.id === "thanksgiving-2026")!;

const REGULAR: RegularPeriod[] = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY"].map((d) => ({
  openDay: d, openTime: { hours: 12 }, closeDay: d, closeTime: { hours: 20 },
}));

describe("usualHoursFor", () => {
  it("finds the usual hours for the weekday a holiday falls on", () => {
    expect(usualHoursFor(xmas, REGULAR)).toEqual({ openTime: { hours: 12 }, closeTime: { hours: 20 } });
  });

  it("returns null when the shop is normally shut that weekday", () => {
    // Thanksgiving 2026 is a Thursday, but with no Thursday period there's
    // nothing to suggest — better than inventing hours.
    const noThursday = REGULAR.filter((p) => p.openDay !== "THURSDAY");
    expect(usualHoursFor(thanksgiving, noThursday)).toBeNull();
  });
});

describe("buildHolidayPlan", () => {
  it("marks a holiday with no entry as unset", () => {
    const plan = buildHolidayPlan([xmas], [], REGULAR);
    expect(plan[0].mode).toBe("unset");
    expect(plan[0].suggested).toEqual({ openTime: { hours: 12 }, closeTime: { hours: 20 } });
  });

  it("reads an existing closure", () => {
    const existing: SpecialHourPeriod[] = [{ startDate: { year: 2026, month: 12, day: 25 }, closed: true }];
    expect(buildHolidayPlan([xmas], existing, REGULAR)[0].mode).toBe("closed");
  });

  it("reads existing special hours", () => {
    const existing: SpecialHourPeriod[] = [{
      startDate: { year: 2026, month: 12, day: 25 },
      openTime: { hours: 10 }, closeTime: { hours: 14 }, closed: false,
    }];
    const plan = buildHolidayPlan([xmas], existing, REGULAR);
    expect(plan[0].mode).toBe("hours");
    expect(plan[0].openTime).toEqual({ hours: 10 });
  });
});

describe("mergeSpecialHours — must not disturb dates nobody decided on", () => {
  const other: SpecialHourPeriod = { startDate: { year: 2026, month: 7, day: 4 }, closed: true };

  it("keeps periods for other dates", () => {
    const out = mergeSpecialHours([other], [{ date: "2026-12-25", mode: "closed" }]);
    expect(out).toHaveLength(2);
    expect(out.some((p) => p.startDate.month === 7)).toBe(true);
  });

  it("keeps past holidays rather than tidying them away", () => {
    // They're the owner's record of last year. Deleting data because we think
    // it's stale isn't ours to do.
    const past: SpecialHourPeriod = { startDate: { year: 2024, month: 12, day: 25 }, closed: true };
    const out = mergeSpecialHours([past], [{ date: "2026-12-25", mode: "closed" }]);
    expect(out.some((p) => p.startDate.year === 2024)).toBe(true);
  });

  it("replaces rather than duplicates an existing decision", () => {
    const existing: SpecialHourPeriod[] = [{ startDate: { year: 2026, month: 12, day: 25 }, closed: true }];
    const out = mergeSpecialHours(existing, [
      { date: "2026-12-25", mode: "hours", openTime: { hours: 10 }, closeTime: { hours: 14 } },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].closed).toBe(false);
    expect(out[0].openTime).toEqual({ hours: 10 });
  });

  it("clears a date without adding anything back", () => {
    const existing: SpecialHourPeriod[] = [{ startDate: { year: 2026, month: 12, day: 25 }, closed: true }];
    expect(mergeSpecialHours(existing, [{ date: "2026-12-25", mode: "clear" }])).toEqual([]);
  });

  it("ignores an hours decision missing an end, rather than writing half a statement", () => {
    const out = mergeSpecialHours([], [{ date: "2026-12-25", mode: "hours", openTime: { hours: 10 } }]);
    expect(out).toEqual([]);
  });

  it("sets endDate equal to startDate so a holiday is a single day", () => {
    const out = mergeSpecialHours([], [{ date: "2026-12-25", mode: "closed" }]);
    expect(out[0].endDate).toEqual(out[0].startDate);
  });

  it("returns periods in date order", () => {
    const out = mergeSpecialHours([], [
      { date: "2026-12-25", mode: "closed" },
      { date: "2026-07-04", mode: "closed" },
    ]);
    expect(out.map((p) => p.startDate.month)).toEqual([7, 12]);
  });
});

describe("time formatting", () => {
  it("round-trips Google's shape", () => {
    expect(formatTime({ hours: 9, minutes: 30 })).toBe("09:30");
    expect(formatTime({ hours: 12 })).toBe("12:00");
    expect(parseTime("09:30")).toEqual({ hours: 9, minutes: 30 });
  });

  it("omits zero minutes, as Google does", () => {
    expect(parseTime("12:00")).toEqual({ hours: 12 });
  });

  it("rejects nonsense instead of coercing it", () => {
    for (const bad of ["", "25:00", "12:99", "noon", "12"]) expect(parseTime(bad), bad).toBeUndefined();
  });
});
