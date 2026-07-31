/**
 * Drafting replies to Google reviews.
 *
 * The first surface where we generate something rather than ask for it — and
 * the first that speaks publicly in the owner's voice, permanently, under their
 * business name. So the rules are stricter than for a form:
 *
 *  • Nothing is ever published without the owner reading it. The draft is a
 *    starting point, not an outbox.
 *  • The draft may not invent facts. A reply thanking someone for enjoying a
 *    service they never mentioned is a lie the business gets blamed for.
 *  • Low-rated reviews are handled differently and flagged for editing. A warm
 *    canned reply under a one-star review is worse than no reply at all, and
 *    apologies that admit specific fault are commitments the owner may not want
 *    to make in public.
 *  • First names only. The review already shows the reviewer's name; repeating
 *    a full name in marketing-adjacent copy is a step further than they agreed
 *    to.
 *
 * The pure parts here are separated from the model call so the selection,
 * fallback and validation can be tested without a network.
 */

export type StarRating = "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE" | string;

export interface GoogleReview {
  reviewId?: string;
  name?: string;
  starRating?: StarRating;
  comment?: string;
  createTime?: string;
  reviewer?: { displayName?: string };
  reviewReply?: { comment?: string; updateTime?: string };
}

export interface ReviewDraft {
  reviewId: string;
  reviewName: string;
  reviewer: string;
  stars: number;
  comment: string;
  createTime?: string;
  draft: string;
  /** True when a human really needs to rewrite this before it goes out. */
  needsCareful: boolean;
  source: "generated" | "template";
}

const STAR_VALUE: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

export const starsOf = (r: GoogleReview): number => STAR_VALUE[String(r.starRating)] ?? 0;

/** Only ever the first name — see the note at the top of this file. */
export function firstName(review: GoogleReview): string {
  const full = review.reviewer?.displayName?.trim();
  if (!full) return "there";
  const first = full.split(/\s+/)[0];
  return first.length > 1 ? first : full;
}

/** Reviews with no reply yet, newest first. */
export function selectUnanswered(reviews: GoogleReview[]): GoogleReview[] {
  return reviews
    .filter((r) => !r.reviewReply?.comment)
    .sort((a, b) => String(b.createTime || "").localeCompare(String(a.createTime || "")));
}

/**
 * Deterministic fallback, used when the model is unavailable or its output
 * fails validation.
 *
 * Deliberately generic. A template can't reference anything specific in the
 * review without risking inventing it, so it thanks and invites rather than
 * pretending to be personal — which is still better than the silence the audit
 * keeps finding.
 */
export function buildFallbackDraft(review: GoogleReview): string {
  const name = firstName(review);
  const stars = starsOf(review);

  if (stars >= 4) {
    return `Thanks so much, ${name} — we really appreciate you taking the time to leave this. We look forward to seeing you again.`;
  }
  if (stars === 3) {
    return `Thanks for the honest feedback, ${name}. We'd like to hear more about what would have made the visit better — please get in touch so we can put it right.`;
  }
  return `Thank you for letting us know, ${name}. This isn't the experience we want anyone to have, and we'd like to understand what happened — please contact us directly so we can make it right.`;
}

const FORBIDDEN = [
  /\bas an ai\b/i,
  /\bi'?m an? (?:ai|language model)\b/i,
  /\[[^\]]+\]/,      // [Name], [Service] — an unfilled placeholder
  /\{\{|\}\}/,       // {{name}}
  /\bhere'?s? (?:a|the) (?:draft|reply)\b/i,
];

export interface DraftValidation {
  ok: boolean;
  reason?: string;
}

/**
 * Reject drafts that would embarrass the owner if published as-is.
 *
 * Length is capped well below Google's 4,096 limit: a long reply reads as
 * defensive, and the ones that work are two or three sentences.
 */
export function validateDraft(text: string): DraftValidation {
  const t = (text || "").trim();
  if (!t) return { ok: false, reason: "empty" };
  if (t.length < 15) return { ok: false, reason: "too short to be a real reply" };
  if (t.length > 700) return { ok: false, reason: "too long" };
  for (const p of FORBIDDEN) {
    if (p.test(t)) return { ok: false, reason: `contains ${p.source}` };
  }
  return { ok: true };
}

/** The instruction given to the model. Exported so it's reviewable and testable. */
export function draftPrompt(review: GoogleReview, businessName: string): string {
  const stars = starsOf(review);
  const tone =
    stars >= 4
      ? "Warm and appreciative. Thank them for something they actually mentioned."
      : stars === 3
      ? "Gracious and open. Acknowledge the gap without being defensive, and invite them to get in touch."
      : "Calm and non-defensive. Acknowledge their experience without admitting specific fault, and invite them to contact the business directly.";

  return [
    `You are drafting a public reply from ${businessName}, a business replying to a customer review on Google.`,
    "",
    `Review (${stars} stars) from ${firstName(review)}:`,
    `"""${(review.comment || "(no text, rating only)").slice(0, 1200)}"""`,
    "",
    "Write the reply. Rules:",
    `- ${tone}`,
    "- Two or three sentences. Under 400 characters.",
    "- Refer only to things the review itself mentions. Never invent a service, a staff member, an offer, or a detail.",
    "- Never promise a refund, discount, or compensation.",
    "- Never admit legal fault or blame a named employee.",
    `- Use the reviewer's first name (${firstName(review)}) at most once. Never their full name.`,
    "- Plain sentences. No emoji, no hashtags, no marketing slogans.",
    "- Output only the reply text, with no preamble, quotes, or explanation.",
  ].join("\n");
}

/**
 * Generate a draft, falling back to the template on any failure.
 *
 * Never throws: a missing API key, a model outage or an output that fails
 * validation all degrade to the template. The owner should always have
 * something to edit — an empty box is how "reply to your reviews" turns back
 * into a task nobody does.
 */
export async function draftReply(
  review: GoogleReview,
  businessName: string
): Promise<{ draft: string; source: "generated" | "template" }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { draft: buildFallbackDraft(review), source: "template" };

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: draftPrompt(review, businessName),
    });
    const text = (res.text || "").trim().replace(/^["']|["']$/g, "");
    const check = validateDraft(text);
    if (!check.ok) {
      console.warn("[review-reply] draft rejected:", check.reason);
      return { draft: buildFallbackDraft(review), source: "template" };
    }
    return { draft: text, source: "generated" };
  } catch (e: any) {
    console.warn("[review-reply] generation failed:", e?.message);
    return { draft: buildFallbackDraft(review), source: "template" };
  }
}

/** Assemble drafts for every unanswered review. */
export async function draftRepliesFor(
  reviews: GoogleReview[],
  businessName: string,
  limit = 10
): Promise<ReviewDraft[]> {
  const pending = selectUnanswered(reviews).slice(0, limit);

  return Promise.all(
    pending.map(async (r) => {
      const { draft, source } = await draftReply(r, businessName);
      const stars = starsOf(r);
      return {
        reviewId: r.reviewId || String(r.name || "").split("/").pop() || "",
        reviewName: r.name || "",
        reviewer: firstName(r),
        stars,
        comment: r.comment || "",
        createTime: r.createTime,
        draft,
        // Three stars and below is where a wrong reply does real damage.
        needsCareful: stars > 0 && stars <= 3,
        source,
      };
    })
  );
}
