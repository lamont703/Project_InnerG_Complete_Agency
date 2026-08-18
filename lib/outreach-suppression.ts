import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Unsubscribe tokens, and the suppression check every send must pass through.
 *
 * AN ENCRYPTED TOKEN RATHER THAN THE EMAIL IN THE URL. The obvious
 * `/unsubscribe?e=someone@school.edu` puts a real person's address in a query
 * string, where it lands in server logs, referrer headers and analytics — and
 * it lets anyone unsubscribe anyone by editing the URL.
 *
 * ENCRYPTED, NOT MERELY SIGNED. The first version of this HMAC-signed a
 * base64url payload, which stopped tampering but left the address plainly
 * recoverable by anyone who base64-decoded the link — obfuscation wearing the
 * costume of privacy, and the surrounding comment claimed more than the code
 * delivered. AES-256-GCM makes the address genuinely unreadable outside our
 * process, and its auth tag gives the same tamper-proofing the HMAC did.
 *
 * THE TOKEN CARRIES THE ADDRESS, so the landing page needs no lookup table and
 * a token cannot be replayed against a different recipient. It does not expire:
 * CAN-SPAM requires the opt-out mechanism to work for at least 30 days after
 * sending, and an unsubscribe link that has quietly died is worse than useless
 * — someone who wants out and cannot get out is exactly who files a complaint.
 *
 * SUPPRESSION IS CHECKED AT SEND TIME, NOT AT LIST-BUILD TIME. A list built on
 * Monday and sent on Friday has four days of opt-outs in it. isSuppressed() is
 * the last gate before the network call, which is the only place it cannot be
 * skipped by a caller who forgot.
 */

/** Falls back to CRON_SECRET so the link works before a dedicated key is set. */
function tokenKey(): Buffer {
  const k = process.env.OUTREACH_TOKEN_SECRET || process.env.CRON_SECRET;
  if (!k) throw new Error("OUTREACH_TOKEN_SECRET (or CRON_SECRET) must be set to sign unsubscribe links.");
  // The secret is a passphrase of any length; AES needs exactly 32 bytes.
  return createHash("sha256").update(k).digest();
}

const b64url = (b: Buffer) => b.toString("base64url");

/** Normalised so "Info@X.com " and "info@x.com" cannot both be on the list. */
export function normaliseEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

export function signUnsubscribeToken(email: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", tokenKey(), iv);
  const ct = Buffer.concat([c.update(normaliseEmail(email), "utf8"), c.final()]);
  return `${b64url(iv)}.${b64url(ct)}.${b64url(c.getAuthTag())}`;
}

/** The address a token stands for, or null if it wasn't minted by us. */
export function verifyUnsubscribeToken(token: string): string | null {
  const [ivB, ctB, tagB] = String(token || "").split(".");
  if (!ivB || !ctB || !tagB) return null;
  try {
    const d = createDecipheriv("aes-256-gcm", tokenKey(), Buffer.from(ivB, "base64url"));
    // GCM verifies the tag on final(); a tampered token throws rather than
    // decrypting to something plausible.
    d.setAuthTag(Buffer.from(tagB, "base64url"));
    const email = Buffer.concat([d.update(Buffer.from(ctB, "base64url")), d.final()]).toString("utf8");
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null;
  } catch {
    return null;
  }
}

export function unsubscribeUrl(siteOrigin: string, email: string): string {
  return `${siteOrigin.replace(/\/+$/, "")}/unsubscribe?t=${encodeURIComponent(signUnsubscribeToken(email))}`;
}

/**
 * The send-time gate. Returns the set of addresses that must NOT be mailed.
 * Takes the client rather than creating one so it can be unit-tested and so the
 * caller cannot accidentally use an anon key against a service-role table.
 */
export async function suppressedSet(
  admin: { from: (t: string) => any },
  emails: string[]
): Promise<Set<string>> {
  const wanted = [...new Set(emails.map(normaliseEmail).filter(Boolean))];
  if (!wanted.length) return new Set();
  const { data, error } = await admin
    .from("outreach_suppression")
    .select("email")
    .in("email", wanted);
  // Fail CLOSED. If we cannot read the suppression list we do not know who has
  // opted out, and mailing someone who did is the one error with a statutory
  // penalty attached. Treating everyone as suppressed stops the run instead.
  if (error) throw new Error(`suppression check failed, refusing to send: ${error.message}`);
  return new Set((data || []).map((r: { email: string }) => normaliseEmail(r.email)));
}
