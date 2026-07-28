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
  '/pixel-analytics',
  '/pinterest-queue',
  '/ad-performance',
  '/shop-day-map',
  '/shop-day-connections',
  '/shop-day-requests',
  '/shop-day-matches',
  '/program-advisory-committee-kit',
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
  '/account',
  '/accept-invite',
  '/forgot-password',
  '/reset-password',
  '/api',
  '/playground',
  '/discord',
  '/instagram',
  '/linkedin',
  '/tiktok',
  '/x',
  '/youtube',
  '/pinterest',
  // OAuth callbacks and social redirect shims render nothing readable.
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
