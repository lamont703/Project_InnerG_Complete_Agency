import { describe, it, expect } from "vitest";
import {
  buildPostAngles,
  validatePost,
  resolveCallToAction,
  pickShowcaseReview,
  trimQuote,
  POST_MAX,
  type PostContext,
  pickPostPhoto,
} from "./gbp-posts";
import type { GoogleReview } from "./gbp-review-replies";

const review = (over: Partial<GoogleReview> = {}): GoogleReview => ({
  reviewId: "r1", starRating: "FIVE", comment: "Best fade I've had in years, Marcus took his time and it shows.",
  createTime: "2026-07-01T00:00:00Z", reviewer: { displayName: "John Smith" }, ...over,
});

const ctx = (over: Partial<PostContext> = {}): PostContext => ({
  businessName: "Unique Image Barber Salon", city: "Houston",
  services: ["Fade cut", "Beard trim"], reviews: [review()],
  bookingUrl: "https://example.com/book", websiteUrl: "https://example.com", ...over,
});

describe("resolveCallToAction", () => {
  it("prefers Book when there's a booking link", () => {
    expect(resolveCallToAction({ bookingUrl: "https://x.com/book" })).toEqual({ actionType: "BOOK", url: "https://x.com/book" });
  });

  it("falls back to Learn more rather than a Book button that goes nowhere", () => {
    expect(resolveCallToAction({ websiteUrl: "https://x.com" }).actionType).toBe("LEARN_MORE");
  });

  it("falls back to Call when there's no link at all", () => {
    expect(resolveCallToAction({})).toEqual({ actionType: "CALL" });
  });
});

describe("pickShowcaseReview", () => {
  it("picks a five-star review with real text", () => {
    expect(pickShowcaseReview([review()])?.reviewId).toBe("r1");
  });

  it("won't showcase a low rating", () => {
    expect(pickShowcaseReview([review({ starRating: "TWO" })])).toBeNull();
  });

  it("won't showcase a rating with no words to quote", () => {
    expect(pickShowcaseReview([review({ comment: "" })])).toBeNull();
    expect(pickShowcaseReview([review({ comment: "Great" })])).toBeNull();
  });

  it("prefers the newest of equal ratings", () => {
    const out = pickShowcaseReview([
      review({ reviewId: "old", createTime: "2025-01-01T00:00:00Z" }),
      review({ reviewId: "new", createTime: "2026-07-01T00:00:00Z" }),
    ]);
    expect(out?.reviewId).toBe("new");
  });
});

describe("trimQuote", () => {
  it("leaves a short quote alone", () => {
    expect(trimQuote("Great cut")).toBe("Great cut");
  });

  it("cuts on a word boundary, not mid-word", () => {
    const out = trimQuote("a".repeat(50) + " " + "b".repeat(200), 100);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/b{5,}…$/);
  });

  it("collapses whitespace so a multi-line review doesn't break the post", () => {
    expect(trimQuote("great\n\n  cut")).toBe("great cut");
  });
});

describe("buildPostAngles", () => {
  it("leads with the review showcase and uses the first name only", () => {
    const a = buildPostAngles(ctx());
    expect(a[0].id).toBe("review-showcase");
    expect(a[0].summary).toContain("John");
    expect(a[0].summary).not.toContain("John Smith");
    expect(a[0].quotesReview).toBe(true);
  });

  it("gives every angle a reason grounded in the profile", () => {
    for (const angle of buildPostAngles(ctx())) expect(angle.reason.length).toBeGreaterThan(10);
  });

  it("omits an angle rather than inventing content for it", () => {
    // No services listed means no service post — not a made-up one.
    const a = buildPostAngles(ctx({ services: [], reviews: [] }));
    expect(a.map((x) => x.id)).not.toContain("service-spotlight");
    expect(a.map((x) => x.id)).not.toContain("review-showcase");
  });

  it("builds a holiday post from hours already set", () => {
    const a = buildPostAngles(ctx({ upcomingHoliday: { name: "Thanksgiving", date: "2026-11-26", closed: true } }));
    const h = a.find((x) => x.id === "holiday-hours")!;
    expect(h.summary).toMatch(/closed on Thursday, November 26/);
  });

  it("produces posts that pass validation", () => {
    for (const angle of buildPostAngles(ctx())) {
      expect(validatePost(angle.summary, angle.callToAction).ok, angle.id).toBe(true);
    }
  });
});

describe("validatePost", () => {
  const cta = { actionType: "BOOK" as const, url: "https://example.com/book" };

  it("accepts a normal post", () => {
    expect(validatePost("Come and see us this week for a fresh fade before the weekend.", cta).ok).toBe(true);
  });

  it("rejects an empty post and an over-long one", () => {
    expect(validatePost("", cta).ok).toBe(false);
    expect(validatePost("a".repeat(POST_MAX + 1), cta).ok).toBe(false);
  });

  it("rejects a button with no link, or an insecure one", () => {
    expect(validatePost("Book with us this week for a fresh cut.", { actionType: "BOOK" }).ok).toBe(false);
    expect(validatePost("Book with us this week for a fresh cut.", { actionType: "BOOK", url: "http://x.com" }).ok).toBe(false);
  });

  it("allows Call without a link, since there's nowhere for it to go", () => {
    expect(validatePost("Give us a ring to book your next appointment.", { actionType: "CALL" }).ok).toBe(true);
  });

  it("warns about a very short post without blocking it", () => {
    const r = validatePost("New cuts", cta);
    expect(r.ok).toBe(true);
    expect(r.issues.some((i) => i.level === "warning")).toBe(true);
  });

  it("rejects HTML", () => {
    expect(validatePost("<b>Book now</b> for a fresh cut this weekend", cta).ok).toBe(false);
  });
});

describe("pickPostPhoto", () => {
  const p = (url: string, category: string | null, createTime?: string) => ({ url, category, createTime });

  it("prefers work photos for a review post and the storefront for hours", () => {
    const lib = [p("https://x/1", "EXTERIOR"), p("https://x/2", "AT_WORK"), p("https://x/3", "INTERIOR")];
    expect(pickPostPhoto(lib, "review")).toBe("https://x/2");
    // Hours are about turning up at a door, so the door wins.
    expect(pickPostPhoto(lib, "hours")).toBe("https://x/1");
  });

  it("walks down the preference order when the best category is missing", () => {
    expect(pickPostPhoto([p("https://x/9", "INTERIOR")], "review")).toBe("https://x/9");
  });

  it("falls back to the newest photo when no category matches", () => {
    const lib = [p("https://x/old", "MENU", "2026-01-01T00:00:00Z"), p("https://x/new", "MENU", "2026-07-01T00:00:00Z")];
    expect(pickPostPhoto(lib, "service")).toBe("https://x/new");
  });

  it("picks the newest within a category, not just the first", () => {
    const lib = [
      p("https://x/a", "AT_WORK", "2026-01-01T00:00:00Z"),
      p("https://x/b", "AT_WORK", "2026-06-01T00:00:00Z"),
    ];
    expect(pickPostPhoto(lib, "review")).toBe("https://x/b");
  });

  it("returns null rather than a bad image", () => {
    // Google fetches this URL itself, so a non-https one fails at their end and
    // takes the whole post with it.
    expect(pickPostPhoto([], "review")).toBeNull();
    expect(pickPostPhoto([p("http://insecure/1", "AT_WORK")], "review")).toBeNull();
  });
});

describe("buildPostAngles — photos", () => {
  const ctx = (over: any = {}) => ({
    businessName: "Test Shop",
    city: "Houston",
    services: ["Fade cut"],
    reviews: [],
    websiteUrl: "https://example.com",
    ...over,
  });

  it("suggests a photo on each angle when the listing has one", () => {
    const angles = buildPostAngles(ctx({ photos: [{ url: "https://x/1", category: "AT_WORK" }] }));
    expect(angles.length).toBeGreaterThan(0);
    for (const a of angles) expect(a.photoUrl).toBe("https://x/1");
  });

  it("still builds angles for a listing with no photos", () => {
    const angles = buildPostAngles(ctx());
    expect(angles.length).toBeGreaterThan(0);
    expect(angles[0].photoUrl).toBeNull();
  });
});
