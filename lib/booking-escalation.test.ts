import { describe, it, expect } from "vitest";
import {
  nextAction,
  withinContactWindow,
  NUDGE_AFTER_HOURS,
  URGENT_WITHIN_HOURS,
  type EscalationRow,
} from "./booking-escalation";

/** A notified request, three weeks out, freshly sent. Overridden per case. */
const row = (over: Partial<EscalationRow> = {}): EscalationRow => ({
  status: "notified",
  notified_business_at: "2026-08-15T14:00:00Z",
  escalated_at: null,
  resolution_notified_at: null,
  requested_date: "2026-09-05",
  requested_time: "11:30 AM",
  ...over,
});

describe("the slow lane", () => {
  it("leaves a fresh request alone", () => {
    const a = nextAction(row(), new Date("2026-08-15T16:00:00Z")); // 2h
    expect(a.kind).toBe("wait");
  });

  it("nudges once the wait is up", () => {
    const now = new Date(Date.parse("2026-08-15T14:00:00Z") + NUDGE_AFTER_HOURS * 3600_000);
    expect(nextAction(row(), now).kind).toBe("nudge_business");
  });

  it("explains itself while waiting, so a dry run is readable", () => {
    const a = nextAction(row(), new Date("2026-08-15T16:00:00Z"));
    expect(a.kind === "wait" && a.why).toMatch(/2\.0h of 20h/);
  });
});

describe("the urgent lane", () => {
  // Requested for tomorrow morning, texted to the business just now.
  const soon = row({ requested_date: "2026-08-16", requested_time: "9:00 AM" });

  it("does not fire in the first hour, however close the slot is", () => {
    const a = nextAction(soon, new Date("2026-08-15T14:30:00Z")); // 30 min
    expect(a.kind).toBe("wait");
    expect(a.kind === "wait" && a.why).toMatch(/under an hour/);
  });

  it("fires after an hour, without waiting for the slow lane", () => {
    expect(nextAction(soon, new Date("2026-08-15T15:30:00Z")).kind).toBe("nudge_business");
  });

  it("is the entire point: 20 hours would have been far too late here", () => {
    // The slow lane alone would first act at 10:00Z on the 16th — 9:00 AM
    // Central is 14:00Z, so in Texas the appointment would be four hours away
    // and in California it would already have passed unnoticed.
    const slowLaneWouldAct = new Date(Date.parse("2026-08-15T14:00:00Z") + NUDGE_AFTER_HOURS * 3600_000);
    const urgentActs = new Date("2026-08-15T15:30:00Z");
    expect(urgentActs.getTime()).toBeLessThan(slowLaneWouldAct.getTime());
    expect(URGENT_WITHIN_HOURS).toBeLessThanOrEqual(24);
  });
});

describe("one nudge, never two", () => {
  it("holds after nudging while the slot is still ahead", () => {
    const a = nextAction(row({ escalated_at: "2026-08-16T15:00:00Z" }), new Date("2026-08-20T15:00:00Z"));
    expect(a.kind).toBe("wait");
    expect(a.kind === "wait" && a.why).toMatch(/still time/);
  });

  it("never nudges a request it has already nudged, at any later time", () => {
    const nudged = row({ escalated_at: "2026-08-16T15:00:00Z" });
    for (const d of ["2026-08-17", "2026-08-25", "2026-09-04", "2026-10-01"]) {
      expect(nextAction(nudged, new Date(`${d}T15:00:00Z`)).kind).not.toBe("nudge_business");
    }
  });
});

describe("releasing the customer", () => {
  it("closes out once the slot has passed with no reply", () => {
    const nudged = row({ escalated_at: "2026-08-16T15:00:00Z" });
    expect(nextAction(nudged, new Date("2026-09-06T15:00:00Z")).kind).toBe("release_customer");
  });

  it("does not text a business about an appointment that already passed", () => {
    // Never nudged AND the slot is gone — the reminder has no purpose now.
    const missed = row({ requested_date: "2026-08-13", requested_time: "12:00 PM" });
    expect(nextAction(missed, new Date("2026-08-15T15:00:00Z")).kind).toBe("release_customer");
  });

  it("waits while any covered timezone still has the slot ahead", () => {
    // 9:00 AM on the 15th is 17:00Z at PST, the latest reading. At 16:00Z the
    // slot has passed in Texas but not everywhere, so it is not written off.
    const edge = row({
      requested_date: "2026-08-15",
      requested_time: "9:00 AM",
      escalated_at: "2026-08-15T12:00:00Z",
    });
    expect(nextAction(edge, new Date("2026-08-15T16:00:00Z")).kind).toBe("wait");
    expect(nextAction(edge, new Date("2026-08-15T18:00:00Z")).kind).toBe("release_customer");
  });

  it("says it once", () => {
    const done = row({
      escalated_at: "2026-08-16T15:00:00Z",
      resolution_notified_at: "2026-09-06T16:00:00Z",
    });
    expect(nextAction(done, new Date("2026-09-07T15:00:00Z")).kind).toBe("wait");
  });
});

describe("declined", () => {
  it("tells the customer, and does so before any timing rule", () => {
    const d = row({ status: "declined", requested_date: "2026-08-16", requested_time: "9:00 AM" });
    expect(nextAction(d, new Date("2026-08-15T14:05:00Z")).kind).toBe("tell_customer_declined");
  });

  it("never nudges a business that already answered", () => {
    const d = row({ status: "declined" });
    for (const t of ["2026-08-15T14:05:00Z", "2026-08-20T15:00:00Z", "2026-09-30T15:00:00Z"]) {
      expect(nextAction(d, new Date(t)).kind).not.toBe("nudge_business");
    }
  });

  it("tells them once", () => {
    const d = row({ status: "declined", resolution_notified_at: "2026-08-15T14:10:00Z" });
    expect(nextAction(d, new Date("2026-08-16T15:00:00Z")).kind).toBe("wait");
  });
});

describe("booked", () => {
  it("tells the customer the good news — nothing else does", () => {
    const b = row({ status: "booked" });
    expect(nextAction(b, new Date("2026-08-20T15:00:00Z")).kind).toBe("tell_customer_booked");
  });

  it("tells them once", () => {
    const b = row({ status: "booked", resolution_notified_at: "2026-08-20T15:00:00Z" });
    expect(nextAction(b, new Date("2026-08-21T15:00:00Z")).kind).toBe("wait");
  });

  it("never nudges a business that already said yes", () => {
    const b = row({ status: "booked" });
    expect(nextAction(b, new Date("2026-09-30T15:00:00Z")).kind).not.toBe("nudge_business");
  });
});

describe("statuses the job must not touch", () => {
  it("leaves everything a human has already moved on", () => {
    for (const status of ["new", "contacted", "no_response", "cancelled"]) {
      const a = nextAction(row({ status }), new Date("2026-09-30T15:00:00Z"));
      expect(a.kind).toBe("wait");
    }
  });

  it("refuses to act on a notified row with no timestamp", () => {
    const broken = row({ notified_business_at: null });
    const a = nextAction(broken, new Date("2026-08-30T15:00:00Z"));
    expect(a.kind).toBe("wait");
    expect(a.kind === "wait" && a.why).toMatch(/no timestamp/);
  });
});

describe("withinContactWindow", () => {
  const at = (utc: string) => withinContactWindow(new Date(utc));

  it("is shut overnight — the reason it exists", () => {
    expect(at("2026-08-15T09:00:00Z")).toBe(false); // 04:00 Central
    expect(at("2026-08-15T06:00:00Z")).toBe(false); // 01:00 Central
  });

  it("is open through the working day", () => {
    expect(at("2026-08-15T16:00:00Z")).toBe(true); // 11:00 Central, 09:00 Pacific
    expect(at("2026-08-15T22:00:00Z")).toBe(true); // 17:00 Central
  });

  it("closes in the evening, with 18:xx the last sendable hour", () => {
    expect(at("2026-08-15T23:00:00Z")).toBe(true);  // 18:00 Central
    expect(at("2026-08-16T00:00:00Z")).toBe(false); // 19:00 Central — shut
    expect(at("2026-08-16T01:00:00Z")).toBe(false); // 20:00 Central
  });

  it("opens no earlier than 08:00 on the west coast", () => {
    // 10:00 Central is 08:00 Pacific. Anything earlier would text a Californian
    // business before it opens.
    expect(at("2026-08-15T14:00:00Z")).toBe(false); // 09:00 Central / 07:00 Pacific
    expect(at("2026-08-15T15:00:00Z")).toBe(true);  // 10:00 Central / 08:00 Pacific
  });
});
