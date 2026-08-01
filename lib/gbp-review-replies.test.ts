import { describe, it, expect } from "vitest";
import {
  selectUnanswered,
  firstName,
  starsOf,
  buildFallbackDraft,
  validateDraft,
  draftPrompt,
  type GoogleReview,
} from "./gbp-review-replies";

const review = (over: Partial<GoogleReview> = {}): GoogleReview => ({
  reviewId: "r1",
  name: "accounts/1/locations/2/reviews/r1",
  starRating: "FIVE",
  comment: "Best fade in Houston, Marcus took his time.",
  createTime: "2026-07-01T00:00:00Z",
  reviewer: { displayName: "John Smith" },
  ...over,
});

describe("selectUnanswered", () => {
  it("skips reviews that already have a reply", () => {
    const out = selectUnanswered([
      review({ reviewId: "a", reviewReply: { comment: "Thanks!" } }),
      review({ reviewId: "b" }),
    ]);
    expect(out.map((r) => r.reviewId)).toEqual(["b"]);
  });

  it("puts the newest first, so the freshest goes out soonest", () => {
    const out = selectUnanswered([
      review({ reviewId: "old", createTime: "2026-01-01T00:00:00Z" }),
      review({ reviewId: "new", createTime: "2026-07-01T00:00:00Z" }),
    ]);
    expect(out.map((r) => r.reviewId)).toEqual(["new", "old"]);
  });
});

describe("firstName", () => {
  it("uses the first name only", () => {
    // The reply is public; repeating a full name goes further than the
    // reviewer agreed to.
    expect(firstName(review({ reviewer: { displayName: "John Smith" } }))).toBe("John");
  });

  it("falls back gracefully with no name", () => {
    expect(firstName(review({ reviewer: {} }))).toBe("there");
    expect(firstName(review({ reviewer: { displayName: "  " } }))).toBe("there");
  });

  it("keeps a single-character name whole rather than truncating to nothing", () => {
    expect(firstName(review({ reviewer: { displayName: "X" } }))).toBe("X");
  });
});

describe("buildFallbackDraft", () => {
  it("thanks a happy reviewer by first name", () => {
    const d = buildFallbackDraft(review({ starRating: "FIVE" }));
    expect(d).toContain("John");
    expect(d).toMatch(/thanks/i);
  });

  it("does not thank someone for a one-star review", () => {
    // The failure mode that matters: a warm canned reply under a bad review.
    const d = buildFallbackDraft(review({ starRating: "ONE" }));
    expect(d).not.toMatch(/look forward to seeing you again/i);
    expect(d).toMatch(/isn't the experience/i);
  });

  it("invites a three-star reviewer to talk rather than celebrating", () => {
    const d = buildFallbackDraft(review({ starRating: "THREE" }));
    expect(d).toMatch(/feedback|better|put it right/i);
  });

  it("never promises a refund or discount at any rating", () => {
    for (const s of ["ONE", "TWO", "THREE", "FOUR", "FIVE"]) {
      const d = buildFallbackDraft(review({ starRating: s }));
      expect(d, s).not.toMatch(/refund|discount|free|compensat/i);
    }
  });

  it("is generic on purpose — it can't reference the review without risking inventing it", () => {
    const d = buildFallbackDraft(review({ comment: "Marcus gave me a great fade" }));
    expect(d).not.toMatch(/Marcus|fade/);
  });
});

describe("validateDraft", () => {
  it("accepts a normal reply", () => {
    expect(validateDraft("Thanks so much, John — see you next time.").ok).toBe(true);
  });

  it("rejects empty and near-empty output", () => {
    expect(validateDraft("").ok).toBe(false);
    expect(validateDraft("   ").ok).toBe(false);
    expect(validateDraft("Thanks!").ok).toBe(false);
  });

  it("rejects unfilled placeholders", () => {
    // Publishing "Thanks, [Name]" under a business's name is the exact failure
    // this check exists for.
    expect(validateDraft("Thanks so much, [Name], see you soon!").ok).toBe(false);
    expect(validateDraft("Thanks so much, {{name}}, see you soon!").ok).toBe(false);
  });

  it("rejects model preamble leaking into the reply", () => {
    expect(validateDraft("Here's a draft reply: thanks so much for coming in!").ok).toBe(false);
    expect(validateDraft("As an AI, I'd say thank you for the kind words here.").ok).toBe(false);
  });

  it("rejects an essay", () => {
    expect(validateDraft("a".repeat(800)).ok).toBe(false);
  });
});

describe("draftPrompt", () => {
  it("forbids inventing details, promising money, and blaming staff", () => {
    const p = draftPrompt(review(), "Unique Image Barber Salon");
    expect(p).toMatch(/Never invent/i);
    expect(p).toMatch(/Never promise a refund/i);
    expect(p).toMatch(/Never admit legal fault or blame a named employee/i);
  });

  it("shifts tone by rating rather than using one voice for everything", () => {
    expect(draftPrompt(review({ starRating: "FIVE" }), "X")).toMatch(/Warm and appreciative/);
    expect(draftPrompt(review({ starRating: "ONE" }), "X")).toMatch(/Calm and non-defensive/);
    expect(draftPrompt(review({ starRating: "THREE" }), "X")).toMatch(/Gracious and open/);
  });

  it("passes the first name only into the prompt", () => {
    const p = draftPrompt(review({ reviewer: { displayName: "John Smith" } }), "X");
    expect(p).toContain("John");
    expect(p).not.toContain("John Smith");
  });

  it("truncates a very long review rather than sending it whole", () => {
    const p = draftPrompt(review({ comment: "x".repeat(5000) }), "X");
    expect(p.length).toBeLessThan(3000);
  });

  it("handles a rating-only review with no text", () => {
    const p = draftPrompt(review({ comment: undefined }), "X");
    expect(p).toMatch(/rating only/i);
  });
});

describe("starsOf", () => {
  it("maps Google's enum to numbers", () => {
    expect(starsOf(review({ starRating: "FIVE" }))).toBe(5);
    expect(starsOf(review({ starRating: "ONE" }))).toBe(1);
  });

  it("returns 0 for an unrecognised rating instead of guessing", () => {
    expect(starsOf(review({ starRating: "STAR_RATING_UNSPECIFIED" }))).toBe(0);
  });
});
