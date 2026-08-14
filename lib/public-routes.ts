/**
 * One source of truth for "is this route public?".
 *
 * Used by app/sitemap.ts (what to advertise to search engines) and by the
 * `.md` Markdown layer (what an AI crawler is allowed to fetch as prose).
 * These two answers must never diverge — a page we'd refuse to put in the
 * sitemap is a page we must not hand to a crawler in another format.
 */

/** Routes kept out of the sitemap. */
export const SITEMAP_EXCLUDE_PREFIXES = [
  '/admin',
  '/dashboard',
  '/select-portal',
  '/login',
  '/internal-lock',
  // Auth and per-user account surfaces.
  //
  // These four sat in MARKDOWN_EXTRA_EXCLUDE_PREFIXES only, which made the
  // invariant in this file's header true in one direction and false in the
  // other: the Markdown layer refused them as "nothing a crawler should
  // ingest", while the sitemap advertised all 18 of them to Google and Bing.
  //
  // Worse, unlike /dashboard these are not in middleware's PROTECTED_ROUTES,
  // so they are not redirected — /account/add-business, /accept-invite,
  // /forgot-password and /reset-password each return 200 with a client-gated
  // app shell. We were pointing crawlers at fifteen near-identical empty
  // shells, which is the thin-content profile a sitemap exists to avoid.
  //
  // Listed here rather than below because isMarkdownEligible() consults this
  // array first, so a prefix here is excluded from BOTH surfaces and the two
  // answers cannot drift apart again.
  '/account',
  '/accept-invite',
  '/forgot-password',
  '/reset-password',
  // OAuth callback shims. Each of these directories contains nothing but a
  // `callback` child — there is no /discord or /x page, which is why those
  // paths 404. The callbacks themselves are redirect handlers with no reader.
  //
  // Same divergence as the block above: six of them were in
  // MARKDOWN_EXTRA_EXCLUDE_PREFIXES and therefore refused as prose, while the
  // sitemap advertised /x/callback, /discord/callback and five siblings —
  // each serving the HOMEPAGE's title and description, so they were also
  // seven duplicate-title competitors against the front page.
  //
  // /alpaca was in neither list and is added here. /pinterest has no
  // directory at all; it is kept so a future route is covered by default
  // rather than by someone remembering.
  '/alpaca',
  '/discord',
  '/instagram',
  '/linkedin',
  '/pinterest',
  '/tiktok',
  '/x',
  '/youtube',
  // Retired. The panels were AI/blockchain guidance for developers — the one
  // clear topical outlier on a domain that is otherwise entirely barber and
  // beauty. 4 pixel events in 90 days, none from search. noindex'd in
  // app/discussions/layout.tsx and dropped from the sitemap so it stops
  // counting toward what this site claims to be about.
  '/discussions',
  '/pixel-analytics',
  '/pinterest-queue',
  '/ad-performance',
  '/shop-day-map',
  '/shop-day-connections',
  '/shop-day-requests',
  '/shop-day-matches',
  '/program-advisory-committee-kit',
  // Product demos, not destinations. /tools/ai-booth-station is a bare
  // redirect() and answered 307 straight out of the sitemap — a sitemap entry
  // that redirects is wasted crawl budget. shop-site-template serves a
  // fabricated barbershop that was competing in the index with 8,900 real
  // listings. Both subtrees are noindex'd in their own layout.tsx as well;
  // this stops us advertising them in the first place.
  // Development-only visual harness for the AR overlay. Its layout calls
  // notFound() when NODE_ENV is production, so advertising it would point
  // crawlers at a guaranteed 404 — and the filesystem crawler below has no way
  // to know a route 404s at runtime, so it has to be named here.
  '/ar-lab',
  '/tools/ai-booth-station',
  '/tools/shop-site-template',
  '/tools/domain-management',
  '/tools/event-submission',
  '/tools/employment-match-review',
  '/tools/seo-keyword-tracker',
]

/**
 * Additionally withheld from the Markdown layer. These are either
 * authentication surfaces, per-user account state, or pages whose rendered
 * output is an app shell rather than readable prose — nothing a crawler
 * should ingest, even though some are technically reachable.
 */
export const MARKDOWN_EXTRA_EXCLUDE_PREFIXES = [
  // /account, /accept-invite, /forgot-password and /reset-password moved up
  // into SITEMAP_EXCLUDE_PREFIXES — they were always meant to be withheld
  // here, and that array is consulted first, so behaviour on this surface is
  // unchanged.
  // The social prefixes moved up into SITEMAP_EXCLUDE_PREFIXES too — they
  // were only ever half-excluded. Behaviour on this surface is unchanged,
  // since that array is consulted first.
  '/api',
  '/playground',
  // Shop short-links: /s/{id} redirects to the full profile, so there is
  // nothing to read. Not in the sitemap either — the filesystem crawler skips
  // bracketed segments and /s has no page of its own.
  '/s/',
]

export function isExcludedFromSitemap(route: string): boolean {
  return SITEMAP_EXCLUDE_PREFIXES.some((p) => route === p || route.startsWith(`${p}/`))
}

/**
 * Whether `/path.md` may be served for this route. Deliberately conservative:
 * anything not clearly public is refused rather than probed.
 */
export function isMarkdownEligible(route: string): boolean {
  if (!route.startsWith('/')) return false
  // No traversal, no encoded segments, no file extensions sneaking through.
  if (route.includes('..') || route.includes('//') || route.includes('%')) return false
  if (isExcludedFromSitemap(route)) return false
  return !MARKDOWN_EXTRA_EXCLUDE_PREFIXES.some((p) =>
    p.endsWith('/') ? route.startsWith(p) : route === p || route.startsWith(`${p}/`)
  )
}
