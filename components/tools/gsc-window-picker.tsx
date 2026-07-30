"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CalendarRange, Loader2 } from "lucide-react"
import { GSC_PRESETS } from "@/lib/gsc-window"

/**
 * Date-range control for the SEO keyword tracker.
 *
 * State lives in the URL rather than in component state, so a window can be
 * shared or bookmarked and a reload doesn't silently snap back to 28 days. The
 * server resolves and clamps whatever arrives (lib/gsc-window.ts) — this
 * component only proposes a range, it doesn't decide what's valid.
 */
export function GscWindowPicker({
  activePreset,
  start,
  end,
  min,
  max,
}: {
  /** Preset key currently in effect, or "custom". */
  activePreset: string
  /** Resolved window, used to seed the custom inputs. */
  start: string
  end: string
  /** Selectable bounds, from Search Console's lag and retention limits. */
  min: string
  max: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const [customOpen, setCustomOpen] = useState(activePreset === "custom")
  const [from, setFrom] = useState(start)
  const [to, setTo] = useState(end)

  /** Replace the window params, preserving anything else on the URL. */
  const go = (params: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(params)) {
      if (v === null) next.delete(k)
      else next.set(k, v)
    }
    startTransition(() => {
      router.push(`?${next.toString()}`, { scroll: false })
    })
  }

  const applyPreset = (key: string) => {
    setCustomOpen(false)
    // Clear the custom dates, or they'd take precedence server-side.
    go({ preset: key, start: null, end: null })
  }

  const applyCustom = () => go({ start: from, end: to, preset: null })

  const customInvalid = !from || !to

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <CalendarRange className="h-3.5 w-3.5" />
          Date range
        </span>

        {GSC_PRESETS.map((p) => {
          const active = activePreset === p.key
          return (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              disabled={pending}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-50 ${
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          )
        })}

        <button
          onClick={() => setCustomOpen((v) => !v)}
          disabled={pending}
          className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-50 ${
            activePreset === "custom"
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          Custom…
        </button>

        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
      </div>

      {customOpen && (
        <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">From</span>
            <input
              type="date"
              value={from}
              min={min}
              max={max}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-900 outline-none focus:border-slate-400"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">To</span>
            <input
              type="date"
              value={to}
              min={min}
              max={max}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-900 outline-none focus:border-slate-400"
            />
          </label>
          <button
            onClick={applyCustom}
            disabled={pending || customInvalid}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            Apply
          </button>
          <span className="text-[10px] text-slate-400">
            Search Console has data from {min} to {max}.
          </span>
        </div>
      )}
    </div>
  )
}
