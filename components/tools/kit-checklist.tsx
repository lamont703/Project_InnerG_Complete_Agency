"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CheckCircle2, Circle, Cloud, Printer, RotateCcw, Tag, TagIcon } from "lucide-react"
import { DownloadPdfButton } from "@/components/tools/download-pdf-button"
import { syncChecklist, toggleChecklistItem, resetChecklist } from "@/components/tools/checklist-actions"
import { createBrowserClient } from "@/lib/supabase/browser"

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

/**
 * THE OLD KEY, AND WHY IT WAS A BUG.
 *
 * One constant — "tx-barber-kit-checklist-v2026" — was used by all seven kit
 * pages. The component even read `pathname` and never applied it. So a
 * cosmetology student's ticks showed up on the barber list, and any item whose
 * label appeared on two pages was shared between them. Keyed by path now, so
 * each licence keeps its own list.
 *
 * The legacy key is adopted once, on the page it was actually written by, so
 * nobody who packed half a bag loses it to the fix.
 */
const LEGACY_KEY = "tx-barber-kit-checklist-v2026"
const LEGACY_PATH = "/texas-barber-practical-exam-kit-list"
const storageKey = (pathname: string) => `shearquery.kit.v1:${pathname}`

export function KitChecklist({ groups }: { groups: KitGroup[] }) {
  // The checklist is mounted on several kit pages; each one keeps its own list.
  const pathname = usePathname()
  const allItems = groups.flatMap((g) => g.items.map((i) => i.label))
  const total = allItems.length

  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [hydrated, setHydrated] = useState(false)
  // Null until the sync answers. Anonymous is the normal case and everything
  // below works identically either way — the account only adds the sync.
  const [isMember, setIsMember] = useState<boolean | null>(null)

  useEffect(() => {
    const key = storageKey(pathname)
    let local: Record<string, boolean> = {}
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        local = JSON.parse(raw)
      } else if (pathname === LEGACY_PATH) {
        const legacy = localStorage.getItem(LEGACY_KEY)
        if (legacy) local = JSON.parse(legacy)
      }
      setChecked(local)
    } catch {
      /* ignore */
    }
    setHydrated(true)

    // Then reconcile with the account — but only if there is one.
    //
    // getSession() reads the local cookie and makes no network call, so an
    // anonymous visitor costs nothing. That guard matters here more than
    // anywhere else in this feature: these are the highest-traffic pages on
    // the site and the overwhelming majority of the people on them are not
    // signed in. Firing a server action for all of them to be told "no" would
    // put a round trip in front of the site's best content to serve a minority.
    ;(async () => {
      try {
        const supabase = createBrowserClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
          setIsMember(false)
          return
        }

        const localKeys = Object.keys(local).filter((k) => local[k])
        const result = await syncChecklist(key, localKeys)
        setIsMember(result.isMember)
        if (result.isMember) {
          const merged: Record<string, boolean> = {}
          for (const item of result.items) merged[item] = true
          setChecked(merged)
        }
      } catch {
        // Ticking still works; it just stays on this device.
        setIsMember(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(storageKey(pathname), JSON.stringify(checked))
    } catch {
      /* ignore */
    }
  }, [checked, hydrated, pathname])

  const doneCount = allItems.filter((l) => checked[l]).length
  const pct = total ? Math.round((doneCount / total) * 100) : 0

  const toggle = (label: string) => {
    const next = !checked[label]
    // Local state first, always. The tick has to feel instant and has to work
    // with no network — the person doing this is often packing, not browsing.
    setChecked((c) => ({ ...c, [label]: next }))
    if (isMember) void toggleChecklistItem(storageKey(pathname), label, next).catch(() => {})
  }

  const reset = () => {
    setChecked({})
    if (isMember) void resetChecklist(storageKey(pathname)).catch(() => {})
  }

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
          {/* Server-rendered download is the primary path — it can't hang on a
              wedged local print pipeline. Print stays as a secondary option for
              anyone who actually wants paper. */}
          <DownloadPdfButton path={pathname} />
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>
      <p className="text-sm text-slate-500 font-medium mb-4">
        {isMember
          ? "Tick items as you pack — saved to your account, so this list is the same on your phone at the exam."
          : "Tick items as you pack — your progress is saved on this device. Print or save it as a PDF to check your bag the night before."}
      </p>

      {/* The offer, placed where it's worth something: after someone has
          started ticking. Nobody needs an account to use this list, and being
          asked before you've done anything is just a toll booth. */}
      {isMember === false && doneCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-blue-100 bg-blue-50/70 px-3.5 py-2.5 no-print">
          <Cloud className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-xs font-bold text-blue-900">
            This list lives on this device only.
          </span>
          <Link
            href="/membership?for=student"
            onClick={() => (window as any).innerG?.track?.("kit_checklist_signup_invite_clicked", { checked: doneCount })}
            className="text-xs font-black text-blue-700 underline underline-offset-2"
          >
            Save it to a free account
          </Link>
          <span className="text-xs text-blue-800">and it&apos;s on your phone at the exam too.</span>
        </div>
      )}

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

      {/* print-keep: each item is a <button> holding its own tick state, and the
          global print stylesheet hides buttons. Without this the checklist —
          the whole reason anyone prints this page — comes out empty. */}
      <div className="space-y-6 print-keep">
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
