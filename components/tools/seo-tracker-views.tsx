"use client"

import { useState } from "react"
import { ExternalLink } from "lucide-react"
import type { Intent } from "@/lib/seo-keyword-catalog"

export interface RowMetrics {
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface KeywordChip {
  kw: string
  position: number | null // set when GSC has an exact query match with impressions
}

export interface PageRow {
  intent: Intent
  category: string
  path: string
  label: string
  templated?: boolean
  representativePath?: string
  liveHref: string
  metrics: RowMetrics | null // page-level; null when no impressions in the window
  keywords: KeywordChip[]
}

type View = "grouped" | "best" | "worst"

const INTENT_META: Record<Intent, { label: string; blurb: string; accent: string; dot: string }> = {
  service: { label: "Service Keywords", blurb: "Commercial / local intent — find, hire, rent, buy", accent: "text-blue-700 bg-blue-50 border-blue-200", dot: "bg-blue-500" },
  informational: { label: "Informational Keywords", blurb: "How-to, guides, exam, license, economics", accent: "text-emerald-700 bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  platform: { label: "Platform Comparison", blurb: "Software review / alternatives", accent: "text-purple-700 bg-purple-50 border-purple-200", dot: "bg-purple-500" },
  brand: { label: "Brand / Thought-Leadership", blurb: "B2B positioning — not the local-SEO push", accent: "text-slate-600 bg-slate-100 border-slate-200", dot: "bg-slate-400" },
}

const INTENT_ORDER: Intent[] = ["service", "informational", "platform", "brand"]

function posClass(pos: number | null): string {
  if (pos == null) return "bg-slate-100 text-slate-400 border-slate-200"
  if (pos <= 10) return "bg-emerald-100 text-emerald-800 border-emerald-300"
  if (pos <= 20) return "bg-amber-100 text-amber-800 border-amber-300"
  return "bg-rose-100 text-rose-800 border-rose-300"
}

const fmtInt = (n: number) => n.toLocaleString()
const fmtPos = (n: number) => n.toFixed(1)
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`

function PageCard({ row, showContext }: { row: PageRow; showContext?: boolean }) {
  const m = row.metrics
  const hasData = !!m && m.impressions > 0
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      {showContext && (
        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span className={`h-2 w-2 rounded-full ${INTENT_META[row.intent].dot}`} />
          {row.category}
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <a
            href={row.liveHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-black text-slate-900 hover:text-blue-700 transition-colors"
          >
            {row.label}
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          </a>
          <div className="text-[11px] text-slate-400 truncate">
            {row.path}
            {row.templated && <span className="ml-1 rounded bg-slate-100 px-1 py-0.5 text-slate-500">templated · e.g. {row.representativePath}</span>}
          </div>
        </div>
        <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-black tabular-nums ${posClass(hasData ? m!.position : null)}`}>
          {hasData ? `#${fmtPos(m!.position)}` : "—"}
        </span>
      </div>

      {hasData ? (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
          <span><b className="text-slate-700 tabular-nums">{fmtInt(m!.impressions)}</b> impr</span>
          <span><b className="text-slate-700 tabular-nums">{fmtInt(m!.clicks)}</b> clicks</span>
          <span><b className="text-slate-700 tabular-nums">{fmtPct(m!.ctr)}</b> CTR</span>
        </div>
      ) : (
        <div className="mt-2 text-[11px] text-slate-400">No GSC impressions in the last 28 days.</div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {row.keywords.map((k) => (
          <span key={k.kw} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
            {k.kw}
            {k.position != null && (
              <span className={`rounded px-1 text-[10px] font-black tabular-nums border ${posClass(k.position)}`}>#{fmtPos(k.position)}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

const TABS: { id: View; label: string; hint: string }[] = [
  { id: "grouped", label: "By Intent", hint: "Grouped — default" },
  { id: "best", label: "Best Ranking First", hint: "Lowest position # at top" },
  { id: "worst", label: "Worst Ranking First", hint: "Highest position # at top" },
]

export function SeoTrackerViews({ rows }: { rows: PageRow[] }) {
  const [view, setView] = useState<View>("grouped")

  const ranked = rows.filter((r) => r.metrics && r.metrics.impressions > 0)
  const noData = rows.filter((r) => !r.metrics || r.metrics.impressions === 0)

  const sorted =
    view === "best"
      ? [...ranked].sort((a, b) => a.metrics!.position - b.metrics!.position)
      : view === "worst"
        ? [...ranked].sort((a, b) => b.metrics!.position - a.metrics!.position)
        : []

  return (
    <div>
      {/* View tabs */}
      <div className="mt-6 inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            title={t.hint}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              view === t.id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Grouped (default) view */}
      {view === "grouped" && (
        <div>
          {INTENT_ORDER.map((intent) => {
            const intentRows = rows.filter((r) => r.intent === intent)
            if (!intentRows.length) return null
            const meta = INTENT_META[intent]
            // Preserve category order as they appear in the catalog.
            const categories: string[] = []
            for (const r of intentRows) if (!categories.includes(r.category)) categories.push(r.category)
            return (
              <section key={intent} className="mt-10">
                <div className="flex items-center gap-3">
                  <h2 className={`text-sm font-black uppercase tracking-widest rounded-lg border px-3 py-1 ${meta.accent}`}>{meta.label}</h2>
                  <span className="text-xs text-slate-400">{meta.blurb}</span>
                </div>
                {categories.map((cat) => (
                  <div key={cat} className="mt-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{cat}</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {intentRows.filter((r) => r.category === cat).map((row) => (
                        <PageCard key={row.path} row={row} />
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            )
          })}
        </div>
      )}

      {/* Sorted views */}
      {(view === "best" || view === "worst") && (
        <div className="mt-6">
          <p className="mb-3 text-xs text-slate-400">
            {view === "best"
              ? "Ranked pages, best average position first. "
              : "Ranked pages, worst average position first. "}
            {ranked.length} pages with GSC impressions · {noData.length} with no data (listed at the bottom).
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {sorted.map((row) => (
              <PageCard key={row.path} row={row} showContext />
            ))}
          </div>

          {noData.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">No GSC data (28d) — {noData.length} pages</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {noData.map((row) => (
                  <PageCard key={row.path} row={row} showContext />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
