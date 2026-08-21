/**
 * The words a client actually agrees to.
 *
 * Kept in one place, as data, because the exact text is copied into every
 * consent record as evidence — see the 20260820230000 migration. If this is
 * edited, existing records keep the wording they were shown, which is the whole
 * point.
 *
 * NOT LEGAL ADVICE, AND NOT A SUBSTITUTE FOR REVIEW. This is drafted around the
 * ordinary prior-express-written-consent requirements for marketing texts: who
 * is sending, that it is marketing, that agreeing is not a condition of
 * purchase, roughly how often, that carrier rates apply, and how to stop. A
 * lawyer should read it before it goes live. The FCC's one-to-one consent rule
 * is NOT in force — the Eleventh Circuit vacated it in Insurance Marketing
 * Coalition v. FCC on 2025-01-24 and the FCC removed the language — but that
 * changes nothing here, since this is one shop texting its own clients.
 *
 * The label is a short handle for grouping records, not a version to resolve
 * text from. Bump it whenever CONSENT_TEXT changes.
 */

export const CONSENT_TEXT_LABEL = "innerg-sms-2026-08";

export const BUSINESS_NAME = "Inner G Complete";

export const CONSENT_TEXT = [
  `I agree to receive text messages from ${BUSINESS_NAME} at the mobile number I provided,`,
  `including appointment reminders and messages about booking my next visit.`,
  ``,
  `Message frequency varies and will not usually exceed a few messages a month.`,
  `Message and data rates may apply.`,
  ``,
  `Agreeing is not a condition of buying anything.`,
  `I can stop the messages at any time by replying STOP, or get help by replying HELP.`,
].join("\n");

/** The confirming text. Their YES is what makes the consent real. */
export function confirmationSms(firstName: string): string {
  return (
    `${BUSINESS_NAME}: Hi ${firstName}, reply YES to confirm you want texts about booking ` +
    `your next cut. Msg & data rates may apply. Reply STOP to opt out, HELP for help.`
  );
}

/**
 * Sent once, after a YES.
 *
 * THE REWARD ARRIVES ON THE CHANNEL THEY JUST GAVE US, and that is the point of
 * paying it here rather than in the invitation email. The first text they ever
 * get is worth money, which is the most direct possible demonstration that the
 * channel is worth keeping — and it means the discount is earned by the opt-in
 * rather than handed out to everyone who was emailed.
 *
 * Note this does not make consent a condition of PURCHASE, which is the thing
 * the disclosure promises and the law cares about. Anyone can buy a haircut at
 * full price without ever giving a number; the offer rewards the opt-in, it
 * does not gate the product.
 */
export function welcomeSms(
  firstName: string,
  offer?: { code: string; percentOff: number; expiresAt: string } | null,
): string {
  const base = `${BUSINESS_NAME}: You're all set, ${firstName} — I'll text you when you're due.`;
  if (!offer) return `${base} Reply STOP any time to opt out.`;
  const by = new Date(offer.expiresAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
  return (
    `${base} Here's your ${offer.percentOff}% off: code ${offer.code}, good until ${by}. ` +
    `Reply STOP any time to opt out.`
  );
}

export const OPT_IN_KEYWORDS = ["yes", "y", "confirm"];
export const OPT_OUT_KEYWORDS = ["stop", "unsubscribe", "cancel", "end", "quit", "stopall"];

/** Which side of the conversation an inbound reply falls on, if either. */
export function classifyReply(body: string): "opt_in" | "opt_out" | "other" {
  const t = body.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (OPT_OUT_KEYWORDS.includes(t)) return "opt_out";
  if (OPT_IN_KEYWORDS.includes(t)) return "opt_in";
  return "other";
}
