import { SITE_URL } from "@/lib/site";

/**
 * Channels where a link has to be a whole URL, because nothing renders it.
 *
 * The website turns "/shearquery-credit-report" into a working link and
 * markdown into an anchor. An Instagram DM, an SMS and an email do neither: the
 * path arrives as bare text somebody cannot tap, and [label](/path) arrives as
 * literal brackets. Reported from a real DM — the agent answered correctly and
 * ended with an address that went nowhere.
 *
 * phone_call is deliberately absent. Reading a URL aloud is its own bad idea
 * and absolutising it would only make the recital longer.
 */
export const OFF_WEB_TEXT_CHANNELS = new Set(["instagram_dm", "instagram_comment", "sms", "email"]);

export const escapeRe = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Turn site-relative links into full URLs for channels that cannot render them.
 *
 * ONLY PATHS ALREADY IN validLinks ARE TOUCHED, and that is what makes this
 * safe rather than a regex that hunts for anything starting with a slash. Rent
 * is quoted as "$150-300/wk" all over this product, and "/wk" is exactly what a
 * naive path pattern would rewrite into a broken address.
 *
 * Longest first, so /shop does not get rewritten inside /shop/some-slug and
 * leave the tail dangling.
 */
export function absolutizeLinksForMessaging(text: string, validLinks: Set<string>): string {
  const origin = SITE_URL.replace(/\/$/, "");
  let out = text;

  // Unwrap markdown: brackets are literal characters on these channels.
  out = out.replace(/\[([^\]]+)\]\((\/[^)]+)\)/g, (_m, label, path) =>
    validLinks.has(path) ? `${label}: ${origin}${path}` : label,
  );

  const paths = [...validLinks].filter((l) => l.startsWith("/")).sort((a, b) => b.length - a.length);
  for (const path of paths) {
    // The lookbehind stops a second pass double-prefixing what the markdown
    // unwrap above already made absolute.
    out = out.replace(new RegExp(`(?<!${escapeRe(origin)})${escapeRe(path)}`, "g"), `${origin}${path}`);
  }
  return out;
}
