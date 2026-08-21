import type { DueClient } from "./queue";

/**
 * Drafts the rebooking message for one client.
 *
 * These are DRAFTS shown in the admin queue for a human to read, edit and send.
 * Nothing in v1 sends automatically, and the copy is written on that assumption
 * — it is a barber's own words, not a marketing template.
 *
 * Three rules the copy follows, each of which exists because breaking it makes
 * the message worse in a specific way:
 *
 * 1. NEVER STATE THE CADENCE BACK TO THEM. "You usually come every 11 days" is
 *    accurate and reads as surveillance. The rhythm decides the timing; it does
 *    not go in the text.
 * 2. A LATE CLIENT AND AN ON-TIME CLIENT GET DIFFERENT MESSAGES. Sending
 *    "you're due" to someone three months gone reads as though nobody noticed
 *    they left, which is the opposite of the point.
 * 3. NO DISCOUNT BY DEFAULT. Most of these people were coming anyway; a coupon
 *    on a routine reminder trains a discount habit and costs margin on visits
 *    that needed no incentive.
 */

const SMS_SOFT_LIMIT = 320;

/**
 * Where a rebooking message sends someone — the live checkout for the top
 * service, which carries 2,408 of the store's 2,998 orders.
 *
 * DELIBERATELY innergcomplete.com AND NOT shearquery.com. These are haircut
 * clients, not directory users; the two brands serve different audiences and
 * sending a chair client to the barber-facing product is the exact confusion
 * this whole workstream is trying to avoid. Verified published and reachable
 * on 2026-08-20 — if the product is ever unpublished this link 404s silently,
 * which is the failure mode to check first if replies stop.
 */
export const BOOKING_URL = "https://innergcomplete.com/products/the-straight-up-haircut";

export interface DraftMessages {
  sms: string;
  emailSubject: string;
  emailBody: string;
  /** True when SMS exceeds the two-segment soft limit and needs trimming. */
  smsTooLong: boolean;
}

/**
 * A discount attached to this specific message, if one was issued.
 *
 * Optional on purpose, and absent for most messages. Routine rebooking carries
 * no discount — clients under 60 days late return 66-82% of the time on their
 * own, so a code there pays people to do what they had already decided to do.
 */
export interface AttachedOffer {
  code: string;
  percentOff: number;
  expiresAt: string;
}

/**
 * An offer the client could have, but has not earned yet.
 *
 * Shown to a lapsed client who is NOT subscribed to texts. The rebooking
 * message is the most attention this person will give us all year, and sending
 * it without mentioning that 20% is sitting there spends that attention for
 * nothing — while a separate email asks them the same thing in isolation.
 *
 * In practice this only ever renders in EMAIL. A client reachable by SMS is by
 * definition already subscribed, so there is nobody who both needs this nudge
 * and would receive it as a text.
 */
export interface OptInNudge {
  consentUrl: string;
  percentOff: number;
}

/** "Sat 30 Aug" — a date a person can act on, not an ISO string. */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

/**
 * The greeting name, or "there".
 *
 * THE PLACEHOLDER IS CHECKED BEFORE THE SPLIT, not after. queue.ts falls back
 * to "(no name)" when Shopify holds neither a first nor a last name, and
 * splitting that on whitespace yields "(no" — which passed a `!== "(no name)"`
 * guard and produced "Hey (no, it's Lamont…" in a message meant for a real
 * person. Caught by messages.test.ts.
 *
 * The final check is a whitelist rather than a blacklist of placeholders: a
 * token has to look like a name to be used as one, so the next placeholder
 * anyone invents degrades to "there" instead of being greeted.
 */
function firstName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed.toLowerCase() === "(no name)") return "there";
  const f = trimmed.split(/\s+/)[0];
  return /^[\p{L}][\p{L}'’-]*$/u.test(f) ? f : "there";
}

export function draftMessages(
  client: DueClient,
  bookingUrl: string,
  offer?: AttachedOffer | null,
  nudge?: OptInNudge | null,
): DraftMessages {
  const n = firstName(client.name);
  const reduced = client.note?.status === "reduced";
  const late = !reduced && (client.status === "overdue" || client.status === "at_risk");

  // A REDUCED CLIENT GETS NO URGENCY AND NO DISCOUNT.
  //
  // Amber told him she needs someone closer to home and asked to still be
  // welcome. "You're about due" and "been a minute, everything good?" both read
  // as though nobody listened — and a 20%-off countdown in reply reads as
  // haggling with someone who was being kind. This is an open door and nothing
  // more. Note that no note CONTENT is interpolated either: the status picks
  // the template, the words are code.
  if (reduced) {
    const sms =
      `Hey ${n}, it's Lamont. No pressure at all — just letting you know the door's ` +
      `open whenever you want to come through: ${bookingUrl}`;
    return {
      sms,
      emailSubject: `${n} — door's always open`,
      emailBody: [
        `Hey ${n},`,
        ``,
        `No pressure at all, just letting you know I'm here whenever you want to come through.`,
        ``,
        bookingUrl,
        ``,
        `— Lamont`,
        `Inner G Complete`,
      ].join("\n"),
      smsTooLong: sms.length > SMS_SOFT_LIMIT,
    };
  }

  // A client cannot be shown both — one has the code, the other is being told
  // how to get it.
  const showNudge = !offer && Boolean(nudge) && late;

  const offerSms = offer
    ? ` Here's ${offer.percentOff}% off if you use it by ${shortDate(offer.expiresAt)} — code ${offer.code}.`
    : showNudge
      ? ` Want ${nudge!.percentOff}% off? Say yes to texts: ${nudge!.consentUrl}`
      : "";

  const sms = late
    ? `Hey ${n}, it's Lamont. Been a minute since I had you in the chair — everything good? ` +
      `I've got space this week if you want to get lined back up: ${bookingUrl}${offerSms}`
    : `Hey ${n}, it's Lamont. You're about due — want me to get you on the books this week? ${bookingUrl}`;

  const emailSubject = late ? `${n}, been a minute` : `${n} — ready when you are`;

  const emailBody = late
    ? [
        `Hey ${n},`,
        ``,
        `It's been a while since I had you in the chair and I wanted to check in — hope everything's good on your end.`,
        ``,
        `Whenever you're ready, I've got space this week. You can grab a time here:`,
        bookingUrl,
        ``,
        ...(offer
          ? [
              `And here's ${offer.percentOff}% off to make it easy — use code ${offer.code} by ${shortDate(offer.expiresAt)}.`,
              ``,
            ]
          : showNudge
            ? [
                `One more thing — if you want me to text you when you're due, I'll send ${nudge!.percentOff}% off your next cut to your phone:`,
                nudge!.consentUrl,
                ``,
              ]
            : []),
        `— Lamont`,
        `Inner G Complete`,
      ].join("\n")
    : [
        `Hey ${n},`,
        ``,
        `Figured you'd be about ready for your next one. I've got openings this week if you want to get on the books.`,
        ``,
        bookingUrl,
        ``,
        `— Lamont`,
        `Inner G Complete`,
      ].join("\n");

  return { sms, emailSubject, emailBody, smsTooLong: sms.length > SMS_SOFT_LIMIT };
}
