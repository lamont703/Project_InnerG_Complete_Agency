import { describe, it, expect } from "vitest";
import { validateBookingUrl, isEditable, buildBookingState, type PlaceActionLink } from "./gbp-place-actions";

const link = (over: Partial<PlaceActionLink> = {}): PlaceActionLink => ({
  name: "locations/1/placeActionLinks/a",
  uri: "https://example.com/book",
  placeActionType: "APPOINTMENT",
  providerType: "MERCHANT",
  isEditable: true,
  ...over,
});

describe("validateBookingUrl", () => {
  it("accepts a real booking page", () => {
    const r = validateBookingUrl("https://example.com/book");
    expect(r.ok).toBe(true);
    expect(r.issues).toHaveLength(0);
  });

  it("adds https to a bare domain rather than rejecting it", () => {
    const r = validateBookingUrl("example.com/book");
    expect(r.ok).toBe(true);
    expect(r.normalized).toBe("https://example.com/book");
  });

  it("rejects anything that isn't a web address", () => {
    expect(validateBookingUrl("call us").ok).toBe(false);
    expect(validateBookingUrl("").ok).toBe(false);
  });

  it("blocks social profiles — the Book button should go to booking", () => {
    for (const u of [
      "https://facebook.com/myshop",
      "https://www.instagram.com/myshop",
      "https://tiktok.com/@myshop",
      "https://yelp.com/biz/myshop",
    ]) {
      const r = validateBookingUrl(u);
      expect(r.ok, u).toBe(false);
      expect(r.issues[0].level).toBe("error");
    }
  });

  it("blocks a link back to Google itself", () => {
    expect(validateBookingUrl("https://g.page/myshop").ok).toBe(false);
    expect(validateBookingUrl("https://www.google.com/maps/place/x").ok).toBe(false);
  });

  it("warns about a homepage without blocking it", () => {
    // Some shops really do book from the front page, so this is advice rather
    // than a rule — but it's the most common wasted click on a profile.
    const r = validateBookingUrl("https://example.com/");
    expect(r.ok).toBe(true);
    expect(r.issues.some((i) => i.level === "warning" && /homepage/i.test(i.message))).toBe(true);
  });

  it("warns about http without blocking it", () => {
    const r = validateBookingUrl("http://example.com/book");
    expect(r.ok).toBe(true);
    expect(r.issues.some((i) => /isn't secure/i.test(i.message))).toBe(true);
  });
});

describe("isEditable", () => {
  it("treats a merchant-created link as editable", () => {
    expect(isEditable(link())).toBe(true);
  });

  it("treats a booking provider's link as locked", () => {
    // Saving over one of these would appear to work and change nothing.
    expect(isEditable(link({ providerType: "AGGREGATOR_3P" }))).toBe(false);
    expect(isEditable(link({ isEditable: false }))).toBe(false);
  });
});

describe("buildBookingState", () => {
  const types = [{ placeActionType: "APPOINTMENT", displayName: "Appointment links" }];

  it("reports no booking link when there are none", () => {
    const s = buildBookingState([], types);
    expect(s.hasBooking).toBe(false);
    expect(s.missingTypes.map((t) => t.placeActionType)).toEqual(["APPOINTMENT"]);
  });

  it("separates editable links from provider-owned ones", () => {
    const s = buildBookingState([link(), link({ name: "b", providerType: "AGGREGATOR_3P" })], types);
    expect(s.editable).toHaveLength(1);
    expect(s.locked).toHaveLength(1);
  });

  it("stops offering a type once a link exists for it", () => {
    expect(buildBookingState([link()], types).missingTypes).toHaveLength(0);
  });
});
