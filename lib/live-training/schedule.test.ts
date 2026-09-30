import { describe, it, expect } from "vitest";
import {
  sessionStart, registrationClosesAt, sessionForRegistration, sessionLabel, upcomingSession, STEPS, stepDue, SMS_PER_EVENT,
  campaignWeekDue, campaignSession, isCampaignStartDay,
} from "./schedule";

const at = (iso: string) => new Date(iso);
const step = (id: string) => STEPS.find((s) => s.id === id)!;

describe("when the session is", () => {
  it("is Monday 3 PM Eastern in daylight time (EDT, UTC-4)", () => {
    expect(sessionStart("2026-10-05").toISOString()).toBe("2026-10-05T19:00:00.000Z");
  });
  it("is still 3 PM on the wall clock after the clocks change (EST, UTC-5)", () => {
    expect(sessionStart("2026-11-09").toISOString()).toBe("2026-11-09T20:00:00.000Z");
  });
  it("closes registration 48 hours before — Saturday 3 PM", () => {
    expect(registrationClosesAt("2026-10-05").toISOString()).toBe("2026-10-03T19:00:00.000Z");
  });
});

describe("which Monday a sign-up is for", () => {
  it("is this coming Monday while registration is open", () => {
    expect(sessionForRegistration(at("2026-09-30T15:00:00Z"))).toBe("2026-10-05"); // Wed
    expect(sessionForRegistration(at("2026-10-03T18:59:00Z"))).toBe("2026-10-05"); // Sat 2:59 PM ET
  });
  it("rolls to the following Monday once it has closed", () => {
    expect(sessionForRegistration(at("2026-10-03T19:00:00Z"))).toBe("2026-10-12"); // Sat 3 PM ET
    expect(sessionForRegistration(at("2026-10-05T12:00:00Z"))).toBe("2026-10-12"); // Monday morning
    expect(sessionForRegistration(at("2026-10-05T21:00:00Z"))).toBe("2026-10-12"); // after it ran
  });
  it("keeps showing a session as upcoming while it's live", () => {
    expect(upcomingSession(at("2026-10-05T19:30:00Z"))).toBe("2026-10-05");
    expect(upcomingSession(at("2026-10-05T20:30:00Z"))).toBe("2026-10-12");
  });
});

describe("the hype sequence", () => {
  const d = "2026-10-05";
  it("sends the link 24 hours before, and never before", () => {
    expect(STEPS.filter((s) => s.withLink).every((s) => s.dueAt(d).getTime() >= sessionStart(d).getTime() - 24 * 3600_000)).toBe(true);
    expect(stepDue(step("link"), d, at("2026-10-04T19:00:00Z"))).toBe(true);
    expect(stepDue(step("link"), d, at("2026-10-04T18:59:00Z"))).toBe(false);
  });
  it("sends the morning reminder at 10 AM Eastern on the day", () => {
    expect(step("morning").dueAt(d).toISOString()).toBe("2026-10-05T14:00:00.000Z");
  });
  it("won't send 'we're live' long after the start", () => {
    expect(stepDue(step("live"), d, at("2026-10-05T19:05:00Z"))).toBe(true);
    expect(stepDue(step("live"), d, at("2026-10-05T19:45:00Z"))).toBe(false);
  });
  it("runs in time order", () => {
    const times = STEPS.slice(1).map((s) => s.dueAt(d).getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
  it("sends at most six texts per event", () => {
    expect(SMS_PER_EVENT).toBe(6);
  });
});

describe("the 12-week campaign", () => {
  const start = "2026-10-07"; // a Wednesday
  it("only starts on a Wednesday", () => {
    expect(isCampaignStartDay(start)).toBe(true);
    expect(isCampaignStartDay("2026-10-06")).toBe(false);
  });
  it("promotes the Monday after each Wednesday", () => {
    expect(campaignSession(start, 1)).toBe("2026-10-12");
    expect(campaignSession(start, 12)).toBe("2026-12-28");
  });
  it("is due from Wednesday 11 AM Eastern until Saturday's close", () => {
    expect(campaignWeekDue(start, at("2026-10-07T14:59:00Z"))).toBeNull();
    expect(campaignWeekDue(start, at("2026-10-07T15:00:00Z"))).toBe(1);
    expect(campaignWeekDue(start, at("2026-10-10T18:59:00Z"))).toBe(1);
    expect(campaignWeekDue(start, at("2026-10-10T19:00:00Z"))).toBeNull();
    expect(campaignWeekDue(start, at("2026-10-14T16:00:00Z"))).toBe(2);
  });
  it("stops after week 12", () => {
    expect(campaignWeekDue(start, at("2026-12-30T16:00:00Z"))).toBeNull();
  });
});

describe("the evergreen label on the public page", () => {
  it("says This Monday while this Monday is open, and Monday next week once it has closed", () => {
    expect(sessionLabel(at("2026-09-30T15:00:00Z"))).toBe("This Monday");
    expect(sessionLabel(at("2026-10-03T19:00:00Z"))).toBe("Monday next week");
    expect(sessionLabel(at("2026-10-04T15:00:00Z"))).toBe("Monday next week");
    expect(sessionLabel(at("2026-10-05T21:00:00Z"))).toBe("Monday next week"); // Monday evening: today's already ran
    expect(sessionLabel(at("2026-10-06T15:00:00Z"))).toBe("This Monday"); // Tuesday
  });
});
