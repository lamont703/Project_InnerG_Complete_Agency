"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Circle, Printer, RotateCcw, Tag, TagIcon } from "lucide-react"

export interface KitItem {
  label: string
  hint?: string
}

export interface KitGroup {
  title: string
  note?: string
  mustLabel?: boolean // items in this group must carry a label
  items: KitItem[]
}

const STORAGE_KEY = "tx-barber-kit-checklist-v2026"

export function KitChecklist({ groups }: { groups: KitGroup[] }) {
  const allItems = groups.flatMap((g) => g.items.map((i) => i.label))
  const total = allItems.length

  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setChecked(JSON.parse(raw))
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checked))
    } catch {
      /* ignore */
    }
  }, [checked, hydrated])

  const doneCount = allItems.filter((l) => checked[l]).length
  const pct = total ? Math.round((doneCount / total) * 100) : 0

  const toggle = (label: string) => setChecked((c) => ({ ...c, [label]: !c[label] }))
  const reset = () => setChecked({})

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-6 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="text-xl font-black text-slate-900">Interactive kit checklist</h2>
        <div className="flex items-center gap-2 no-print">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save as PDF
          </button>
        </div>
      </div>
      <p className="text-sm text-slate-500 font-medium mb-4">
        Tick items as you pack — your progress is saved on this device. Print or save it as a PDF to check your bag the night before.
      </p>

      {/* Progress */}
      <div className="mb-6 no-print">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
          <span>{doneCount} of {total} packed</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.title}>
            <div className="flex items-center gap-2 mb-2">
              {group.mustLabel ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-800">
                  <Tag className="w-3 h-3" /> Must be labeled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                  <TagIcon className="w-3 h-3" /> Do NOT label
                </span>
              )}
              <h3 className="text-sm font-black text-slate-900">{group.title}</h3>
            </div>
            {group.note && <p className="text-xs text-slate-500 mb-2">{group.note}</p>}
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
              {group.items.map((item) => {
                const isOn = !!checked[item.label]
                return (
                  <li key={item.label}>
                    <button
                      onClick={() => toggle(item.label)}
                      className="flex w-full items-start gap-2 text-left text-sm py-1 group"
                    >
                      {isOn ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300 group-hover:text-slate-400 shrink-0 mt-0.5" />
                      )}
                      <span className={isOn ? "text-slate-400 line-through" : "text-slate-700"}>
                        {item.label}
                        {item.hint && <span className="block text-[11px] text-slate-400 no-underline">{item.hint}</span>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
