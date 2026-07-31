import { describe, it, expect } from "vitest";
import { buildMonitoringEmail, shouldNotify } from "./gbp-monitoring";
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
