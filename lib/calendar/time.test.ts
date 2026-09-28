import { describe, it, expect } from "vitest";
import { zonedToUtc, localDateKey, weekdayOfKey, addDaysToKey, parseClock, formatLocal, zonedParts, isValidTimeZone } from "./time";

const TZ = "America/Chicago";

describe("wall clock to instant", () => {
  it("uses the right offset on each side of daylight saving", () => {
    // 2026: DST starts Mar 8, ends Nov 1 in the US.
    expect(zonedToUtc(2026, 3, 7, 9 * 60, TZ).toISOString()).toBe("2026-03-07T15:00:00.000Z"); // CST, -6
    expect(zonedToUtc(2026, 3, 9, 9 * 60, TZ).toISOString()).toBe("2026-03-09T14:00:00.000Z"); // CDT, -5
    expect(zonedToUtc(2026, 10, 31, 9 * 60, TZ).toISOString()).toBe("2026-10-31T14:00:00.000Z"); // CDT
    expect(zonedToUtc(2026, 11, 2, 9 * 60, TZ).toISOString()).toBe("2026-11-02T15:00:00.000Z"); // CST
  });

  it("is right on the transition days themselves", () => {
    expect(zonedToUtc(2026, 3, 8, 9 * 60, TZ).toISOString()).toBe("2026-03-08T14:00:00.000Z");
    expect(zonedToUtc(2026, 11, 1, 9 * 60, TZ).toISOString()).toBe("2026-11-01T15:00:00.000Z");
  });

  it("round-trips through the zone's own clock", () => {
    const d = zonedToUtc(2026, 9, 30, 15 * 60 + 30, TZ);
    const z = zonedParts(d, TZ);
    expect([z.hour, z.minute, z.day]).toEqual([15, 30, 30]);
    expect(formatLocal(d, TZ)).toBe("Wed Sep 30, 3:30pm");
  });

  it("keys a late-evening UTC instant to the local date", () => {
    // 11pm in Chicago on Sep 30 is already Oct 1 in UTC.
    expect(localDateKey(new Date("2026-10-01T04:00:00Z"), TZ)).toBe("2026-09-30");
  });
});

describe("dates and clocks", () => {
  it("knows the weekday of a date and walks across month ends", () => {
    expect(weekdayOfKey("2026-09-28")).toBe(1); // Monday
    expect(addDaysToKey("2026-09-30", 1)).toBe("2026-10-01");
  });

  it("parses the ways people write times, and refuses a bare hour", () => {
    expect(parseClock("9am")).toBe(540);
    expect(parseClock("5:30 pm")).toBe(1050);
    expect(parseClock("12pm")).toBe(720);
    expect(parseClock("12am")).toBe(0);
    expect(parseClock("17:30")).toBe(1050);
    expect(parseClock("9")).toBeNull();
    expect(parseClock("25:00")).toBeNull();
  });

  it("validates time zone names", () => {
    expect(isValidTimeZone("America/Chicago")).toBe(true);
    expect(isValidTimeZone("Central")).toBe(false);
  });
});
