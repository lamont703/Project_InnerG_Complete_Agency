import { google } from "googleapis"

// Live Google Search Console performance for the SEO keyword tracker.
// Reuses the same OAuth-refresh-token pattern as scripts/gsc_*.js. Read-only.

export interface GscMetrics {
  clicks: number
  impressions: number
  ctr: number // 0..1
  position: number
}

export interface GscPerformance {
  byPath: Record<string, GscMetrics> // pathname -> aggregated metrics
  byQuery: Record<string, GscMetrics> // lowercased query -> metrics
  window: { start: string; end: string }
  fetchedAt: string
}

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_GSC_REFRESH_TOKEN, GSC_SITE_URL } = process.env

const iso = (d: Date) => d.toISOString().slice(0, 10)

export async function getGscPerformance(days = 28): Promise<GscPerformance | null> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_GSC_REFRESH_TOKEN || !GSC_SITE_URL) {
    return null
  }

  try {
    const oauth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
    oauth.setCredentials({ refresh_token: GOOGLE_GSC_REFRESH_TOKEN })
    const sc = google.searchconsole({ version: "v1", auth: oauth })

    // GSC data lags ~2 days.
    const end = new Date(Date.now() - 2 * 86400000)
    const start = new Date(end.getTime() - (days - 1) * 86400000)
    const startDate = iso(start)
    const endDate = iso(end)

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
    console.error("[gsc-performance] fetch failed:", (e as Error).message)
    return null
  }
}
