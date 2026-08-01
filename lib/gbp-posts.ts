import { firstName, starsOf, type GoogleReview } from "@/lib/gbp-review-replies";

/**
 * Google Posts.
 *
 * Worth six points on the audit and the least valuable write surface in the
 * set — posts drive engagement, not ranking, and they age out of the feed
 * within about a week. That's worth saying plainly rather than selling: an
 * owner who fills in attributes once has changed something permanent, and an
 * owner who posts has started a treadmill.
 *
 * What makes them worth building anyway is that everything else already built
 * gives them something true to say. A post drawn from a real five-star review,
 * a service the shop actually lists, or holiday hours already set is grounded.
 * A post invented from nothing is the marketing filler that trains customers to
 * ignore the feed.
 *
 * Pure — no network.
 */

export type PostAngleKind = "review" | "service" | "hours";
export type CallToActionType = "BOOK" | "LEARN_MORE" | "CALL" | "SIGN_UP" | "ORDER" | "SHOP";

export interface PostCallToAction {
  actionType: CallToActionType;
  url?: string;
}

export interface PostAngle {
  id: string;
  kind: PostAngleKind;
  /** Why this post exists — shown to the owner, not published. */
  reason: string;
  summary: string;
  callToAction: PostCallToAction;
  /** Set when the copy quotes a customer, so the UI can warn appropriately. */
  quotesReview?: boolean;
  /** Suggested photo for this angle. The owner can change or clear it. */
  photoUrl?: string | null;
}

/**
 * A photo already on the profile, offered as the post's image.
 *
 * Posts are text-only today, which reads thin in a feed where competitors post
 * pictures. Google's LocalPost media accepts sourceUrl and nothing else — it
 * fetches the URL itself — so the practical source is a photo the owner has
 * already published, which has the useful side effect that nothing new is put
 * on their listing without them choosing it.
 */
export interface PostPhoto {
  url: string;
  category?: string | null;
  createTime?: string | null;
}

/** Categories worth putting on a post, best first. */
const PHOTO_PREFERENCE: Record<PostAngleKind, string[]> = {
  // A review is about the work, so lead with the work.
  review: ["AT_WORK", "TEAMS", "INTERIOR", "COVER", "EXTERIOR"],
  service: ["AT_WORK", "INTERIOR", "COVER", "TEAMS", "EXTERIOR"],
  // Hours are about turning up at a door, so show the door.
  hours: ["EXTERIOR", "COVER", "INTERIOR", "AT_WORK", "TEAMS"],
};

/**
 * Pick the photo that best fits an angle.
 *
 * Falls through the preference order, then to the newest photo of any category,
 * then to nothing — a post without an image is still a post, and picking a
 * random unsuitable picture is worse than picking none.
 */
export function pickPostPhoto(photos: PostPhoto[], kind: PostAngleKind): string | null {
  const usable = photos.filter((p) => p.url && /^https:\/\//i.test(p.url));
  if (!usable.length) return null;

  const newestFirst = (a: PostPhoto, b: PostPhoto) =>
    String(b.createTime || "").localeCompare(String(a.createTime || ""));

  for (const category of PHOTO_PREFERENCE[kind]) {
    const match = usable.filter((p) => p.category === category).sort(newestFirst)[0];
    if (match) return match.url;
  }
  return [...usable].sort(newestFirst)[0]?.url ?? null;
}

export const POST_MAX = 1500;

export interface PostIssue {
  level: "error" | "warning";
  message: string;
}

export function validatePost(summary: string, cta: PostCallToAction): { ok: boolean; issues: PostIssue[] } {
  const issues: PostIssue[] = [];
  const text = (summary || "").trim();

  if (!text) issues.push({ level: "error", message: "Write something for the post." });
  if (text.length > POST_MAX) {
    issues.push({ level: "error", message: `${text.length} characters — Google allows ${POST_MAX}.` });
  }
  if (text.length > 0 && text.length < 40) {
    issues.push({ level: "warning", message: "Very short. A post this brief rarely earns a click." });
  }
  if (/<\/?[a-z][\s\S]*>/i.test(text)) {
    issues.push({ level: "error", message: "Remove the HTML — posts are plain text." });
  }

  // Every action type except CALL needs somewhere to go.
  if (cta.actionType !== "CALL") {
    if (!cta.url) {
      issues.push({ level: "error", message: "This button needs a link." });
    } else if (!/^https:\/\//i.test(cta.url)) {
      issues.push({ level: "error", message: "The button link must start with https://" });
    }
  }

  return { ok: !issues.some((i) => i.level === "error"), issues };
}

/**
 * Choose the button.
 *
 * A Book button that goes nowhere is worse than a Learn more that does, so this
 * falls back rather than producing a broken call to action — which is why the
 * booking-link feature had to exist before this one.
 */
export function resolveCallToAction(opts: {
  bookingUrl?: string | null;
  websiteUrl?: string | null;
}): PostCallToAction {
  if (opts.bookingUrl) return { actionType: "BOOK", url: opts.bookingUrl };
  if (opts.websiteUrl) return { actionType: "LEARN_MORE", url: opts.websiteUrl };
  return { actionType: "CALL" };
}

export interface PostContext {
  businessName: string;
  city?: string | null;
  services: string[];
  reviews: GoogleReview[];
  bookingUrl?: string | null;
  websiteUrl?: string | null;
  /** Upcoming holiday already set on the profile, if any. */
  upcomingHoliday?: { name: string; date: string; closed: boolean; openTime?: string; closeTime?: string } | null;
  /** Photos already on the listing, offered as the post image. */
  photos?: PostPhoto[];
}

/** The best review to feature: highest rating, with actual text, most recent. */
export function pickShowcaseReview(reviews: GoogleReview[]): GoogleReview | null {
  const candidates = reviews
    .filter((r) => starsOf(r) >= 4 && (r.comment || "").trim().length >= 25)
    .sort((a, b) => starsOf(b) - starsOf(a) || String(b.createTime || "").localeCompare(String(a.createTime || "")));
  return candidates[0] ?? null;
}

/** Trim a quote to something postable without cutting mid-word. */
export function trimQuote(comment: string, max = 180): string {
  const clean = comment.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:]$/, "") + "…";
}

/**
 * Build the candidate posts.
 *
 * Each is grounded in something already on the profile. Where there's nothing
 * to draw on, the angle is omitted rather than filled with invention.
 */
export function buildPostAngles(ctx: PostContext): PostAngle[] {
  const cta = resolveCallToAction(ctx);
  const photos = ctx.photos ?? [];
  const angles: PostAngle[] = [];

  const review = pickShowcaseReview(ctx.reviews);
  if (review) {
    const name = firstName(review);
    angles.push({
      id: "review-showcase",
      kind: "review",
      reason: `From ${name}'s ${starsOf(review)}-star review`,
      quotesReview: true,
      summary: `"${trimQuote(review.comment || "")}" — ${name}\n\nThank you ${name}. If you're due a visit, we'd love to see you.`,
      callToAction: cta,
      photoUrl: pickPostPhoto(photos, "review"),
    });
  }

  if (ctx.services.length) {
    const service = ctx.services[0];
    angles.push({
      id: "service-spotlight",
      kind: "service",
      reason: `You list ${ctx.services.length} service${ctx.services.length === 1 ? "" : "s"} on your profile`,
      summary: `${service} at ${ctx.businessName}${ctx.city ? ` in ${ctx.city}` : ""}. Book a time that suits you.`,
      callToAction: cta,
      photoUrl: pickPostPhoto(photos, "service"),
    });
  }

  if (ctx.upcomingHoliday) {
    const h = ctx.upcomingHoliday;
    const when = new Date(`${h.date}T00:00:00Z`).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", timeZone: "UTC",
    });
    angles.push({
      id: "holiday-hours",
      kind: "hours",
      reason: `You've set hours for ${h.name}`,
      summary: h.closed
        ? `We'll be closed on ${when} for ${h.name}. Book ahead so you're not left waiting.`
        : `${h.name} hours: we're open ${h.openTime}–${h.closeTime} on ${when}. Book ahead — these days fill up.`,
      callToAction: cta,
      photoUrl: pickPostPhoto(photos, "hours"),
    });
  }

  return angles;
}
