import { starsOf, type GoogleReview } from "@/lib/gbp-review-replies";

/**
 * The pure half of Autopilot: what it may touch, and when. Tested in
 * rules.test.ts. lib/autopilot/run.ts does the work.
 *
 * Decided 2026-09-29 with the product owner:
 *  - Replies to 4-5 star reviews publish at once. Below four stars, never.
 *  - One post a week, from facts already on the profile, scheduled a day
 *    ahead with a heads-up so the owner can cancel.
 *  - A weekly report, and a daily digest of what it did.
 */

export const AUTO_REPLY_MIN_STARS = 4;
/** Older reviews are left alone: answering a year-old review the day Autopilot starts reads as automated. */
export const REPLY_LOOKBACK_DAYS = 30;
/** Per hourly run, so a backlog clears over a few hours instead of in one burst. */
export const REPLIES_PER_RUN = 5;
/** How far ahead a weekly post is scheduled — the owner's window to cancel it. */
export const POST_HEADS_UP_HOURS = 24;

export interface AutopilotSettings {
  review_replies: boolean;
  weekly_posts: boolean;
  weekly_report: boolean;
  post_weekday: number;
}

export const DEFAULT_SETTINGS: AutopilotSettings = { review_replies: true, weekly_posts: true, weekly_report: true, post_weekday: 2 };

/** Reviews Autopilot may answer now: 4-5 stars, unanswered, recent, never handled before. Newest first. */
export function selectAutoReplies(reviews: GoogleReview[], handled: Set<string>, now = new Date()): GoogleReview[] {
  const cutoff = now.getTime() - REPLY_LOOKBACK_DAYS * 86400_000;
  return reviews
    .filter((r) => r.name && !handled.has(r.name))
    .filter((r) => starsOf(r) >= AUTO_REPLY_MIN_STARS)
    .filter((r) => !r.reviewReply?.comment)
    .filter((r) => r.createTime && new Date(r.createTime).getTime() >= cutoff)
    .sort((a, b) => String(b.createTime).localeCompare(String(a.createTime)))
    .slice(0, REPLIES_PER_RUN);
}

const hoursSince = (iso: string | null | undefined, now: Date) => (iso ? (now.getTime() - new Date(iso).getTime()) / 3_600_000 : Infinity);

/** The weekly post: on their chosen weekday (UTC), from 15:00, once a week. */
export const isPostDue = (now: Date, weekday: number, lastPostAt: string | null) =>
  now.getUTCDay() === weekday && now.getUTCHours() >= 15 && hoursSince(lastPostAt, now) > 6 * 24;

/** The weekly report: Mondays from 14:00 UTC, once a week. */
export const isReportDue = (now: Date, lastReportAt: string | null) =>
  now.getUTCDay() === 1 && now.getUTCHours() >= 14 && hoursSince(lastReportAt, now) > 6 * 24;

/** The digest: from 23:00 UTC, at most once a day, and only when there's something in it. */
export const isDigestDue = (now: Date, lastDigestAt: string | null, somethingNew: boolean) =>
  somethingNew && now.getUTCHours() >= 23 && hoursSince(lastDigestAt, now) > 20;

// ── the weekly post ─────────────────────────────────────────────────────────

export interface PostFacts {
  businessName: string;
  category: string | null;
  services: string[];
  hours: string[];
  bookingUrl: string | null;
  /** A recent 5-star review, quoted without the reviewer's name. */
  praise: string | null;
  /** The last few posts, so this week's isn't a repeat. */
  recentPosts: string[];
}

/** The instruction to the model. Exported so it's reviewable and testable. */
export function postPrompt(f: PostFacts): string {
  return [
    `Write a short Google Business Profile post for ${f.businessName}${f.category ? `, a ${f.category.toLowerCase()}` : ""}.`,
    "",
    "FACTS YOU MAY USE — and nothing else:",
    f.services.length ? `- Services: ${f.services.slice(0, 12).join(", ")}` : null,
    f.hours.length ? `- Hours: ${f.hours.join("; ")}` : null,
    f.bookingUrl ? "- Customers can book online (the post will have a Book button)." : "- Customers can call to book (the post will have a Call button).",
    f.praise ? `- A recent five-star review said: "${f.praise.slice(0, 300)}"` : null,
    "",
    f.recentPosts.length ? `Recent posts, which this one must NOT repeat:\n${f.recentPosts.slice(0, 4).map((p) => `- ${p.slice(0, 200)}`).join("\n")}\n` : null,
    "Rules:",
    "- 40 to 90 words. Friendly and plain, like the owner talking to regulars.",
    "- Use only the facts above. Never invent a price, discount, offer, sale, event, date, staff name, or service.",
    "- No phone numbers, links, hashtags, or emoji — the button handles booking.",
    "- If you quote the review, don't name the reviewer.",
    "- Output only the post text.",
  ].filter((l) => l !== null).join("\n");
}

const POST_FORBIDDEN: [RegExp, string][] = [
  [/\$|\bUSD\b|\bdollars?\b/i, "mentions a price"],
  [/\d+\s*%|\bpercent\b/i, "mentions a percentage"],
  [/\b(discount|sale|coupon|promo|deal|off\b|free\b|specials?\b)/i, "makes an offer"],
  [/https?:\/\/|www\.|\.com\b/i, "contains a link"],
  [/\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/, "contains a phone number"],
  [/#\w/, "contains a hashtag"],
  [/\b(today only|this weekend|tomorrow|tonight|limited time|until \w+ \d)/i, "names a date or deadline"],
  [/\bas an ai\b|\[[^\]]+\]|\{\{/i, "isn't a finished post"],
];

/**
 * Reject a post that could put a promise the owner never made under their
 * name. Stricter than the review-reply check on purpose: a post goes to
 * everyone who finds the profile, and an invented offer is one customers try
 * to redeem.
 */
export function validateAutoPost(text: string): { ok: boolean; reason?: string } {
  const t = (text || "").trim();
  const words = t.split(/\s+/).filter(Boolean).length;
  if (words < 25) return { ok: false, reason: "too short" };
  if (words > 140) return { ok: false, reason: "too long" };
  for (const [re, reason] of POST_FORBIDDEN) if (re.test(t)) return { ok: false, reason };
  return { ok: true };
}

/** When the model is unavailable or its post fails the check: safe, factual, and still worth posting. */
export function fallbackPost(f: PostFacts): string {
  const list = f.services.slice(0, 3);
  const what = list.length ? `for ${list.length > 1 ? `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}` : list[0]}` : "for your next visit";
  return [
    `Thinking about your next appointment? ${f.businessName} is ready ${what}.`,
    f.hours.length ? `We're open ${f.hours.slice(0, 2).join(" and ")}${f.hours.length > 2 ? ", and more days through the week" : ""}.` : null,
    f.bookingUrl ? "Tap Book to pick a time that works for you — we look forward to seeing you." : "Give us a call to pick a time that works for you — we look forward to seeing you.",
  ].filter(Boolean).join(" ");
}
