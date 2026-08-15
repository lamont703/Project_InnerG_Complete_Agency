import { describe, it, expect } from "vitest";
import {
  MIN_LEAD_HOURS,
  parseSlotMinutes,
  slotInstant,
  isTooSoonLocal,
  isTooSoonAnywhere,
  bookableSlots,
} from "./booking-lead-time";

describe("parseSlotMinutes", () => {
  it("reads the picker's format", () => {
    expect(parseSlotMinutes("9:00 AM")).toBe(9 * 60);
    expect(parseSlotMinutes("12:30 PM")).toBe(12 * 60 + 30);
    expect(parseSlotMinutes("7:00 PM")).toBe(19 * 60);
  });

  it("handles the two midday cases that catch everyone", () => {
    expect(parseSlotMinutes("12:00 AM")).toBe(0);
    expect(parseSlotMinutes("12:00 PM")).toBe(12 * 60);
  });

  it("returns null rather than a wrong number for junk", () => {
    expect(parseSlotMinutes("soon")).toBeNull();
    expect(parseSlotMinutes("25:00 AM")).toBeNull();
    expect(parseSlotMinutes("9:99 AM")).toBeNull();
  });
});

describe("the real incident", () => {
  // A request reached the salon 54 minutes before the slot. This is the case
  // the whole module exists for, so it is pinned literally.
  const submittedAt = new Date("2026-08-15T13:06:00Z"); // 08:06 America/Chicago

  it("rejects it on the server, in every timezone", () => {
    expect(isTooSoonAnywhere("2026-08-15", "9:00 AM", submittedAt)).toBe(true);
  });
});

describe("isTooSoonAnywhere — the permissive server guard", () => {
  it("never rejects a request that is valid on the west coast", () => {
    // 9:00 AM Pacific is 17:00 UTC at PST. At 12:00 UTC that is 5 hours out and
    // legitimate, even though the same wall clock has nearly passed in Texas.
    const now = new Date("2026-08-15T12:00:00Z");
    expect(isTooSoonAnywhere("2026-08-15", "9:00 AM", now)).toBe(false);
  });

  it("catches a slot no covered timezone could rescue", () => {
    const now = new Date("2026-08-15T16:00:00Z");
    expect(isTooSoonAnywhere("2026-08-15", "9:00 AM", now)).toBe(true);
  });

  it("lets tomorrow through from anywhere", () => {
    expect(isTooSoonAnywhere("2026-08-16", "9:00 AM", new Date("2026-08-15T13:06:00Z"))).toBe(false);
  });

  it("does not reject on an unparseable time — that is validation's job", () => {
    expect(isTooSoonAnywhere("2026-08-15", "whenever", new Date())).toBe(false);
    expect(isTooSoonAnywhere("not-a-date", "9:00 AM", new Date())).toBe(false);
  });
});

describe("isTooSoonLocal — the client gate", () => {
  it("uses the browser's own clock", () => {
    const now = new Date(2026, 7, 15, 8, 6);            // local 08:06
    expect(isTooSoonLocal("2026-08-15", "9:00 AM", now)).toBe(true);   // 54 min
    expect(isTooSoonLocal("2026-08-15", "1:00 PM", now)).toBe(false);  // ~5 h
  });

  it("puts the boundary exactly on the floor", () => {
    const now = new Date(2026, 7, 15, 9, 0);
    const justInside = new Date(2026, 7, 15, 9, 0, 1);
    expect(isTooSoonLocal("2026-08-15", "1:00 PM", now)).toBe(false);      // exactly 4 h
    expect(isTooSoonLocal("2026-08-15", "1:00 PM", justInside)).toBe(true); // a second under
  });

  it("allows same-day when there is enough notice — the point of a 4-hour floor", () => {
    // A 24-hour floor would forbid this, and same-day is a real case here.
    const morning = new Date(2026, 7, 15, 8, 0);
    expect(isTooSoonLocal("2026-08-15", "6:00 PM", morning)).toBe(false);
  });
});

describe("bookableSlots", () => {
  const SLOTS = ["9:00 AM", "11:00 AM", "1:00 PM", "3:00 PM", "5:00 PM", "7:00 PM"];

  it("hides only what is unbookable today", () => {
    const now = new Date(2026, 7, 15, 10, 0); // 10:00 local
    expect(bookableSlots(SLOTS, "2026-08-15", now)).toEqual(["3:00 PM", "5:00 PM", "7:00 PM"]);
  });

  it("keeps a future date whole", () => {
    const now = new Date(2026, 7, 15, 10, 0);
    expect(bookableSlots(SLOTS, "2026-08-20", now)).toEqual(SLOTS);
  });

  it("can empty a day entirely, which the UI has to handle", () => {
    const lateEvening = new Date(2026, 7, 15, 21, 0);
    expect(bookableSlots(SLOTS, "2026-08-15", lateEvening)).toEqual([]);
  });
});

describe("MIN_LEAD_HOURS", () => {
  it("is a floor a business can actually act inside", () => {
    expect(MIN_LEAD_HOURS).toBeGreaterThanOrEqual(2);
    expect(MIN_LEAD_HOURS).toBeLessThanOrEqual(24);
  });
});

describe("slotInstant", () => {
  it("converts by explicit UTC arithmetic, not by string parsing", () => {
    // 9:00 AM at UTC-5 is 14:00 UTC.
    expect(slotInstant("2026-08-15", "9:00 AM", -5)!.toISOString()).toBe("2026-08-15T14:00:00.000Z");
    // Same wall clock in Hawaii is five hours later in absolute terms.
    expect(slotInstant("2026-08-15", "9:00 AM", -10)!.toISOString()).toBe("2026-08-15T19:00:00.000Z");
  });
});
