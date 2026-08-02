import Link from "next/link"
import { Search, TrendingUp, Hash, AlertTriangle, MousePointerClick, Eye } from "lucide-react"
import {
  getCachedGscPerformance,
  gscLastFailure,
  gscMissingConfig,
  type GscMetrics,
  type GscPerformance,
  type GscUnavailableReason,
} from "@/lib/gsc-performance"
import {
  resolveGscWindow,
  latestAvailableDay,
  earliestAvailableDay,
  windowShortLabel,
} from "@/lib/gsc-window"
import { GscWindowPicker } from "@/components/tools/gsc-window-picker"
import { SEO_KEYWORD_CATALOG, SITE_ORIGIN, catalogTotals, catalogGscKeys, type KeywordPage } from "@/lib/seo-keyword-catalog"
import { SeoTrackerViews, type PageRow } from "@/components/tools/seo-tracker-views"

// Internal tool (gated by middleware INTERNAL_TOOL_ROUTES → /internal-lock).
//
// Reading searchParams makes this route dynamic, so the old page-level
// `revalidate = 3600` no longer applies. The hourly caching moved down to
// getCachedGscPerformance, which is keyed per date window — otherwise every
// range flip would be a fresh Search Console round-trip.

export const metadata = {
  title: "SEO Keyword Tracker | Internal",
  robots: { index: false, follow: false },
}

const fmtInt = (n: number) => n.toLocaleString()

function metricsFor(page: KeywordPage, perf: GscPerformance | null): GscMetrics | null {
  if (!perf) return null
  const key = page.templated ? page.representativePath : page.path
  if (!key) return null
  return perf.byPath[key] || null
}

export default async function SeoKeywordTrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; start?: string; end?: string }>
}) {
  const sp = await searchParams
  // The server owns clamping: whatever arrives on the URL is reconciled against
  // Search Console's 2-day lag and ~16-month retention before it's queried, and
  // the same resolved window drives every label below.
  const win = resolveGscWindow({ preset: sp.preset, start: sp.start, end: sp.end })
  // Only the keys this page reads are fetched into cache — the raw response is
  // ~3MB and would exceed Next's data-cache limit.
  const perf = await getCachedGscPerformance({ start: win.start, end: win.end }, catalogGscKeys())

  // Why it's missing, when it is. gscLastFailure() only reflects a run that
  // actually happened — unstable_cache serves a cached null without re-entering
  // the function, so on a cache hit there is no recorded reason. The config
  // check needs no network and is always current, so it fills that gap: the
  // common case (credentials absent on this deployment) still explains itself.
  let gscFailure: GscUnavailableReason | null = null
  if (!perf) {
    const missing = gscMissingConfig()
    gscFailure = missing.length ? { kind: "not-configured", missing } : gscLastFailure()
  }
  const totals = catalogTotals()
  const shortLabel = windowShortLabel(win)
  const iso = (d: Date) => d.toISOString().slice(0, 10)

  // Flatten the catalog into serializable rows joined with live GSC metrics.
  const rows: PageRow[] = []
  for (const cat of SEO_KEYWORD_CATALOG) {
    for (const page of cat.pages) {
      const m = metricsFor(page, perf)
      rows.push({
        intent: cat.intent,
        category: cat.title,
        path: page.path,
        label: page.label,
        templated: page.templated,
        representativePath: page.representativePath,
        liveHref: SITE_ORIGIN + (page.templated ? page.representativePath || page.path : page.path),
        metrics: m ? { clicks: m.clicks, impressions: m.impressions, ctr: m.ctr, position: m.position } : null,
        keywords: page.keywords.map((kw) => {
          const q = perf?.byQuery[kw.toLowerCase().trim()]
          return { kw, position: q && q.impressions > 0 ? q.position : null }
        }),
      })
    }
  }

  // Roll-up across pages that have GSC data.
  let totImpr = 0
  let totClicks = 0
  let page1 = 0
  let ranking = 0
  for (const r of rows) {
    if (!r.metrics || r.metrics.impressions === 0) continue
    totImpr += r.metrics.impressions
    totClicks += r.metrics.clicks
    ranking++
    if (r.metrics.position <= 10) page1++
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-5 py-10">
        {/* Header */}
        <div className="flex items-start gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
            <Search className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">SEO Keyword Tracker</h1>
            <p className="text-sm text-slate-500">
              Every long-tail keyword our published content targets, with live Google Search Console performance per page.
            </p>
          </div>
        </div>

        {/* Date range */}
        <GscWindowPicker
          activePreset={win.preset}
          start={win.start}
          end={win.end}
          min={iso(earliestAvailableDay())}
          max={iso(latestAvailableDay())}
        />

        {/* Any clamping the server applied to the requested range. */}
        {win.notice && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {win.notice}
          </div>
        )}

        {/* GSC status banner */}
        {perf ? (
          <div className="mt-4 text-xs text-slate-500">
            Live GSC · {perf.window.start} → {perf.window.end} ({win.days} days · {win.label}) · fetched {new Date(perf.fetchedAt).toLocaleString()}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Live GSC data unavailable — showing the keyword catalog without performance metrics.
            </div>
            {/* The three causes need three different fixes, and the generic
                message above sent people to check the token when the usual
                culprit is a missing env var on the deployment. Say which. */}
            {gscFailure?.kind === "not-configured" && (
              <p className="mt-1.5 font-normal">
                Search Console credentials are not set on this deployment. Missing:{" "}
                <span className="font-mono font-semibold">{gscFailure.missing.join(", ")}</span>. Add them to the
                hosting environment and redeploy — env vars are not picked up by an existing deployment.
              </p>
            )}
            {gscFailure?.kind === "auth-failed" && (
              <p className="mt-1.5 font-normal">
                Google rejected the credentials (<span className="font-mono">{gscFailure.detail}</span>). A refresh
                token only works with the OAuth client that minted it, so this is almost always{" "}
                <span className="font-mono font-semibold">GOOGLE_INTERNAL_CLIENT_ID</span>/
                <span className="font-mono font-semibold">_SECRET</span> missing here — the code then falls back to
                the customer-facing app client, which never issued this token. Set both and redeploy, or re-mint the
                token with <span className="font-mono">scripts/gsc_oauth_setup.js</span>.
              </p>
            )}
            {gscFailure?.kind === "api-error" && (
              <p className="mt-1.5 font-normal">
                Search Console returned an error (<span className="font-mono">{gscFailure.detail}</span>). Credentials
                look correct, so this is likely transient or a quota limit — the catalog below is unaffected.
              </p>
            )}
          </div>
        )}

        {/* Summary tiles */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Target Pages", value: fmtInt(totals.pages), icon: <Hash className="h-4 w-4" /> },
            { label: "Keywords", value: fmtInt(totals.keywords), icon: <Search className="h-4 w-4" /> },
            { label: "Pages Ranking", value: fmtInt(ranking), icon: <TrendingUp className="h-4 w-4" /> },
            { label: "On Page 1", value: fmtInt(page1), icon: <TrendingUp className="h-4 w-4 text-emerald-600" /> },
            { label: `${shortLabel} Impressions`, value: fmtInt(totImpr), icon: <Eye className="h-4 w-4" /> },
            { label: `${shortLabel} Clicks`, value: fmtInt(totClicks), icon: <MousePointerClick className="h-4 w-4" /> },
          ].map((t) => (
            <div key={t.label} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t.icon}
                {t.label}
              </div>
              <div className="mt-1 text-xl font-black tabular-nums">{t.value}</div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
          <span className="text-slate-400">Position:</span>
          <span className="rounded border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-emerald-800">Page 1 (≤10)</span>
          <span className="rounded border border-amber-300 bg-amber-100 px-2 py-0.5 text-amber-800">Page 2 (11–20)</span>
          <span className="rounded border border-rose-300 bg-rose-100 px-2 py-0.5 text-rose-800">Page 3+ (&gt;20)</span>
          <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-slate-400">No data</span>
          <span className="ml-2 text-slate-400">Chips show per-keyword position where GSC has an exact query match.</span>
        </div>

        {/* Views (default grouped-by-intent + best/worst ranking sorts) */}
        <SeoTrackerViews rows={rows} />

        <div className="mt-12 border-t border-slate-200 pt-4 text-xs text-slate-400">
          Catalog source: <code className="text-slate-500">lib/seo-keyword-catalog.ts</code> (mirrors <code className="text-slate-500">SEO_KEYWORD_TRACKER.md</code>). Performance: live Google Search Console, page + query dimensions, {win.start} → {win.end}.
        </div>
        <div className="mt-2">
          <Link href="/" className="text-xs font-semibold text-blue-600 hover:underline">← Back to site</Link>
        </div>
      </div>
    </main>
  )
}
