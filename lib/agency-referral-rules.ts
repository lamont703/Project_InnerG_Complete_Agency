/**
 * The pure half of agency referrals: codes, and which signal wins.
 * Tested in agency-referral-rules.test.ts.
 */

/** A code as typed or linked: uppercase letters and digits, 3–20 long. Anything else is not a code. */
export function normaliseReferralCode(raw: unknown): string | null {
  const t = String(raw ?? "").trim().toUpperCase().replace(/[\s-]+/g, "");
  return /^[A-Z0-9]{3,20}$/.test(t) ? t : null;
}

/**
 * A readable code from the agency's name — "Houston Barber Growth" becomes
 * HOUSTONBARBERGROW — made unique against the codes already taken. Readable
 * matters: an agency says its code out loud to a barber in a chair.
 */
export function makeReferralCode(agencyName: string, taken: Set<string>): string {
  const base = (agencyName.toUpperCase().replace(/[^A-Z0-9]/g, "") || "AGENCY").slice(0, 16).padEnd(3, "X");
  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    const code = `${base.slice(0, 16 - String(n).length)}${n}`;
    if (!taken.has(code)) return code;
  }
  throw new Error("could not make a unique referral code");
}

export type ReferralSource = "invite" | "code" | "link";

/**
 * Which signal earns the credit when a signup carries more than one.
 *
 * An invite wins: the agency named this person and they accepted. A code the
 * person typed beats a link cookie: typing it is a deliberate statement, and a
 * cookie can be left over from an unrelated click weeks ago.
 */
export function pickReferralSignal(args: {
  inviteToken?: string | null;
  typedCode?: string | null;
  linkCode?: string | null;
}): { source: ReferralSource; value: string } | null {
  if (args.inviteToken && /^[A-Za-z0-9_-]{32}$/.test(args.inviteToken)) return { source: "invite", value: args.inviteToken };
  const typed = normaliseReferralCode(args.typedCode);
  if (typed) return { source: "code", value: typed };
  const linked = normaliseReferralCode(args.linkCode);
  if (linked) return { source: "link", value: linked };
  return null;
}

export const isEmail = (v: unknown): v is string =>
  typeof v === "string" && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
