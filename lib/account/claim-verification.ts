import { createHash } from "node:crypto";

/**
 * Proving that a claimant owns the listing they claimed.
 *
 * THE HOLE. app/api/community/register writes a community_member_entity_links
 * row for anyone arriving from a "Claim your shop" CTA who then signs up. No
 * check. That bought a badge and listing edits; with a booking dashboard it
 * would buy real customers' names, phone numbers and email addresses.
 *
 * THE PROOF, AND THE ONLY PART THAT MATTERS. The code is texted to the phone
 * number ALREADY ON THE LISTING, read server-side from the entity row. It is
 * never taken from the claimant. A code sent to a number someone typed into a
 * form proves only that they can receive their own text messages — which is
 * exactly the flaw in app/api/send-otp/route.ts, where `phone` comes straight
 * off the request body. That route is not a model to copy.
 *
 * WHAT THE HASHING DOES AND DOES NOT DO. Storing a hash keeps live codes out of
 * logs, backups and any read-only query that wanders past the table. It does
 * NOT stop someone with table access from brute-forcing six digits — 10^6 is
 * nothing. The controls that actually bound this are the ten-minute expiry and
 * the five-attempt cap, and they are the reason both are short. Saying the hash
 * secures it would be the comfortable lie.
 */

/** Long enough to text and retype, short enough that a stale one is useless. */
export const CODE_TTL_MINUTES = 10;

/** Guesses per code. Six digits with five tries is a 1-in-200,000 shot. */
export const MAX_ATTEMPTS = 5;

/**
 * Seconds before another code may be sent for the same claim.
 *
 * This is anti-harassment, not anti-fraud. Without it, anyone could hammer the
 * send endpoint and make us text a real business dozens of times — using our
 * number, about a claim they invented. The business would block us, and every
 * future booking notification to that listing would silently stop.
 */
export const RESEND_COOLDOWN_SECONDS = 60;

/** Codes per claim per day, however patient the caller is. */
export const MAX_CODES_PER_DAY = 5;

export function generateCode(): string {
  // Six digits, uniformly distributed, no leading-zero loss (100000–999999).
  return String(100000 + Math.floor(Math.random() * 900000));
}

/**
 * Bound to the member and entity, not just the code.
 *
 * Without that binding a code issued for one listing would validate against
 * another — the same six digits are in flight for many claims at once, and a
 * bare hash of "418302" matches every one of them.
 */
export function hashCode(code: string, memberId: string, entityId: string): string {
  return createHash("sha256").update(`${code}:${memberId}:${entityId}`).digest("hex");
}

export function expiryFrom(now: Date): Date {
  return new Date(now.getTime() + CODE_TTL_MINUTES * 60_000);
}

/** Last four digits, for "we texted the number ending 0134". */
export function last4(phone: string | null | undefined): string | null {
  const digits = String(phone ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

export type VerifyOutcome =
  | { ok: true }
  | { ok: false; reason: "no_code" | "expired" | "too_many_attempts" | "wrong_code" };

/**
 * Whether a submitted code is good. Pure — the caller does the I/O.
 *
 * Checks expiry and the attempt cap BEFORE comparing, so an expired or
 * exhausted code cannot be brute-forced by continuing to guess against it.
 */
export function checkCode(
  submitted: string,
  record: { code_hash: string; expires_at: string; attempts: number; consumed_at: string | null } | null,
  memberId: string,
  entityId: string,
  now: Date
): VerifyOutcome {
  if (!record || record.consumed_at) return { ok: false, reason: "no_code" };
  if (new Date(record.expires_at).getTime() <= now.getTime()) return { ok: false, reason: "expired" };
  if (record.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };

  const clean = String(submitted ?? "").replace(/\D/g, "");
  if (clean.length !== 6) return { ok: false, reason: "wrong_code" };
  if (hashCode(clean, memberId, entityId) !== record.code_hash) return { ok: false, reason: "wrong_code" };
  return { ok: true };
}

/** Whether another code may be sent yet. */
export function canSend(
  recent: { created_at: string }[],
  now: Date
): { ok: true } | { ok: false; reason: "cooldown" | "daily_cap"; retryAfterSeconds?: number } {
  const dayAgo = now.getTime() - 24 * 3600_000;
  const today = recent.filter((r) => new Date(r.created_at).getTime() > dayAgo);
  if (today.length >= MAX_CODES_PER_DAY) return { ok: false, reason: "daily_cap" };

  const newest = today
    .map((r) => new Date(r.created_at).getTime())
    .sort((a, b) => b - a)[0];
  if (newest) {
    const elapsed = (now.getTime() - newest) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      return { ok: false, reason: "cooldown", retryAfterSeconds: Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed) };
    }
  }
  return { ok: true };
}

/** What the business is texted. Names us, so it is not a mystery code. */
export function verificationSms(code: string, listingName: string): string {
  return (
    `ShearQuery: someone is claiming ${listingName} on our directory. ` +
    `If that's you, your code is ${code} (expires in ${CODE_TTL_MINUTES} minutes). ` +
    `If it isn't, ignore this message - no one gets access without the code.`
  );
}
