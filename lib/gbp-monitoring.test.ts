import { describe, it, expect } from "vitest";
import { buildMonitoringEmail, shouldNotify, postNudge } from "./gbp-monitoring";
import type { AuditDiff, CheckChange } from "./gbp-audit-history";

const change = (over: Partial<CheckChange> = {}): CheckChange => ({
  id: "attributes", label: "Attributes", from: "8 of 48 set", to: "31 of 48 set", delta: 7, ...over,
});

const diff = (over: Partial<AuditDiff> = {}): AuditDiff => ({
  since: "2026-07-24T00:00:00Z", scoreDelta: 0, improved: [], regressed: [], ...over,
});

describe("shouldNotify", () => {
  it("stays silent when nothing moved", () => {
    expect(shouldNotify(diff())).toBe(false);
  });

  it("stays silent on the first run, when there's nothing to compare against", () => {
    expect(shouldNotify(null)).toBe(false);
  });

  it("speaks up when a check improved or regressed", () => {
    expect(shouldNotify(diff({ improved: [change()] }))).toBe(true);
    expect(shouldNotify(diff({ regressed: [change({ delta: -6 })] }))).toBe(true);
  });

  it("does not email on a score wobble with no underlying change", () => {
    // A score can shift from rounding or a benchmark moving. Emailing for that
    // trains owners to ignore the ones that matter.
    expect(shouldNotify(diff({ scoreDelta: 3 }))).toBe(false);
  });
});

describe("buildMonitoringEmail", () => {
  const base = { businessName: "Unique Image Barber Salon", score: 85 };

  it("returns null when there's nothing to say, so an empty email can't be sent", () => {
    expect(buildMonitoringEmail({ ...base, diff: diff() })).toBeNull();
    expect(buildMonitoringEmail({ ...base, diff: null })).toBeNull();
  });

  it("leads the subject with bad news when something regressed", () => {
    const email = buildMonitoringEmail({
      ...base,
      diff: diff({ regressed: [change({ label: "Photos", delta: -6 })], scoreDelta: -6 }),
    })!;
    expect(email.subject).toMatch(/changed on your Google profile/);
    expect(email.subject).not.toMatch(/improved/);
  });

  it("celebrates a pure improvement, with the delta in the subject", () => {
    const email = buildMonitoringEmail({
      ...base,
      diff: diff({ improved: [change()], scoreDelta: 12 }),
    })!;
    expect(email.subject).toMatch(/improved \(\+12\)/);
  });

  it("puts regressions above improvements in the body", () => {
    const email = buildMonitoringEmail({
      ...base,
      diff: diff({
        improved: [change({ label: "Attributes" })],
        regressed: [change({ label: "Hours", from: "7 days", to: "no hours", delta: -15 })],
        scoreDelta: -8,
      }),
    })!;
    expect(email.html.indexOf("Went backwards")).toBeLessThan(email.html.indexOf("Improved"));
  });

  it("quotes both sides of a regression so the owner can see what it was", () => {
    const email = buildMonitoringEmail({
      ...base,
      diff: diff({ regressed: [change({ label: "Hours", from: "7 days set", to: "no hours published", delta: -15 })] }),
    })!;
    expect(email.html).toContain("7 days set");
    expect(email.html).toContain("no hours published");
  });

  it("notes that a regression may be Google rather than the owner", () => {
    const email = buildMonitoringEmail({ ...base, diff: diff({ regressed: [change({ delta: -3 })] }) })!;
    expect(email.html).toMatch(/may be Google rather than you/i);
  });

  it("carries an opt-out and says why they're receiving it", () => {
    const email = buildMonitoringEmail({ ...base, diff: diff({ improved: [change()] }) })!;
    // Collapse whitespace: the template wraps lines, and HTML whitespace is
    // insignificant, so matching on it would test the formatting not the copy.
    const text = email.html.replace(/\s+/g, " ");
    expect(text).toMatch(/Turn these off/);
    expect(text).toMatch(/only email when something actually changes/i);
    expect(text).toMatch(/never on a schedule/i);
  });

  it("escapes the business name rather than injecting it into the markup", () => {
    const email = buildMonitoringEmail({
      businessName: '<script>alert(1)</script> Cuts',
      score: 50,
      diff: diff({ improved: [change()] }),
    })!;
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("links to the audit page", () => {
    const email = buildMonitoringEmail({ ...base, diff: diff({ improved: [change()] }) })!;
    expect(email.html).toContain("/account/gbp-audit");
  });
});

describe("postNudge", () => {
  const NOW = new Date("2026-08-01T00:00:00Z");

  it("nudges someone who has never posted", () => {
    expect(postNudge(null, NOW)?.headline).toMatch(/haven't posted/i);
  });

  it("stays quiet while a recent post is still in the feed", () => {
    expect(postNudge("2026-07-28T00:00:00Z", NOW)).toBeNull();
  });

  it("speaks up once the last post has aged out", () => {
    expect(postNudge("2026-07-10T00:00:00Z", NOW)?.headline).toBe("Your last post was 22 days ago");
  });

  it("says nothing on an unparseable date rather than inventing a number", () => {
    expect(postNudge("not-a-date", NOW)).toBeNull();
  });
});

describe("the nudge never causes a send", () => {
  const NOW = new Date("2026-08-01T00:00:00Z");

  it("returns null when nothing changed, however stale the posts are", () => {
    // The footer promises "we only email when something actually changes —
    // never on a schedule". A nudge that could trigger its own send would make
    // that sentence false and turn this into the weekly mail nobody opens.
    expect(
      buildMonitoringEmail({ businessName: "X", score: 60, diff: null, lastPostAt: null, now: NOW })
    ).toBeNull();
  });

  it("rides along on an email that was going out anyway", () => {
    const diff = {
      since: "2026-07-01T00:00:00Z",
      scoreDelta: -4,
      improved: [],
      regressed: [{ id: "hours", label: "Hours", from: "set", to: "missing", delta: -4 }],
    };
    const email = buildMonitoringEmail({ businessName: "X", score: 60, diff, lastPostAt: null, now: NOW });
    expect(email?.html).toMatch(/haven't posted/i);
    expect(email?.html).toContain("/account/gbp-posts");
  });

  it("omits the nudge when the owner posted recently", () => {
    const diff = {
      since: "2026-07-01T00:00:00Z",
      scoreDelta: 3,
      improved: [{ id: "photos", label: "Photos", from: "2", to: "6", delta: 3 }],
      regressed: [],
    };
    const email = buildMonitoringEmail({
      businessName: "X", score: 70, diff, lastPostAt: "2026-07-30T00:00:00Z", now: NOW,
    });
    expect(email?.html).not.toMatch(/haven't posted|days ago/i);
  });
});
