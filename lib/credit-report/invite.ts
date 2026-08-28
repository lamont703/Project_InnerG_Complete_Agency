import "server-only";
import { sendGhlSms } from "@/lib/ghl-sms";
import { SITE_URL } from "@/lib/site";

/**
 * The invite a shop sends to someone renting a chair.
 *
 * ONE PLACE THAT BUILDS AND SENDS IT, used by both "add to roster" and
 * "resend". Two copies of a message that names a shop and carries a claim
 * token is two messages to keep in step, and the one that drifts is the one
 * nobody reads until a barber gets a text that says the wrong shop.
 */

/**
 * COOLDOWN BETWEEN SENDS.
 *
 * The abuse this prevents is not spam in the marketing sense — it is an owner
 * repeatedly texting somebody who has decided not to claim. Fifteen minutes is
 * short enough that a genuine "they never got it" retry is not a wait, and long
 * enough that the button cannot become a way to hammer a phone.
 *
 * Changing the barber's number CLEARS invited_at (see updateWorker), so
 * correcting a typo lets you resend immediately. Being blocked for fifteen
 * minutes after fixing a wrong number would punish the fix.
 */
export const INVITE_COOLDOWN_MS = 15 * 60 * 1000;

export function cooldownRemainingMs(invitedAt: string | null): number {
  if (!invitedAt) return 0;
  const elapsed = Date.now() - new Date(invitedAt).getTime();
  return Math.max(0, INVITE_COOLDOWN_MS - elapsed);
}

export function inviteUrl(token: string): string {
  return `${SITE_URL}/account/credit-report?invite=${token}`;
}

/**
 * The message body. Pure, so it can be asserted on without sending anything.
 *
 * WHAT IT HAS TO CARRY, and why each part is not optional:
 *   - The SHOP'S NAME. An unexplained link asking someone to claim a payment
 *     record is indistinguishable from a phishing text. Naming the shop they
 *     actually rent from is the only thing that makes it legible.
 *   - What it is FOR, in one line. "Credit report" without context reads as a
 *     credit check being run on them, which is the opposite of what this is.
 *   - That it is THEIRS and private. The reason to tap.
 *   - STOP. Required for an automated message to a mobile, and correct anyway.
 *
 * Kept under 320 characters — two SMS segments. Longer and carriers split it
 * in places that cut the link.
 */
export function inviteMessage(shopName: string, barberName: string, token: string): string {
  const first = barberName.trim().split(/\s+/)[0] || "there";
  return (
    `${first} — ${shopName} is tracking booth rent payments on ShearQuery. ` +
    `Claim your payment record so it's yours: only you can share it, and nobody can look it up. ` +
    `${inviteUrl(token)} Reply STOP to opt out.`
  );
}

export interface InviteSendResult {
  ok: boolean;
  /** True when SMS credentials are absent — a config gap, not a send failure. */
  skipped?: boolean;
  error?: string;
}

/**
 * Send it.
 *
 * "ok" MEANS GHL ACCEPTED IT, NOT THAT ANYONE RECEIVED IT — lib/ghl-sms.ts is
 * explicit that a text to a landline is accepted and then silently dropped by
 * the carrier, and plenty of numbers in this trade are landlines. Every caller
 * of this function must phrase its success as "sent", never "delivered".
 */
export async function sendInviteSms(args: {
  shopName: string;
  barberName: string;
  phone: string;
  token: string;
}): Promise<InviteSendResult> {
  const res = await sendGhlSms({
    message: inviteMessage(args.shopName, args.barberName, args.token),
    phone: args.phone,
    name: args.barberName,
  });
  if (res.skipped) return { ok: false, skipped: true, error: res.error };
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}
