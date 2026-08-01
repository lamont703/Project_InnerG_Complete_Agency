import { describe, it, expect } from "vitest";
import {
  validateSchedule, isStillPublishable, describeSchedule, suggestedSlots,
  SCHEDULE_MAX_DAYS, SCHEDULE_MIN_MINUTES,
} from "./gbp-post-schedule";

const NOW = new Date("2026-08-01T12:00:00Z");
const at = (iso: string) => new Date(iso);

describe("validateSchedule", () => {
  it("accepts a time later today", () => {
    expect(validateSchedule(at("2026-08-01T18:00:00Z"), NOW).ok).toBe(true);
  });

  it("rejects a time that has passed", () => {
    const r = validateSchedule(at("2026-08-01T09:00:00Z"), NOW);
    expect(r.ok).toBe(false);
    expect(r.issues[0].message).toMatch(/already passed/i);
  });

  it("rejects something so close it may as well be published now", () => {
    const r = validateSchedule(at("2026-08-01T12:05:00Z"), NOW);
    expect(r.ok).toBe(false);
    expect(r.issues[0].message).toContain(String(SCHEDULE_MIN_MINUTES));
  });

  it("rejects a date beyond the horizon", () => {
    // What's true about a shop today may not be in six months, and a queue
    // nobody remembers filling is how a stale post goes out.
    const r = validateSchedule(at("2027-06-01T12:00:00Z"), NOW);
    expect(r.ok).toBe(false);
    expect(r.issues[0].message).toContain(String(SCHEDULE_MAX_DAYS));
  });

  it("rejects a nonsense value rather than queueing it", () => {
    expect(validateSchedule("tomorrow-ish", NOW).ok).toBe(false);
  });
});

describe("isStillPublishable", () => {
  const offerEnding = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return { event: { schedule: { endDate: { year: y, month: m, day: d } } }, offer: {} };
  };

  it("lets a plain post through — nothing about it expires", () => {
    expect(isStillPublishable({}, NOW).publishable).toBe(true);
    expect(isStillPublishable({ event: null, offer: null }, NOW).publishable).toBe(true);
  });

  it("drops an offer whose window closed while it waited", () => {
    // This is the check the whole feature turns on: an expired offer published
    // late reaches customers under the shop's name and they try to use it.
    const r = isStillPublishable(offerEnding("2026-07-20"), NOW);
    expect(r.publishable).toBe(false);
    expect(r.reason).toMatch(/offer expired/i);
  });

  it("publishes on the final day, not up to midnight UTC", () => {
    // An offer valid "until the 31st" is valid all of the 31st. Cutting at
    // 00:00 UTC would lose a day in every US timezone.
    const lateOnLastDay = new Date("2026-08-01T23:30:00Z");
    expect(isStillPublishable(offerEnding("2026-08-01"), lateOnLastDay).publishable).toBe(true);
  });

  it("names an event rather than an offer when there's no offer", () => {
    const r = isStillPublishable(
      { event: { schedule: { endDate: { year: 2026, month: 7, day: 1 } } } },
      NOW
    );
    expect(r.publishable).toBe(false);
    expect(r.reason).toMatch(/event finished/i);
  });
});

describe("describeSchedule", () => {
  it("reads as a human would say it", () => {
    expect(describeSchedule("2026-08-01T12:30:00Z", NOW)).toBe("in 30 minutes");
    expect(describeSchedule("2026-08-01T18:00:00Z", NOW)).toBe("in 6 hours");
    expect(describeSchedule("2026-08-08T12:00:00Z", NOW)).toBe("in 7 days");
  });

  it("says a due post is due", () => {
    expect(describeSchedule("2026-08-01T11:00:00Z", NOW)).toBe("due now");
  });
});

describe("suggestedSlots", () => {
  it("spaces them a week apart, because that's how long a post survives", () => {
    const slots = suggestedSlots(NOW, 4);
    expect(slots).toHaveLength(4);
    expect(slots[0].toISOString()).toBe("2026-08-08T12:00:00.000Z");
    expect(slots[3].toISOString()).toBe("2026-08-29T12:00:00.000Z");
  });

  it("keeps the time of day, so nothing lands at 3am", () => {
    for (const s of suggestedSlots(NOW, 3)) {
      expect(s.getUTCHours()).toBe(NOW.getUTCHours());
    }
  });

  it("every suggested slot passes validation", () => {
    for (const s of suggestedSlots(NOW, 4)) {
      expect(validateSchedule(s, NOW).ok).toBe(true);
    }
  });
});
