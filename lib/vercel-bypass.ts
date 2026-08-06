/**
 * Deployment Protection bypass for server-side self-fetches.
 *
 * Split out of lib/site.ts and marked server-only deliberately: site.ts is
 * imported by ~200 files including client components, and this module reads
 * VERCEL_AUTOMATION_BYPASS_SECRET. Next.js does not inline non-NEXT_PUBLIC env
 * vars into client bundles, so nothing was leaking — but a secret one import
 * away from the client graph is a bad place to leave it. "server-only" turns
 * that from a convention into a build error.
 */
import "server-only";

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
