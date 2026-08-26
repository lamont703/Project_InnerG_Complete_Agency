import crypto from "crypto";

/**
 * Twilio request validation.
 *
 * Twilio signs each webhook as base64(HMAC-SHA1(url + sorted POST params)),
 * keyed with the ACCOUNT AUTH TOKEN — an API Key cannot produce it.
 *
 * The url must be byte-identical to the one Twilio called, including the query
 * string. Behind Vercel's proxy the incoming request often reports http, so the
 * proto is rebuilt from x-forwarded-proto; getting that wrong is the classic
 * way this fails while everything else looks right.
 */
export function twilioSignatureIsValid(args: {
  url: string;
  params: Record<string, string>;
  signature: string | null;
  authToken: string | undefined;
}): boolean {
  const { url, params, signature, authToken } = args;
  if (!authToken || !signature) return false;
  const payload = Object.keys(params)
    .sort()
    .reduce((acc, k) => acc + k + params[k], url);
  const expected = crypto.createHmac("sha1", authToken).update(Buffer.from(payload, "utf-8")).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** The absolute URL Twilio signed, reconstructed from proxy headers. */
export function requestUrlForSignature(req: Request): string {
  const u = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (proto) u.protocol = `${proto}:`;
  if (host) u.host = host;
  return u.toString();
}

export async function formParams(req: Request): Promise<Record<string, string>> {
  const form = await req.formData();
  const out: Record<string, string> = {};
  for (const [k, v] of form.entries()) out[k] = typeof v === "string" ? v : "";
  return out;
}
