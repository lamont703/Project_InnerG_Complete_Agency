import { randomInt, timingSafeEqual } from "node:crypto";
import { WORDS_PER_MIN, NEWSDESK } from "@/lib/newsdesk-config";

/**
 * CONSENT, AND WHY A From: HEADER IS NOT IT.
 *
 * The allowlist is a SPAM FILTER. A From: address is trivially spoofable, and
 * every approval here spends real money at HeyGen — so the thing that authorises
 * a render is a one-time code this system generated, stored server-side, and
 * saw come back. Nothing about the sender proves intent; only the nonce does.
 */

/**
 * SIX DIGITS, NOT A UUID. It has to survive being read on a phone and typed back
 * into a reply, and a code nobody can retype is a code that gets copy-pasted
 * from the wrong email. The guessing risk is handled by the expiry and by
 * single use, not by length: a nonce is live for one job, for one hour.
 */
export const NONCE_TTL_MINUTES = 60;

export function mintNonce(): { code: string; expiresAt: string } {
  const code = String(randomInt(100000, 1000000));
  return { code, expiresAt: new Date(Date.now() + NONCE_TTL_MINUTES * 60_000).toISOString() };
}

/** Constant-time compare, so a reply cannot be used to time-probe the code. */
function sameCode(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export type ConsentVerdict =
  | { ok: true }
  | { ok: false; reason: "no-nonce" | "expired" | "already-used" | "no-code-in-reply" | "wrong-code" };

export interface ConsentRow {
  consent_nonce: string | null;
  consent_nonce_expires_at: string | null;
  consent_nonce_consumed_at: string | null;
}

/**
 * Does this reply body carry the live code for this job?
 *
 * DELIBERATELY NOT A LOOSE "does the body contain six digits" TEST. A quoted
 * proposal email is included in most replies, and the code appears inside that
 * quote — so a bare digit search would approve a reply that says "no, don't".
 * The code must appear in the text the human actually wrote, which is the part
 * ABOVE the first quote marker.
 */
export function verifyConsent(row: ConsentRow, replyBody: string): ConsentVerdict {
  if (!row.consent_nonce) return { ok: false, reason: "no-nonce" };
  if (row.consent_nonce_consumed_at) return { ok: false, reason: "already-used" };
  if (!row.consent_nonce_expires_at || new Date(row.consent_nonce_expires_at) < new Date()) {
    return { ok: false, reason: "expired" };
  }

  const written = replyBody
    .split(/^\s*(?:>|On .+ wrote:|-{2,}\s*Original Message)/m)[0]
    .slice(0, 2000);
  const codes = written.match(/\b\d{6}\b/g);
  if (!codes?.length) return { ok: false, reason: "no-code-in-reply" };
  if (!codes.some((c) => sameCode(c, row.consent_nonce as string))) return { ok: false, reason: "wrong-code" };
  return { ok: true };
}

/**
 * THE DAILY CEILING. Three renders or five dollars, whichever comes first.
 *
 * REFUSES RATHER THAN QUEUES, which is the whole point. A queue that fills up
 * overnight and drains at 9am is not a spending limit, it is a delay — and the
 * failure it is guarding against is a loop, a spoofed thread, or a bad day's
 * judgement producing twenty renders while nobody is watching.
 */
export const DAILY_MAX_RENDERS = 3;
export const DAILY_MAX_USD = 5;

export interface DayUsage { renders: number; usd: number }

export function overDailyLimit(usage: DayUsage, thisJobUsd: number):
  | { over: false }
  | { over: true; gate: "renders" | "spend" | "per-video"; reason: string } {
  if (usage.renders >= DAILY_MAX_RENDERS) {
    return { over: true, gate: "renders",
      reason: `${usage.renders} renders already today (limit ${DAILY_MAX_RENDERS})` };
  }
  const after = usage.usd + thisJobUsd;
  if (after > DAILY_MAX_USD) {
    return { over: true, gate: "spend",
      reason: `$${usage.usd.toFixed(2)} spent today, this job adds $${thisJobUsd.toFixed(2)}, over the $${DAILY_MAX_USD} daily cap` };
  }
  /*
   * THE PER-VIDEO GATE IS NOT A DAILY ONE, and saying so matters.
   *
   * All three refusals used to be stored as "daily limit: ...", so a script that
   * was simply too long read as "you have used up today's allowance" — which
   * points at waiting until tomorrow or raising the daily ceiling, neither of
   * which would ever let this job through. It is one video over the per-video
   * cap, and the fix is a shorter script or a higher cap. That happened.
   */
  if (thisJobUsd > NEWSDESK.budgetUsd) {
    const overSecs = Math.ceil((thisJobUsd - NEWSDESK.budgetUsd) / NEWSDESK.avatar.perSec);
    const overWords = Math.ceil((overSecs / 60) * WORDS_PER_MIN);
    return { over: true, gate: "per-video",
      reason: `this one video estimates $${thisJobUsd.toFixed(2)}, over the $${NEWSDESK.budgetUsd} per-video cap. ` +
              `This is NOT the daily limit — nothing rendered today counts toward it. ` +
              `It is about ${overSecs}s too much time on camera, roughly ${overWords} words. ` +
              `Moving that many words out of an avatar beat and into a b-roll segment fixes it and ` +
              `changes nothing about how the video sounds, because it is all one narration` };
  }
  return { over: false };
}
