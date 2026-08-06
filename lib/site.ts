/**
 * The site's own origin, and which hosts are allowed into a search index.
 *
 * WHY THIS FILE EXISTS. Two separate jobs that have to agree:
 *
 * 1. `SITE_URL` is the one place the canonical origin is written down. Today
 *    that string is duplicated across ~400 `alternates.canonical` values and
 *    JSON-LD `@id`/`url` fields, which is why the ShearQuery move is a 200-file
 *    edit instead of a one-line change. New code should import this; the
 *    existing hardcoded copies get folded in here separately.
 *
 * 2. `isIndexableHost` gates which hostnames may be indexed at all. Vercel
 *    sets `X-Robots-Tag: noindex` on preview deployments automatically, but
 *    NOT when a custom domain is attached to a non-production branch — which
 *    is exactly what staging.shearquery.com is. Without this, staging serves a
 *    fully crawlable copy of the whole site on the domain we are in the middle
 *    of establishing, and because sc-domain:shearquery.com is a Search Console
 *    *domain* property it covers every subdomain — so staging would also
 *    pollute the one report used to monitor whether the migration worked.
 */

/**
 * The canonical production host.
 *
 * Phase 3 of the domain move flips this to "shearquery.com". It is deliberately
 * still the old host: both domains serve this same deployment, so changing it
 * changes what every page declares canonical, and that must happen as a
 * decision rather than as a side effect of adding a staging guard.
 */
export const SITE_HOST = "agency.innergcomplete.com";

/** Canonical origin, no trailing slash. */
export const SITE_URL = `https://${SITE_HOST}`;

/**
 * Hosts permitted to be indexed.
 *
 * Both production domains are listed during the migration window. shearquery.com
 * serves 200s now but every page on it still declares the old domain canonical,
 * so Google treats it as a duplicate that consolidates to the old URL rather
 * than as a competitor — that is the intended Phase 1 state, and noindexing it
 * instead would have to be undone at exactly the moment it matters most.
 *
 * texasbarbering.innergcomplete.com is a live host with its own root rewrite
 * (see middleware) and its own verified Search Console property. It is here to
 * preserve today's behaviour, not because the domain move needs it.
 *
 * Everything absent is non-indexable by default, which is the safe direction:
 * a new host that nobody remembered to add stays out of the index, rather than
 * a new host that nobody remembered to block quietly entering it.
 */
const INDEXABLE_HOSTS: ReadonlySet<string> = new Set([
  "agency.innergcomplete.com",
  "shearquery.com",
  "texasbarbering.innergcomplete.com",
]);

/**
 * Whether responses for this host may be indexed.
 *
 * Note what this does NOT do: it never changes what is served. Staging renders
 * the identical page, runs the identical code and returns the identical status
 * — the only difference is a response header no human sees. Testing on
 * staging.shearquery.com behaves exactly like production.
 *
 * www.shearquery.com is absent on purpose. Vercel redirects it to the apex so
 * it never reaches this code, and if that redirect were ever removed the
 * fallback is "not indexable", which is the failure we would want.
 */
export function isIndexableHost(host: string | null | undefined): boolean {
  if (!host) return false;
  // Strip any :port (localhost:3000, and Vercel passes none in production).
  const bare = host.split(":")[0].toLowerCase();
  return INDEXABLE_HOSTS.has(bare);
}

/**
 * Hostnames that belong to us, as opposed to hosts we merely may be indexed on.
 *
 * Wider than INDEXABLE_HOSTS on purpose: staging and preview deployments are
 * ours but must never be indexed, so the two lists answer different questions
 * and must not be collapsed into one.
 */
const OWN_HOST_SUFFIXES = ["shearquery.com", "innergcomplete.com", "vercel.app"] as const;

function isOwnHost(host: string): boolean {
  const bare = host.split(":")[0].toLowerCase();
  if (bare === "localhost" || bare === "127.0.0.1") return true;
  return OWN_HOST_SUFFIXES.some((s) => bare === s || bare.endsWith(`.${s}`));
}

/**
 * Headers that let a server-side self-fetch through Vercel Deployment Protection.
 *
 * THE PROBLEM THIS SOLVES. Two routes render a page by fetching their own URL —
 * the .md layer (lib/page-markdown.ts) and the PDF renderer (app/api/pdf) — and
 * both build that URL from the inbound Host header. On staging.shearquery.com
 * that self-fetch hits a deployment behind Vercel Authentication and comes back
 * as Vercel's login page, so the .md output was literally "# Log in to Vercel"
 * and a PDF would render the same thing. Production is unaffected, which is
 * exactly why this would have gone unnoticed until someone tested on staging.
 *
 * Vercel documents the header as `x-vercel-protection-bypass` carrying
 * VERCEL_AUTOMATION_BYPASS_SECRET, which it injects into deployments itself.
 *
 * THE HOST CHECK IS THE POINT. The origin comes from a request header, and this
 * secret is what lets anyone past our deployment protection — so it goes out
 * only to hosts we recognise as ours. Vercel already refuses to route unknown
 * Hosts to the deployment; this is the second lock, not the first.
 *
 * Deliberately NOT setting `x-vercel-set-bypass-cookie` — that exists for
 * in-browser testing and answers with a redirect and a Set-Cookie, which is
 * pure overhead for a one-shot server-side fetch.
 */
export function protectionBypassHeaders(origin: string): Record<string, string> {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!secret) return {};
  let hostname: string;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return {};
  }
  return isOwnHost(hostname) ? { "x-vercel-protection-bypass": secret } : {};
}
