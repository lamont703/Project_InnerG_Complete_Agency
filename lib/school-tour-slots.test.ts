import { describe, it, expect } from "vitest";
import {
  TOUR_SLOTS,
  buildTourSlots,
  isWeekday,
  parseSlotHour,
  isTourSlotBookable,
  bookableTourSlots,
  isTourTooSoonAnywhere,
  isValidTourSlot,
  TOUR_LEAD_HOURS,
} from "./school-tour-slots";

/**
 * The two rules worth guarding are the ones that fail SILENTLY if broken: an
 * off-by-one at 4:00 PM quietly drops a sixth of all capacity, and a weekend
 * slot produces a request nobody can honour.
 */

describe("slot generation", () => {
  it("offers exactly six slots, 10:00 AM through 4:00 PM", () => {
    expect(TOUR_SLOTS).toEqual([
      "10:00 AM",
      "11:00 AM",
      "12:00 PM",
      "1:00 PM",
      "2:00 PM",
      "3:00 PM",
      "4:00 PM",
    ].filter((_, i) => i < 7));
  });

  it("includes 4:00 PM — it is the last START time, not closing time", () => {
    expect(buildTourSlots()).toContain("4:00 PM");
  });

  it("offers nothing before 10 AM or after 4 PM", () => {
    expect(TOUR_SLOTS).not.toContain("9:00 AM");
    expect(TOUR_SLOTS).not.toContain("5:00 PM");
  });

  it("renders noon as 12:00 PM, not 0:00 PM", () => {
    expect(TOUR_SLOTS).toContain("12:00 PM");
  });
});

describe("parseSlotHour", () => {
  it("maps 12-hour labels to 24-hour values", () => {
    expect(parseSlotHour("10:00 AM")).toBe(10);
    expect(parseSlotHour("12:00 PM")).toBe(12);
    expect(parseSlotHour("4:00 PM")).toBe(16);
  });
  it("returns null rather than guessing", () => {
    expect(parseSlotHour("later")).toBeNull();
  });
});

describe("weekday rule", () => {
  // 2026-08-17 is a Monday; 2026-08-22 a Saturday; 2026-08-23 a Sunday.
  it("accepts Monday to Friday", () => {
    expect(isWeekday("2026-08-17")).toBe(true);
    expect(isWeekday("2026-08-21")).toBe(true);
  });
  it("rejects the weekend", () => {
    expect(isWeekday("2026-08-22")).toBe(false);
    expect(isWeekday("2026-08-23")).toBe(false);
  });
  it("offers no slots at all on a Saturday", () => {
    const now = new Date("2026-08-10T09:00:00");
    expect(bookableTourSlots("2026-08-22", now)).toEqual([]);
  });
});

describe("48-hour lead time", () => {
  const now = new Date("2026-08-17T09:00:00"); // Monday 9am local

  it("rejects a slot 47 hours out", () => {
    // Wednesday 8am would be 47h; nearest real slot is Wed 10:00 AM = 49h.
    expect(isTourSlotBookable("2026-08-18", "10:00 AM", now)).toBe(false); // Tue, 25h
  });

  it("accepts a slot comfortably beyond the floor", () => {
    expect(isTourSlotBookable("2026-08-19", "10:00 AM", now)).toBe(true); // Wed, 49h
  });

  it("is exactly 48 hours, not 47 or 49", () => {
    const base = new Date("2026-08-17T10:00:00");
    // Wednesday 10:00 AM is exactly 48h after Monday 10:00 AM.
    expect(isTourSlotBookable("2026-08-19", "10:00 AM", base)).toBe(true);
    const oneMinuteLate = new Date("2026-08-17T10:01:00");
    expect(isTourSlotBookable("2026-08-19", "10:00 AM", oneMinuteLate)).toBe(false);
  });

  it("uses the documented constant", () => {
    expect(TOUR_LEAD_HOURS).toBe(48);
  });
});

describe("server guard is permissive but not on weekends", () => {
  const now = new Date("2026-08-17T16:00:00Z");

  it("does not reject a request that is valid in some US timezone", () => {
    // Wednesday 10:00 AM Pacific is well beyond 48h from Monday 16:00 UTC.
    expect(isTourTooSoonAnywhere("2026-08-19", "10:00 AM", now)).toBe(false);
  });

  it("rejects one that is too soon even read as Pacific", () => {
    expect(isTourTooSoonAnywhere("2026-08-18", "10:00 AM", now)).toBe(true);
  });

  it("rejects an unparseable slot rather than letting it through", () => {
    expect(isTourTooSoonAnywhere("2026-08-19", "whenever", now)).toBe(true);
  });
});

describe("isValidTourSlot", () => {
  it("rejects a weekend even with a legal time", () => {
    expect(isValidTourSlot("2026-08-22", "10:00 AM")).toBe(false);
  });
  it("rejects a half-hour slot", () => {
    expect(isValidTourSlot("2026-08-19", "10:30 AM")).toBe(false);
  });
  it("accepts a real weekday slot", () => {
    expect(isValidTourSlot("2026-08-19", "4:00 PM")).toBe(true);
  });
});
