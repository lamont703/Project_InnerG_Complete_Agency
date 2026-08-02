import { unstable_cache } from "next/cache"
import { google } from "googleapis"
import { internalEnv } from "@/lib/google-internal-oauth"

// Live Google Search Console performance for the SEO keyword tracker.
// Reuses the same OAuth-refresh-token pattern as scripts/gsc_*.js. Read-only.

export interface GscMetrics {
  clicks: number
  impressions: number
  ctr: number // 0..1
  position: number
}

/**
 * Why live data is missing, when it is.
 *
 * Collapsing every failure to `null` meant the page said "unavailable" whether
 * the credentials were absent, the refresh token belonged to the wrong OAuth
 * client, or Google was simply down — three problems with three different
 * fixes, indistinguishable on screen. This is what tells them apart without
 * anyone opening the function logs.
 */
export type GscUnavailableReason =
  | { kind: "not-configured"; missing: string[] }
  | { kind: "auth-failed"; detail: string }
  | { kind: "api-error"; detail: string }

export interface GscPerformance {
  byPath: Record<string, GscMetrics> // pathname -> aggregated metrics
  byQuery: Record<string, GscMetrics> // lowercased query -> metrics
  window: { start: string; end: string }
  fetchedAt: string
}

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_GSC_REFRESH_TOKEN, GSC_SITE_URL } = internalEnv()

/**
 * Set on the failing path and read by the page after it gets null back.
 *
 * Module scope rather than a return value because getGscPerformance is wrapped
 * in unstable_cache, which caches the resolved value — threading a reason
 * through the return type would cache the reason too, and a stale "not
 * configured" would outlive the fix by an hour.
 */
let lastFailure: GscUnavailableReason | null = null

export function gscLastFailure(): GscUnavailableReason | null {
  return lastFailure
}

/** Reported when credentials are absent, so the page can name them. */
export function gscMissingConfig(): string[] {
  return [
    !GOOGLE_CLIENT_ID && "GOOGLE_INTERNAL_CLIENT_ID (or GOOGLE_CLIENT_ID)",
    !GOOGLE_CLIENT_SECRET && "GOOGLE_INTERNAL_CLIENT_SECRET (or GOOGLE_CLIENT_SECRET)",
    !GOOGLE_GSC_REFRESH_TOKEN && "GOOGLE_GSC_REFRESH_TOKEN",
    !GSC_SITE_URL && "GSC_SITE_URL",
  ].filter(Boolean) as string[]
}

/**
 * Fetch a window of Search Console performance.
 *
 * Takes explicit dates rather than a day count so the caller (the tracker page,
 * via resolveGscWindow) owns the clamping rules and the query and the on-screen
 * labels can't disagree about the range. Returns null on any failure — the page
 * degrades to the catalog without metrics.
 *
 * Note the two distinct null paths: missing configuration returns silently,
 * while an API failure logs. If this ever comes back empty in production, that
 * distinction is what tells you whether to look at env vars or at the token.
 */
export async function getGscPerformance(window: {
  start: string
  end: string
}): Promise<GscPerformance | null> {
  const missing = gscMissingConfig()
  if (missing.length) {
    lastFailure = { kind: "not-configured", missing }
    console.warn("[gsc-performance] not configured — missing:", missing.join(", "))
    return null
  }

  try {
    const oauth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
    oauth.setCredentials({ refresh_token: GOOGLE_GSC_REFRESH_TOKEN })
    const sc = google.searchconsole({ version: "v1", auth: oauth })

    const startDate = window.start
    const endDate = window.end

    const fetchDim = async (dim: "page" | "query") => {
      const rows: any[] = []
      let startRow = 0
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const res = await sc.searchanalytics.query({
          siteUrl: GSC_SITE_URL,
          requestBody: { startDate, endDate, dimensions: [dim], rowLimit: 25000, startRow },
        })
        const batch = res.data.rows || []
        rows.push(...batch)
        if (batch.length < 25000) break
        startRow += 25000
      }
      return rows
    }

    const [pageRows, queryRows] = await Promise.all([fetchDim("page"), fetchDim("query")])

    // Aggregate page rows by pathname (query-param variants collapse to one path;
    // position is impression-weighted across the merged variants).
    const byPath: Record<string, GscMetrics> = {}
    for (const r of pageRows) {
      let p = r.keys[0] as string
      try {
        p = new URL(p).pathname
      } catch {
        /* keep as-is */
      }
      const prev = byPath[p] || { clicks: 0, impressions: 0, ctr: 0, position: 0 }
      const clicks = prev.clicks + (r.clicks || 0)
      const impressions = prev.impressions + (r.impressions || 0)
      const position = impressions
        ? (prev.position * prev.impressions + (r.position || 0) * (r.impressions || 0)) / impressions
        : r.position || 0
      byPath[p] = { clicks, impressions, ctr: impressions ? clicks / impressions : 0, position }
    }

    const byQuery: Record<string, GscMetrics> = {}
    for (const r of queryRows) {
      const q = String(r.keys[0]).toLowerCase().trim()
      byQuery[q] = {
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: r.ctr || 0,
        position: r.position || 0,
      }
    }

    return { byPath, byQuery, window: { start: startDate, end: endDate }, fetchedAt: new Date().toISOString() }
  } catch (e) {
    const detail = (e as Error).message || "unknown error"
    // unauthorized_client / invalid_grant mean the refresh token was minted by
    // a DIFFERENT OAuth client than the one in use — the exact failure when
    // GOOGLE_INTERNAL_CLIENT_ID is absent and internalEnv() silently falls back
    // to the customer-facing app client. Naming it is the whole point: the
    // generic message sends people to look at the token, which is fine.
    const isAuth = /unauthorized_client|invalid_grant|invalid_client/i.test(detail)
    lastFailure = isAuth ? { kind: "auth-failed", detail } : { kind: "api-error", detail }
    console.error(`[gsc-performance] fetch failed (${isAuth ? "auth" : "api"}):`, detail)
    return null
  }
}

export interface GscKeySet {
  /** Page pathnames to keep. */
  paths: string[]
  /** Lowercased queries to keep. */
  queries: string[]
}

/**
 * Narrow a response to the keys a caller will actually read.
 *
 * The raw response is far bigger than the tracker needs — a 90-day window is
 * ~9,400 pages and up to 25,000 query rows (~3MB serialized), of which the page
 * looks up 73 paths and 390 queries. Projecting first is what makes the result
 * cacheable at all: Next's data cache silently refuses entries over 2MB and the
 * rejection surfaces as an unhandledRejection, not a cache miss.
 */
export function projectGscPerformance(perf: GscPerformance, keys: GscKeySet): GscPerformance {
  const byPath: Record<string, GscMetrics> = {}
  for (const p of keys.paths) {
    const hit = perf.byPath[p]
    if (hit) byPath[p] = hit
  }
  const byQuery: Record<string, GscMetrics> = {}
  for (const q of keys.queries) {
    const hit = perf.byQuery[q]
    if (hit) byQuery[q] = hit
  }
  return { byPath, byQuery, window: perf.window, fetchedAt: perf.fetchedAt }
}

/** Small stable hash, so the cache key reflects which keys were projected. */
function fnv1a(input: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/**
 * Cached per window, so flipping between ranges (or several people loading the
 * tool) doesn't re-hit Search Console each time. Keyed on the dates because the
 * page reads searchParams and is therefore rendered dynamically — without this
 * the API call would happen on literally every request.
 *
 * Same one-hour freshness the page previously got from `revalidate = 3600`,
 * moved down to the data layer where it still applies now that the route is
 * dynamic. Follows the unstable_cache pattern already used in app/sitemap.ts.
 *
 * Only the projected result is cached — see projectGscPerformance for why that
 * isn't merely an optimisation. The key set is hashed into the cache key so a
 * catalog change can't serve a stale projection missing the new entries.
 */
export function getCachedGscPerformance(
  window: { start: string; end: string },
  keys: GscKeySet
) {
  const keyHash = fnv1a(`${keys.paths.join("|")}##${keys.queries.join("|")}`)
  return unstable_cache(
    async () => {
      const full = await getGscPerformance(window)
      return full ? projectGscPerformance(full, keys) : null
    },
    ["gsc-performance", window.start, window.end, keyHash],
    { revalidate: 3600, tags: ["gsc-performance"] }
  )()
}
