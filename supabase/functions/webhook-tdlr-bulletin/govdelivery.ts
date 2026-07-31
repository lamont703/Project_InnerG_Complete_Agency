/**
 * GovDelivery link decoding + bulletin content extraction.
 *
 * Kept separate from index.ts so it's a pure function with no Deno/network
 * dependencies — the link format is the one thing this whole pipeline hangs
 * on, so it needs to be testable without deploying anything.
 */

/**
 * GovDelivery wraps every outbound link in a click tracker:
 *
 *   https://links-2.govdelivery.com/CL0/https:%2F%2Fwww.tdlr.texas.gov%2Ffoo/1/0101…/hash=452
 *                                   └─────────── real URL, url-encoded ──────────┘
 *
 * The true destination is embedded in the path, so it can be recovered without
 * following the redirect. That matters twice over: no extra round-trip, and no
 * phantom click registered against TDLR's own analytics.
 */
export function decodeGovDeliveryLink(url: string): string | null {
  const m = url.match(/https?:\/\/links-\d*\.?govdelivery\.com\/CL0\/(.+?)\/\d+\//i);
  if (!m) return null;
  try {
    const decoded = decodeURIComponent(m[1]);
    return /^https?:\/\//i.test(decoded) ? decoded : null;
  } catch {
    return null; // malformed percent-encoding
  }
}

/** Every URL in a plaintext email body, including bare and bracketed forms. */
function allUrls(text: string): string[] {
  // GovDelivery's text part wraps links in [...] and also emits bare ones;
  // the trailing-char class stops the match before sentence punctuation.
  return (text.match(/https?:\/\/[^\s<>\]"']+/g) || []).map((u) =>
    u.replace(/[.,;:)]+$/, "")
  );
}

const TDLR_HOST = /(^|\.)tdlr\.texas\.gov$/i;

/**
 * Bulletin content lives on www.tdlr.texas.gov. Other TDLR hosts are
 * transactional portals that appear in the footer of every GovDelivery email —
 * ga.tdlr.texas.gov is the customer-service inquiry form — so they're never
 * the subject of a bulletin.
 */
const NON_CONTENT_HOSTS = /^(ga|apps|online)\./i;

/**
 * The tdlr.texas.gov URLs a bulletin points at — the actual authoritative
 * content. Deduped, order preserved.
 *
 * Boilerplate destinations (unsubscribe, social, the complaint form) are
 * filtered out: they appear in the footer of every single GovDelivery email,
 * so treating them as bulletin content would make every message look
 * identical and would send the fetcher to the same three pages forever.
 */
export function extractTdlrUrls(body: string): string[] {
  const out: string[] = [];
  for (const raw of allUrls(body)) {
    const target = decodeGovDeliveryLink(raw) ?? raw;
    let host: string;
    let path: string;
    try {
      const u = new URL(target);
      host = u.hostname;
      path = u.pathname.toLowerCase();
    } catch {
      continue;
    }
    if (!TDLR_HOST.test(host)) continue;
    if (NON_CONTENT_HOSTS.test(host)) continue;
    if (BOILERPLATE_PATHS.some((p) => path.startsWith(p))) continue;
    if (!out.includes(target)) out.push(target);
  }
  return out;
}

const BOILERPLATE_PATHS = [
  "/help",
  "/complaints",
  "/subscribe",
  "/unsubscribe",
];

/**
 * Emails that are administrative rather than informational — the
 * subscribe/unsubscribe confirmations GovDelivery sends when preferences
 * change. Caught by shape before the model is called at all: these are
 * perfectly regular, and paying for an LLM round-trip to recognize one would
 * be waste.
 */
export function isSubscriptionReceipt(body: string): boolean {
  const t = body.toLowerCase();
  return (
    t.includes("changes to your") &&
    t.includes("subscriptions") &&
    (t.includes("you subscribed to") || t.includes("you unsubscribed from"))
  );
}

/** Strip tags/scripts from a fetched HTML page down to readable text. */
export function htmlToText(html: string, maxChars = 12000): string {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.length > maxChars ? text.slice(0, maxChars) + "\n…[truncated]" : text;
}

/**
 * Normalize before hashing so a resend that differs only in tracking-link
 * hashes or whitespace still dedupes to the same bulletin. GovDelivery mints
 * fresh tracking URLs per send, so hashing the raw body would let the same
 * bulletin through twice.
 */
export function normalizeForHash(body: string): string {
  return body
    .replace(/https?:\/\/links-\d*\.?govdelivery\.com\/\S+/gi, "[link]")
    .replace(/https?:\/\/content\.govdelivery\.com\/\S+/gi, "[img]")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
