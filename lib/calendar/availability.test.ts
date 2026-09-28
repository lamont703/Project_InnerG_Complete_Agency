import { describe, it, expect } from "vitest";
import { openSlots, outsideHoursReason } from "./availability";
import { zonedToUtc, formatLocal } from "./time";

const TZ = "America/Chicago";
// Wed Sep 30 2026: 9am–5pm.
const HOURS = [{ weekday: 3, start_minute: 540, end_minute: 1020 }];
const at = (h: number, m = 0) => zonedToUtc(2026, 9, 30, h * 60 + m, TZ);
const labels = (ds: Date[]) => ds.map((d) => formatLocal(d, TZ, false));
const base = { hours: HOURS, blocked: [], bufferMinutes: 0, stepMinutes: 60, tz: TZ, fromKey: "2026-09-30", toKey: "2026-09-30", notBefore: new Date(0) };

describe("open slots", () => {
  it("offers every step whose service ends by closing time", () => {
    expect(labels(openSlots({ ...base, durationMinutes: 45 }))).toEqual(["9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm", "4pm"]);
    // A 90-minute service can't start at 4pm: it would end at 5:30.
    expect(labels(openSlots({ ...base, durationMinutes: 90 })).at(-1)).toBe("3pm");
  });

  it("skips what is booked, including its clean-up buffer", () => {
    const blocked = [{ start: at(11), end: at(12, 15) }]; // 11:00 cut, done 12:00, +15 buffer
    const slots = labels(openSlots({ ...base, durationMinutes: 60, blocked }));
    expect(slots).not.toContain("11am");
    expect(slots).not.toContain("12pm"); // 12:00–13:00 overlaps 12:00–12:15
    expect(slots).toContain("10am"); // 10–11 touches 11:00 but does not overlap
    expect(slots).toContain("1pm");
  });

  it("keeps this booking's own buffer clear of the next appointment", () => {
    const blocked = [{ start: at(11), end: at(12) }];
    // 10:00 + 60 min + 15 buffer = 11:15, which runs into the 11:00 booking.
    const slots = labels(openSlots({ ...base, durationMinutes: 60, bufferMinutes: 15, blocked }));
    expect(slots).not.toContain("10am");
    expect(slots).toContain("9am");
  });

  it("respects minimum notice and closed days", () => {
    expect(labels(openSlots({ ...base, durationMinutes: 30, notBefore: at(14, 30) }))[0]).toBe("3pm");
    expect(openSlots({ ...base, durationMinutes: 30, fromKey: "2026-10-01", toKey: "2026-10-01" })).toEqual([]);
  });

  it("steps from a shift's own opening time", () => {
    const slots = openSlots({ ...base, hours: [{ weekday: 3, start_minute: 585, end_minute: 720 }], durationMinutes: 30, stepMinutes: 30 });
    expect(labels(slots)[0]).toBe("9:45am");
  });

  it("stops at the limit", () => {
    expect(openSlots({ ...base, durationMinutes: 15, stepMinutes: 15, limit: 3 })).toHaveLength(3);
  });
});

describe("outside hours", () => {
  it("names the reason instead of silently refusing", () => {
    expect(outsideHoursReason({ start: at(10), durationMinutes: 60, hours: HOURS, tz: TZ })).toBeNull();
    expect(outsideHoursReason({ start: at(16, 30), durationMinutes: 60, hours: HOURS, tz: TZ })).toMatch(/outside/);
    expect(outsideHoursReason({ start: zonedToUtc(2026, 10, 1, 600, TZ), durationMinutes: 30, hours: HOURS, tz: TZ })).toMatch(/closed/);
  });
});
