import { describe, it, expect } from "vitest";
import { buildLifecycleEmail } from "./member-lifecycle-emails";
import type { PublicAuditResult } from "./gbp-audit-public";
import { SITE_HOST } from "./site";

const audit = (over: Partial<PublicAuditResult> = {}): PublicAuditResult => ({
  score: 46,
  coverage: { visible: 5, total: 13 },
  benchmark: { sampleSize: 28, city: "Tyler", medianReviews: 147, medianPhotos: 5 },
  checks: [
    { id: "hours", label: "Opening hours", status: "fail", detail: "No opening hours published.", fix: "Add hours." },
    { id: "photos", label: "Photos", status: "warn", detail: "2 photos on the public profile." },
    { id: "rating", label: "Rating", status: "pass", detail: "4.8 stars." },
  ],
  locked: [],
  ...over,
} as any);

describe("claimed_not_connected — the one that matters", () => {
  it("leads with the real score", () => {
    const e = buildLifecycleEmail("claimed_not_connected", {
      firstName: "Sharon", businessName: "Curl Up & Dye", city: "Tyler", audit: audit(),
    })!;
    expect(e.subject).toBe("Curl Up & Dye scored 46 on Google");
    expect(e.html).toContain("46 out of 100");
    expect(e.html).toContain("Sharon,");
  });

  it("puts failures above warnings", () => {
    // An owner reads the first bullet and acts on it, so the costliest gap
    // has to be first.
    const e = buildLifecycleEmail("claimed_not_connected", { businessName: "X", audit: audit() })!;
    expect(e.html.indexOf("Opening hours")).toBeLessThan(e.html.indexOf("Photos"));
  });

  it("never lists a passing check as a gap", () => {
    const e = buildLifecycleEmail("claimed_not_connected", { businessName: "X", audit: audit() })!;
    expect(e.html).not.toContain("4.8 stars");
  });

  it("says how much is still hidden", () => {
    const e = buildLifecycleEmail("claimed_not_connected", { businessName: "X", audit: audit() })!;
    expect(e.html).toContain("8 more checks");
  });

  it("still sends something honest when the audit couldn't run", () => {
    const e = buildLifecycleEmail("claimed_not_connected", { businessName: "X", audit: null })!;
    expect(e.subject).not.toContain("scored");
    expect(e.html).toContain("visible only to the profile owner");
  });

  it("escapes a business name with markup in it", () => {
    const e = buildLifecycleEmail("claimed_not_connected", { businessName: '<b>X</b>', audit: null })!;
    expect(e.html).not.toContain("<b>X</b>");
  });
});

describe("every stage", () => {
  const stages = ["no_claim", "claimed_not_connected", "connected_no_audit", "audit_no_action", "dormant"] as const;

  it("produces a subject, a call to action and a reason they got it", () => {
    for (const s of stages) {
      const e = buildLifecycleEmail(s, { firstName: "A", businessName: "B", audit: audit() })!;
      expect(e.subject, s).toBeTruthy();
      expect(e.html, s).toContain(SITE_HOST);
      expect(e.html, s).toMatch(/Reply to this email/);
    }
  });

  it("reads properly with no first name", () => {
    for (const s of stages) {
      const e = buildLifecycleEmail(s, { firstName: null, businessName: "B" })!;
      expect(e.html, s).toContain("Hello,");
      expect(e.html, s).not.toContain(" ,");
    }
  });

  it("says the check-in is the last one", () => {
    // The sequence has to visibly end, or it isn't a sequence — it's a habit.
    expect(buildLifecycleEmail("dormant", {})!.html).toMatch(/last time we'll bring it up/i);
  });
});

describe("business names from a scraper", () => {
  it("collapses stray whitespace before it reaches a subject line", () => {
    const e = buildLifecycleEmail("claimed_not_connected", {
      businessName: "Curl Up & Dye Salon @ KP Signature Suites ", audit: audit(),
    })!;
    expect(e.subject).toBe("Curl Up & Dye Salon @ KP Signature Suites scored 46 on Google");
    expect(e.subject).not.toContain("  ");
  });
});
