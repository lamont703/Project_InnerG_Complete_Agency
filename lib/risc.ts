import { createPublicKey, verify as cryptoVerify } from "node:crypto";

/**
 * Verification for Google Cross-Account Protection (RISC) security event
 * tokens.
 *
 * This lives apart from the route handler for one reason: it is the ONLY thing
 * standing between an unauthenticated public endpoint and code that deletes
 * users' stored credentials. Google posts these events with none of our
 * credentials attached, so the JWT signature is the authentication — which
 * means this logic has to be directly testable, and it is
 * (lib/risc.test.ts signs tokens with a throwaway key and tries to sneak them
 * past every check below).
 */

const RISC_CONFIG_URL = "https://accounts.google.com/.well-known/risc-configuration";
export const GOOGLE_ISSUER = "https://accounts.google.com";

/** Events that mean "this connection is dead — stop using it." */
export const REVOCATION_EVENTS = new Set([
  "https://schemas.openid.net/secevent/oauth/event-type/token-revoked",
  "https://schemas.openid.net/secevent/risc/event-type/tokens-revoked",
  "https://schemas.openid.net/secevent/risc/event-type/account-disabled",
  "https://schemas.openid.net/secevent/risc/event-type/account-purged",
  "https://schemas.openid.net/secevent/risc/event-type/sessions-revoked",
  "https://schemas.openid.net/secevent/risc/event-type/account-credential-change-required",
]);

/** Sent by Google on request, purely to prove the endpoint works. */
export const VERIFICATION_EVENT = "https://schemas.openid.net/secevent/risc/event-type/verification";

export type JwkProvider = () => Promise<any[]>;

let jwksCache: { keys: any[]; fetchedAt: number } | null = null;
const JWKS_TTL_MS = 60 * 60 * 1000;

/** Google's current RISC signing keys, cached — they rotate, but not per-request. */
export const googleRiscKeys: JwkProvider = async () => {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS) return jwksCache.keys;
  const config = await fetch(RISC_CONFIG_URL).then((r) => r.json());
  const jwks = await fetch(config.jwks_uri).then((r) => r.json());
  jwksCache = { keys: jwks.keys || [], fetchedAt: Date.now() };
  return jwksCache.keys;
};

const decodeSegment = (seg: string) => JSON.parse(Buffer.from(seg, "base64url").toString("utf8"));

/**
 * Verify a security event token's signature and claims.
 * Returns the payload, or null if anything is off — callers must treat null as
 * "discard, this did not come from Google."
 */
export async function verifySecurityEventToken(
  token: string,
  audience: string | undefined,
  keys: JwkProvider = googleRiscKeys
): Promise<any | null> {
  // No audience configured means we cannot prove an event was meant for us, so
  // nothing is trusted. Failing closed matters more than staying available on a
  // misconfigured deploy.
  if (!audience) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerSeg, payloadSeg, signatureSeg] = parts;

  let header: any;
  try {
    header = decodeSegment(headerSeg);
  } catch {
    return null;
  }
  // Pin the algorithm. Trusting the token's own `alg` is how "alg: none" and
  // RS256→HS256 confusion attacks work.
  if (header.alg !== "RS256") return null;

  const key = (await keys()).find((k) => k.kid === header.kid);
  if (!key) return null;

  let signatureValid = false;
  try {
    signatureValid = cryptoVerify(
      "RSA-SHA256",
      Buffer.from(`${headerSeg}.${payloadSeg}`),
      createPublicKey({ key, format: "jwk" }),
      Buffer.from(signatureSeg, "base64url")
    );
  } catch {
    return null; // malformed key or signature
  }
  if (!signatureValid) return null;

  let payload: any;
  try {
    payload = decodeSegment(payloadSeg);
  } catch {
    return null;
  }
  if (payload.iss !== GOOGLE_ISSUER) return null;
  // Audience is our OAuth client — this is what stops a validly-signed event
  // meant for some other Google app from touching our data.
  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!auds.includes(audience)) return null;

  return payload;
}

/** Google identifies the account by iss+sub, occasionally by email. */
export function subjectOf(event: any): { sub?: string; email?: string } {
  const subject = event?.subject || {};
  if (subject.sub) return { sub: subject.sub };
  if (subject.email) return { email: subject.email };
  return {};
}
