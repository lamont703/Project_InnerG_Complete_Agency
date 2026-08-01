import { describe, it, expect } from "vitest";
import {
  validateOffer, toLocalPostOffer, offerStarters, defaultWindow,
  OFFER_TITLE_MAX, OFFER_LONG_DAYS, type OfferDraft,
} from "./gbp-post-offers";

const NOW = new Date("2026-08-01T00:00:00Z");

const draft = (over: Partial<OfferDraft> = {}): OfferDraft => ({
  title: "$5 off your first visit",
  startDate: "2026-08-01",
  endDate: "2026-08-31",
  termsConditions: "New customers only. One per person.",
  ...over,
});

describe("validateOffer", () => {
  it("accepts a well-formed offer", () => {
    expect(validateOffer(draft(), NOW).ok).toBe(true);
  });

  it("insists on an end date", () => {
    // Not a formality: an open-ended offer is one nobody remembers to withdraw,
    // and the owner either honours it forever or disappoints someone holding a
    // phone at the counter.
    const r = validateOffer(draft({ endDate: "" }), NOW);
    expect(r.ok).toBe(false);
    expect(r.issues.find((i) => i.field === "dates")?.message).toMatch(/needs an end date/i);
  });

  it("rejects an offer that ends before it starts", () => {
    const r = validateOffer(draft({ startDate: "2026-08-20", endDate: "2026-08-10" }), NOW);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => /ends before it starts/i.test(i.message))).toBe(true);
  });

  it("rejects an offer that already expired", () => {
    const r = validateOffer(draft({ startDate: "2026-06-01", endDate: "2026-06-30" }), NOW);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => /already expired/i.test(i.message))).toBe(true);
  });

  it("warns but allows a long-running offer", () => {
    const r = validateOffer(draft({ endDate: "2027-06-01" }), NOW);
    expect(r.ok).toBe(true);
    const warn = r.issues.find((i) => i.field === "dates");
    expect(warn?.level).toBe("warning");
    expect(warn?.message).toContain(String(OFFER_LONG_DAYS));
  });

  it("needs a name", () => {
    expect(validateOffer(draft({ title: "" }), NOW).ok).toBe(false);
    expect(validateOffer(draft({ title: "x".repeat(OFFER_TITLE_MAX + 1) }), NOW).ok).toBe(false);
  });

  it("warns when there are no terms, without blocking", () => {
    // Google publishes the offer as written, so anything not excluded is agreed.
    const r = validateOffer(draft({ termsConditions: "" }), NOW);
    expect(r.ok).toBe(true);
    const t = r.issues.find((i) => i.field === "termsConditions");
    expect(t?.level).toBe("warning");
    expect(t?.message).toMatch(/shows this offer as written/i);
  });

  it("requires https on a redeem link", () => {
    expect(validateOffer(draft({ redeemOnlineUrl: "http://x.com" }), NOW).ok).toBe(false);
    expect(validateOffer(draft({ redeemOnlineUrl: "https://x.com" }), NOW).ok).toBe(true);
  });

  it("warns about a code with spaces rather than blocking it", () => {
    const r = validateOffer(draft({ couponCode: "FIRST CUT" }), NOW);
    expect(r.ok).toBe(true);
    expect(r.issues.find((i) => i.field === "couponCode")?.level).toBe("warning");
  });

  it("reports every problem at once", () => {
    const r = validateOffer({ title: "", startDate: "", endDate: "", redeemOnlineUrl: "ftp://x" }, NOW);
    expect(r.issues.length).toBeGreaterThan(2);
  });
});

describe("toLocalPostOffer", () => {
  it("returns the event Google requires alongside the offer", () => {
    // "Event information. Required for topic types EVENT and OFFER." Sending
    // one without the other is rejected.
    const { event, offer } = toLocalPostOffer(draft({ couponCode: "FIRSTCUT" }));
    expect(event.title).toBe("$5 off your first visit");
    expect(event.schedule.startDate).toEqual({ year: 2026, month: 8, day: 1 });
    expect(event.schedule.endDate).toEqual({ year: 2026, month: 8, day: 31 });
    expect(offer.couponCode).toBe("FIRSTCUT");
  });

  it("runs the offer over whole days", () => {
    // Nobody expects a discount to lapse at 4pm.
    const { event } = toLocalPostOffer(draft());
    expect(event.schedule.startTime).toEqual({ hours: 0, minutes: 0 });
    expect(event.schedule.endTime).toEqual({ hours: 23, minutes: 59 });
  });

  it("omits empty optional fields rather than sending blanks", () => {
    const { offer } = toLocalPostOffer(draft({ couponCode: "", redeemOnlineUrl: "", termsConditions: "" }));
    expect(offer).toEqual({});
  });

  it("truncates a long name to what Google displays", () => {
    const { event } = toLocalPostOffer(draft({ title: "Twenty percent off ".repeat(6) }));
    expect(event.title.length).toBeLessThanOrEqual(OFFER_TITLE_MAX);
  });
});

describe("offerStarters", () => {
  const starters = offerStarters("Unique Image Barber Salon");

  it("never picks an amount", () => {
    // A discount is money out of the owner's till. We supply the shape; the
    // number is theirs.
    for (const s of starters) {
      expect(s.title, s.id).toContain("__");
      expect(s.title, s.id).not.toMatch(/[$£€]\s?\d|\b\d+\s?%/);
      expect(s.summary, s.id).not.toMatch(/[$£€]\s?\d|\b\d+\s?%/);
    }
  });

  it("names the business in the copy", () => {
    for (const s of starters) expect(s.summary).toContain("Unique Image Barber Salon");
  });

  it("ships terms with every starter", () => {
    for (const s of starters) expect(s.terms.length).toBeGreaterThan(10);
  });

  it("explains why each one is worth running", () => {
    for (const s of starters) expect(s.reason.length).toBeGreaterThan(20);
  });

  it("each starter passes validation once an amount is filled in", () => {
    for (const s of starters) {
      const filled: OfferDraft = {
        title: s.title.replace("__", "$5"),
        ...defaultWindow(s.days, NOW),
        termsConditions: s.terms,
      };
      expect(validateOffer(filled, NOW).ok, s.id).toBe(true);
    }
  });
});

describe("defaultWindow", () => {
  it("opens today and closes after the given days", () => {
    expect(defaultWindow(30, NOW)).toEqual({ startDate: "2026-08-01", endDate: "2026-08-31" });
  });
});
