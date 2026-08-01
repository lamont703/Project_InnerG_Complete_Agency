import { describe, it, expect } from "vitest";
import {
  parseDate, parseTime, trimEventTitle, toLocalPostEvent, isPostableEvent,
  eventsNear, describeDates, buildAttendanceSummary,
  DAY_START, DAY_END, EVENT_TITLE_MAX, type DirectoryEvent,
} from "./gbp-post-events";

// The real rows in the directory, which is where the awkward cases come from.
const BARBERCON: DirectoryEvent = {
  id: "1", title: "BARBERCON DALLAS", event_date: "2026-09-13", end_date: null,
  start_time: "13:00:00", end_time: null, venue_name: "Gilley's", city: "Dallas",
};
const CT_EXPO: DirectoryEvent = {
  id: "2", title: "Connecticut Barber Expo 15 - June 6-8, 2026 (Barber Grammy's on June 6)",
  event_date: "2026-06-06", end_date: "2026-06-08", start_time: null, end_time: null,
  venue_name: "Mohegan Sun", city: "Uncasville",
};
const BOOTCAMP: DirectoryEvent = {
  id: "3", title: "The Barber.josh.o.p 5 Day Barber Bootcamp HOUSTON",
  event_date: "2026-08-23", end_date: "2026-08-27", start_time: "10:00:00", end_time: "16:00:00",
  venue_name: "Sanman Studios", city: "Houston",
};

const NOW = new Date("2026-08-01T00:00:00Z");

describe("parseDate / parseTime", () => {
  it("reads the stored formats", () => {
    expect(parseDate("2026-09-13")).toEqual({ year: 2026, month: 9, day: 13 });
    expect(parseTime("13:00:00", DAY_START)).toEqual({ hours: 13, minutes: 0 });
  });

  it("falls back to the whole day when a time is missing", () => {
    // Most directory rows have no times. Google wants all four components, and
    // printing an invented "10am" on a public listing is worse than the date alone.
    expect(parseTime(null, DAY_START)).toEqual(DAY_START);
    expect(parseTime("", DAY_END)).toEqual(DAY_END);
    expect(parseTime("nonsense", DAY_END)).toEqual(DAY_END);
    expect(parseTime("25:00:00", DAY_START)).toEqual(DAY_START);
  });

  it("rejects a malformed date rather than guessing", () => {
    for (const bad of ["", "2026-13-01", "not-a-date", "09/13/2026"]) {
      expect(parseDate(bad), bad).toBeNull();
    }
  });
});

describe("trimEventTitle", () => {
  it("leaves a short title alone", () => {
    expect(trimEventTitle("BARBERCON DALLAS")).toBe("BARBERCON DALLAS");
  });

  it("cuts a long one at a word boundary", () => {
    const t = trimEventTitle(CT_EXPO.title);
    expect(t.length).toBeLessThanOrEqual(EVENT_TITLE_MAX);
    expect(t).not.toMatch(/\s…$/);
    expect(t.endsWith("…")).toBe(true);
  });
});

describe("toLocalPostEvent", () => {
  it("fills an end date for a one-day event", () => {
    // Google requires endDate; our data omits it when the event is one day.
    const { event } = toLocalPostEvent(BARBERCON);
    expect(event!.schedule.startDate).toEqual({ year: 2026, month: 9, day: 13 });
    expect(event!.schedule.endDate).toEqual({ year: 2026, month: 9, day: 13 });
  });

  it("keeps a known start time and opens the end to the whole day", () => {
    const { event } = toLocalPostEvent(BARBERCON);
    expect(event!.schedule.startTime).toEqual({ hours: 13, minutes: 0 });
    expect(event!.schedule.endTime).toEqual(DAY_END);
  });

  it("spans a multi-day event", () => {
    const { event } = toLocalPostEvent(BOOTCAMP);
    expect(event!.schedule.startDate.day).toBe(23);
    expect(event!.schedule.endDate.day).toBe(27);
  });

  it("explains itself instead of vanishing when the date is unusable", () => {
    const r = toLocalPostEvent({ ...BARBERCON, event_date: "soon" });
    expect(r.event).toBeUndefined();
    expect(r.issues[0].message).toMatch(/no usable date/i);
  });
});

describe("isPostableEvent", () => {
  it("keeps a future event", () => {
    expect(isPostableEvent(BOOTCAMP, NOW)).toBe(true);
  });

  it("drops one that has already finished", () => {
    // Google rejects it, and it's an embarrassment on a live listing.
    expect(isPostableEvent(CT_EXPO, NOW)).toBe(false);
  });

  it("keeps a multi-day event that is currently running", () => {
    const midway = new Date("2026-08-25T00:00:00Z");
    expect(isPostableEvent(BOOTCAMP, midway)).toBe(true);
  });

  it("keeps an event on its final day", () => {
    expect(isPostableEvent(BOOTCAMP, new Date("2026-08-27T12:00:00Z"))).toBe(true);
  });
});

describe("eventsNear", () => {
  const all = [BARBERCON, CT_EXPO, BOOTCAMP];

  it("only offers events in the shop's own city", () => {
    // A Houston barber has no business posting a Connecticut expo, and every
    // Dallas shop posting the same convention is how you make spam.
    const houston = eventsNear(all, "Houston", NOW);
    expect(houston.map((e) => e.id)).toEqual(["3"]);
  });

  it("ignores case and padding on the city", () => {
    expect(eventsNear(all, "  houston ", NOW).map((e) => e.id)).toEqual(["3"]);
  });

  it("excludes past events even in the right city", () => {
    expect(eventsNear(all, "Uncasville", NOW)).toEqual([]);
  });

  it("returns soonest first", () => {
    const any = eventsNear(all, null, NOW);
    expect(any.map((e) => e.id)).toEqual(["3", "1"]);
  });
});

describe("describeDates", () => {
  it("writes a single day", () => {
    expect(describeDates(BARBERCON)).toBe("September 13");
  });

  it("writes a range within one month", () => {
    expect(describeDates(BOOTCAMP)).toBe("August 23–27");
  });

  it("writes a range across months", () => {
    expect(describeDates({ event_date: "2026-08-30", end_date: "2026-09-02" })).toBe("August 30 – September 2");
  });
});

describe("buildAttendanceSummary", () => {
  it("frames it as the shop's news, not the organiser's", () => {
    const s = buildAttendanceSummary(BOOTCAMP, "Unique Image Barber Salon");
    expect(s).toMatch(/^We'll be at /);
    expect(s).toContain("August 23–27");
    expect(s).toContain("Sanman Studios");
    expect(s).toContain("Unique Image Barber Salon");
  });

  it("never reproduces the organiser's marketing copy", () => {
    // That copy belongs to them, and it would be identical on every shop that
    // posted it — the duplicate-content problem this feature has to avoid.
    const s = buildAttendanceSummary(
      { ...BOOTCAMP, description: "Five days of the most in-depth, hands on practical education." },
      "Test Shop"
    );
    expect(s).not.toContain("in-depth");
  });

  it("drops a trailing date suffix from a messy title", () => {
    const s = buildAttendanceSummary(CT_EXPO, "Test Shop");
    expect(s).not.toContain("June 6-8, 2026 (Barber Grammy");
  });
});
