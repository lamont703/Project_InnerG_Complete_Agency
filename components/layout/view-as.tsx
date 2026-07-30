"use client"

import { useCallback, useEffect, useState } from "react"
import { Eye, EyeOff, Loader2, Search, ShieldCheck, X } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/browser"
import { isAdminEmail } from "@/lib/admin-allowlist"

/**
 * Client half of View As (see lib/account/view-as.ts for the server half and the
 * security reasoning).
 *
 * Nothing here is a security control. The admin check below decides only whether
 * to *render* a control and whether to bother calling the API at all — the API
 * re-derives admin status from the real session on every request, so a user who
 * patches this check in their own browser gains exactly nothing.
 *
 * The check does matter for cost: the navbar mounts on nearly every page for
 * every visitor, and only an admin can ever have a View As session, so a
 * non-admin should make zero extra requests. getSession() reads the locally
 * stored session rather than calling the auth server, so the common case costs
 * nothing at all.
 */

export interface ViewAsMemberSummary {
  memberId: string
  userId: string | null
  name: string
  email: string | null
  claimedType?: string | null
}

export interface EffectiveAccount {
  label: string
  projects: Array<{ slug: string; name: string; href: string }>
}

interface ViewAsState {
  loading: boolean
  isAdmin: boolean
  viewingAs: ViewAsMemberSummary | null
  effectiveAccount: EffectiveAccount | null
  members: ViewAsMemberSummary[]
}

const EMPTY: ViewAsState = {
  loading: true,
  isAdmin: false,
  viewingAs: null,
  effectiveAccount: null,
  members: [],
}

export function useViewAs() {
  const [state, setState] = useState<ViewAsState>(EMPTY)

  const load = useCallback(async () => {
    const supabase = createBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    const email = session?.user?.email

    if (!isAdminEmail(email)) {
      setState({ ...EMPTY, loading: false })
      return
    }

    try {
      const res = await fetch("/api/admin/view-as", { cache: "no-store" })
      // A 401/403 here means the server disagrees that we're an admin — trust
      // the server, render nothing.
      if (!res.ok) {
        setState({ ...EMPTY, loading: false })
        return
      }
      const json = await res.json()
      setState({
        loading: false,
        isAdmin: !!json.isAdmin,
        viewingAs: json.viewingAs ?? null,
        effectiveAccount: json.effectiveAccount ?? null,
        members: json.members ?? [],
      })
    } catch {
      setState({ ...EMPTY, loading: false })
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { ...state, refresh: load }
}

/**
 * Server-rendered pages (every /account/* page, listing insights, ad
 * performance) resolve the member from the cookie during render, so switching
 * has to be a real navigation rather than a client state update — router
 * .refresh() alone would leave any already-fetched client data in place. A full
 * reload is the honest way to guarantee the whole page reflects the change.
 */
async function setViewAs(memberId: string | null) {
  const res = await fetch("/api/admin/view-as", {
    method: memberId ? "POST" : "DELETE",
    headers: memberId ? { "Content-Type": "application/json" } : undefined,
    body: memberId ? JSON.stringify({ memberId }) : undefined,
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json?.error || "Could not switch View As.")
  }
  window.location.reload()
}

const CLAIM_LABELS: Record<string, string> = {
  shop: "barbershop",
  salon: "salon",
  barber: "barber",
  cosmetologist: "cosmetologist",
  school: "school",
  store: "supply store",
}

/**
 * The persistent reminder. Rendered globally from the root layout, because the
 * one genuinely dangerous thing about this feature is forgetting it's on and
 * mistaking another member's account for your own.
 *
 * Bottom-left on purpose: the navbar is fixed to the top, and the scroll CTA
 * occupies the bottom-right.
 */
export function ViewAsBar() {
  const { viewingAs } = useViewAs()
  const [exiting, setExiting] = useState(false)

  if (!viewingAs) return null

  return (
    <div className="fixed bottom-4 left-4 z-[60] max-w-[calc(100vw-2rem)]">
      <div className="flex items-center gap-3 rounded-xl border border-amber-400/60 bg-amber-950/95 px-4 py-2.5 shadow-xl backdrop-blur">
        <Eye className="h-4 w-4 shrink-0 text-amber-300" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-xs font-bold text-amber-100">
            Viewing as {viewingAs.name}
          </p>
          <p className="truncate text-[10px] text-amber-300/80">
            {viewingAs.email} · read-only
          </p>
        </div>
        <button
          onClick={async () => {
            setExiting(true)
            try { await setViewAs(null) } finally { setExiting(false) }
          }}
          disabled={exiting}
          className="ml-1 flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-amber-950 transition-colors hover:bg-amber-300 disabled:opacity-60"
        >
          {exiting ? <Loader2 className="h-3 w-3 animate-spin" /> : <EyeOff className="h-3 w-3" />}
          Exit
        </button>
      </div>
    </div>
  )
}

/**
 * The member picker.
 *
 * Deliberately NOT owned by ViewAsMenuItem. The menu item lives inside the
 * navbar's `{isAccountOpen && …}` / `{isMobileOpen && …}` blocks, and opening the
 * picker closes that menu — which unmounts anything rendered in there along with
 * its state. So the navbar owns the open/closed state and renders this as a
 * sibling of <header>, where it also gets its own stacking context above the
 * fixed navbar and the View As bar.
 */
export function ViewAsPicker({
  members,
  activeMemberId,
  onClose,
}: {
  members: ViewAsMemberSummary[]
  activeMemberId: string | null
  onClose: () => void
}) {
  const [query, setQuery] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const needle = query.trim().toLowerCase()
  const shown = needle
    ? members.filter((m) =>
        `${m.name} ${m.email ?? ""}`.toLowerCase().includes(needle)
      )
    : members

  const choose = async (memberId: string) => {
    setBusyId(memberId)
    setError(null)
    try {
      await setViewAs(memberId)
    } catch (e: any) {
      setError(e?.message || "Could not switch View As.")
      setBusyId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/60 p-4 pt-24 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              View site as a member
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Shows you their menu, their listing pages and their insights. Read-only —
              nothing you open can be edited while this is on.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search members by name or email"
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {error && (
          <p className="border-b border-rose-100 bg-rose-50 px-5 py-2.5 text-xs font-semibold text-rose-700">
            {error}
          </p>
        )}

        <div className="max-h-80 overflow-y-auto py-1">
          {shown.length === 0 && (
            <p className="px-5 py-6 text-center text-xs text-slate-400">
              No members match “{query}”.
            </p>
          )}
          {shown.map((m) => {
            const active = m.memberId === activeMemberId
            return (
              <button
                key={m.memberId}
                onClick={() => choose(m.memberId)}
                disabled={!!busyId}
                className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors disabled:opacity-60 ${
                  active ? "bg-indigo-50" : "hover:bg-slate-50"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{m.name}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {m.email || "no email on record"}
                    {m.claimedType && (
                      <> · claimed a {CLAIM_LABELS[m.claimedType] || m.claimedType}</>
                    )}
                    {!m.userId && <> · never signed in</>}
                  </p>
                </div>
                {busyId === m.memberId ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-600" />
                ) : active ? (
                  <span className="shrink-0 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                    Current
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * Account-menu entry. Renders nothing for non-admins, so it can be dropped into
 * the shared navbar unconditionally.
 *
 * Stateless on purpose — see the note on ViewAsPicker. It only reports the click;
 * the navbar decides to open the picker and to close its own menu.
 */
export function ViewAsMenuItem({
  isAdmin,
  onClick,
  className,
}: {
  isAdmin: boolean
  onClick: () => void
  className?: string
}) {
  if (!isAdmin) return null

  return (
    <button
      onClick={onClick}
      className={
        className ||
        "flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-foreground"
      }
    >
      <Eye className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      View As: Member Select
    </button>
  )
}
