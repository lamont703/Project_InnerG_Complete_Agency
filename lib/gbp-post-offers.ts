import { trimEventTitle, type GDate, type LocalPostEvent } from "@/lib/gbp-post-events";

/**
 * Offer posts.
 *
 * Worth noting the contrast with the description, because the rules are
 * opposite and getting them the wrong way round is how listings get suspended:
 * prices, discounts and promotional offers are FORBIDDEN in the business
 * description (see lib/gbp-description.ts) and are exactly what this post type
 * is for. Google gives offers their own surface so they don't leak into the
 * parts of a profile that are supposed to be durable facts.
 *
 * An OFFER post needs both an `offer` object and an `event` object — the event
 * carries the offer's name and the window it runs for. Google's docs are
 * explicit: "Event information. Required for topic types EVENT and OFFER."
 *
 * TWO RULES THIS MODULE ENFORCES, both learned from what goes wrong:
 *
 *  1. We never invent the offer. Every other post type here is drafted from
 *     something already on the profile — a real review, a listed service. A
 *     discount is money out of the owner's till, and no amount of context
 *     entitles us to pick a number. What we supply is structures with the
 *     amount left blank.
 *  2. Every offer ends. Google needs an end date anyway, but the product
 *     reason is stronger: an open-ended offer is one the owner forgets, and
 *     then either honours forever or withdraws and disappoints someone
 *     standing at the counter holding a phone.
 *
 * Pure — no network.
 */

export interface LocalPostOffer {
  couponCode?: string;
  redeemOnlineUrl?: string;
  termsConditions?: string;
}

export interface OfferDraft {
  /** The headline, e.g. "$5 off your first visit". Becomes the event title. */
  title: string;
  /** ISO date the offer opens. */
  startDate: string;
  /** ISO date it closes. Required — see the note above. */
  endDate: string;
  couponCode?: string | null;
  redeemOnlineUrl?: string | null;
  termsConditions?: string | null;
}

export const OFFER_TITLE_MAX = 58;
export const TERMS_MAX = 5000;
/** Beyond this an "offer" is just pricing, and it stops reading as a reason to come in now. */
export const OFFER_LONG_DAYS = 90;

export interface OfferIssue {
  level: "error" | "warning";
  field: "title" | "dates" | "couponCode" | "redeemOnlineUrl" | "termsConditions";
  message: string;
}

const isoRe = /^\d{4}-\d{2}-\d{2}$/;

const toDate = (iso: string): Date | null => {
  if (!isoRe.test((iso || "").trim())) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const gdate = (iso: string): GDate => {
  const [y, m, d] = iso.split("-").map(Number);
  return { year: y, month: m, day: d };
};

/**
 * Check an offer before it reaches a public listing.
 *
 * Errors block. Warnings are the ones an owner should read and may reasonably
 * ignore — missing terms is the big one: Google displays them, and an offer
 * with no conditions is one that has to be honoured exactly as written.
 */
export function validateOffer(draft: OfferDraft, now: Date = new Date()): { ok: boolean; issues: OfferIssue[] } {
  const issues: OfferIssue[] = [];
  const title = (draft.title || "").trim();

  if (!title) {
    issues.push({ level: "error", field: "title", message: "Give the offer a name — this is what customers see." });
  } else if (title.length > OFFER_TITLE_MAX) {
    issues.push({
      level: "error",
      field: "title",
      message: `${title.length} characters — Google shows ${OFFER_TITLE_MAX}.`,
    });
  }

  const start = toDate(draft.startDate);
  const end = toDate(draft.endDate);

  if (!start) {
    issues.push({ level: "error", field: "dates", message: "When does the offer start?" });
  }
  if (!end) {
    // Not a formality. An offer with no end is one nobody remembers to withdraw.
    issues.push({ level: "error", field: "dates", message: "Every offer needs an end date." });
  }

  if (start && end) {
    if (end.getTime() < start.getTime()) {
      issues.push({ level: "error", field: "dates", message: "The offer ends before it starts." });
    } else {
      const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
      if (days > OFFER_LONG_DAYS) {
        issues.push({
          level: "warning",
          field: "dates",
          message: `${days} days is long for an offer — past about ${OFFER_LONG_DAYS} it reads as your normal price rather than a reason to come in now.`,
        });
      }
    }

    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (end.getTime() < today.getTime()) {
      issues.push({ level: "error", field: "dates", message: "That offer has already expired." });
    }
  }

  const code = (draft.couponCode || "").trim();
  if (code) {
    if (code.length > 58) {
      issues.push({ level: "error", field: "couponCode", message: "That code is too long." });
    } else if (/\s/.test(code)) {
      issues.push({
        level: "warning",
        field: "couponCode",
        message: "Codes with spaces get mistyped. One word is safer.",
      });
    }
  }

  const url = (draft.redeemOnlineUrl || "").trim();
  if (url && !/^https:\/\//i.test(url)) {
    issues.push({ level: "error", field: "redeemOnlineUrl", message: "The redeem link must start with https://" });
  }

  const terms = (draft.termsConditions || "").trim();
  if (!terms) {
    issues.push({
      level: "warning",
      field: "termsConditions",
      message: "No terms set. Google shows this offer as written, so anything you haven't excluded — new customers only, one per visit, not with other offers — you've agreed to.",
    });
  } else if (terms.length > TERMS_MAX) {
    issues.push({ level: "error", field: "termsConditions", message: `Terms are ${terms.length} characters — the limit is ${TERMS_MAX}.` });
  }

  return { ok: !issues.some((i) => i.level === "error"), issues };
}

/**
 * Build the pair Google needs: the offer, and the event that carries its name
 * and window. They're returned together because sending one without the other
 * is rejected, and nothing should have to remember that at the call site.
 */
export function toLocalPostOffer(draft: OfferDraft): { event: LocalPostEvent; offer: LocalPostOffer } {
  const event: LocalPostEvent = {
    title: trimEventTitle(draft.title, OFFER_TITLE_MAX),
    schedule: {
      startDate: gdate(draft.startDate),
      // An offer runs for whole days — nobody expects a discount to lapse at
      // 4pm, and Google needs the times regardless.
      startTime: { hours: 0, minutes: 0 },
      endDate: gdate(draft.endDate),
      endTime: { hours: 23, minutes: 59 },
    },
  };

  const offer: LocalPostOffer = {};
  const code = (draft.couponCode || "").trim();
  const url = (draft.redeemOnlineUrl || "").trim();
  const terms = (draft.termsConditions || "").trim();
  if (code) offer.couponCode = code;
  if (url) offer.redeemOnlineUrl = url;
  if (terms) offer.termsConditions = terms;

  return { event, offer };
}

export interface OfferStarter {
  id: string;
  label: string;
  /** The headline, with the amount left for the owner. */
  title: string;
  /** Body copy for the post. */
  summary: string;
  terms: string;
  /** Why this one is worth running — shown to the owner, not published. */
  reason: string;
  days: number;
}

/**
 * Starter structures, not offers.
 *
 * Each leaves the amount blank on purpose. These are the shapes that work in
 * this trade — filling a quiet weekday, buying a first visit, paying for a
 * referral — and choosing between them is a business decision the owner is
 * qualified to make and we are not.
 */
export function offerStarters(businessName: string): OfferStarter[] {
  return [
    {
      id: "first-visit",
      label: "First visit",
      title: "__ off your first visit",
      summary: `New to ${businessName}? Take __ off your first visit. Book a time that suits you and mention the offer when you arrive.`,
      terms: "New customers only. One per person. Cannot be combined with other offers.",
      reason: "Buys a first appointment — the hardest one to win and the one that decides whether they come back",
      days: 30,
    },
    {
      id: "quiet-weekday",
      label: "Quiet weekday",
      title: "__ off Tuesday to Thursday",
      summary: `Midweek is quieter, so it's cheaper: __ off any cut Tuesday to Thursday at ${businessName}. No waiting, no rush.`,
      terms: "Tuesday to Thursday only. Subject to availability. Cannot be combined with other offers.",
      reason: "Fills chairs that would otherwise sit empty, without discounting your busy days",
      days: 45,
    },
    {
      id: "referral",
      label: "Bring a friend",
      title: "Bring a friend, both get __ off",
      summary: `Bring someone with you to ${businessName} and you both take __ off. Book together or turn up together.`,
      terms: "Both visits must be on the same day. One per customer. Cannot be combined with other offers.",
      reason: "A referral costs you one discount and brings someone who already trusts the recommendation",
      days: 30,
    },
    {
      id: "package",
      label: "Two services",
      title: "Cut and beard trim for __",
      summary: `Cut and beard trim together for __ at ${businessName}. Book the pair and save on doing them separately.`,
      terms: "Both services in the same appointment. Subject to availability.",
      reason: "Raises what an average visit is worth rather than cutting the price of what they already buy",
      days: 60,
    },
  ];
}

/** Today and today + days, as ISO dates — the default window for a starter. */
export function defaultWindow(days: number, now: Date = new Date()): { startDate: string; endDate: string } {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const end = new Date(now.getTime() + days * 86_400_000);
  return { startDate: iso(now), endDate: iso(end) };
}
