"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Lock, ShieldAlert, Loader2, ArrowRight } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/browser"

// Screensaver gate for the footer's "Internal Tools" pages
// (middleware.ts's INTERNAL_TOOL_ROUTES) — rewritten on top of the real
// destination so the URL bar never changes. Deliberately single-user and
// password-only for now (no email field, no "forgot password" link);
// tighter, general-purpose internal-tool access control is planned later.
const ALLOWED_EMAIL = "lamont703@gmail.com"

function InternalLockContent() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/"

  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createBrowserClient()
      // Clears out any other logged-in account first so a stale session
      // for a different user can't linger if this sign-in fails.
      await supabase.auth.signOut()

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: ALLOWED_EMAIL,
        password,
      })

      if (authError) {
        setError("Incorrect password.")
        setIsSubmitting(false)
        return
      }

      // Hard navigation (not router.push) so the fresh auth cookie is
      // guaranteed to be present when middleware re-evaluates this exact
      // URL from scratch.
      window.location.href = redirectTo
    } catch (err) {
      console.error("[InternalLock] Unexpected error:", err)
      setError("Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen light bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg shadow-black/40">
            <Lock className="h-6 w-6 text-slate-400" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-xl font-black text-white mb-2">Internal Tools Locked</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            This page is restricted. Enter the password for{" "}
            <span className="font-semibold text-slate-300">{ALLOWED_EMAIL}</span> to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl shadow-black/30">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Password</label>
            <input
              type="password"
              required
              autoFocus
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border-2 border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-0 transition-all outline-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-3 text-sm font-black uppercase tracking-[0.15em] rounded-xl transition-all shadow-lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                Unlock
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function InternalLockPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <InternalLockContent />
    </Suspense>
  )
}
