"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/browser"
import { audienceFromParam, type AudienceId } from "@/lib/audiences"
import { toast } from "sonner"

/**
 * Funnel instrumentation for this form.
 *
 * WHY. The pixel could already show someone reaching this page, scrolling it,
 * and leaving without an account — but nothing about what happened between. A
 * failed submit, a validation error and an idle refresh were indistinguishable,
 * so "why did that claim not convert?" was unanswerable. These events make the
 * difference visible: which field they stopped at, how far they got, and
 * whether the server rejected them.
 *
 * WHAT IS NEVER SENT: field values. Not one, not truncated, not hashed. This
 * form takes a password, and a pixel that ships input values is a credential
 * leak with an analytics dashboard attached. Only the field NAME and whether it
 * currently holds anything ever leaves the browser.
 */
const FIELDS = ["firstName", "lastName", "email", "phone", "password", "confirmPassword"] as const
type FieldName = (typeof FIELDS)[number]

/** Fire-and-forget: analytics must never be able to break a signup. */
function track(event: string, payload: Record<string, unknown>) {
  try {
    ;(window as any).innerG?.track?.(event, payload)
  } catch {
    /* pixel absent or throwing — the form carries on regardless */
  }
}

// Modeled on BarberRegisterForm's shadow-auth-handshake pattern (register
// via the admin-privileged API route, then sign in client-side with the
// same credentials) but deliberately simpler — one fixed membership tier,
// no school/role selection, since the only benefit right now is search
// visibility, not a business dashboard.
export interface CommunityMembershipFormProps {
  /**
   * Which doorway rendered this form.
   *
   * The ?src= query param covers links INTO /membership, but this form is also
   * rendered directly on /login, where there is no query string to read. Without
   * this prop every login-door signup would record a null source — which is the
   * exact gap the comment on signupSource describes, just arriving from a
   * different direction.
   */
  source?: string
  /**
   * Who this doorway serves, when the page already knows.
   *
   * Unlike `source`, the QUERY PARAM WINS over this prop, and the asymmetry is
   * deliberate. `source` is the component's own knowledge — which page rendered
   * it — and no query string can know that better. `audience` is a claim about
   * the PERSON, and someone who followed a `?for=` link has asserted it about
   * themselves; that should beat a page's default.
   *
   * Without this, every signup from a page with no `?for=` in the URL resolved
   * to DEFAULT_AUDIENCE ("professional") and was routed to /search. Someone
   * three questions into a state-board practice exam is a student, and the
   * student route is /account/journey — the setup that turns the account on.
   */
  audience?: AudienceId
}

export function CommunityMembershipForm({ source, audience }: CommunityMembershipFormProps = {}) {
  // Claim context handed over by ClaimShopButton. When present, signup also
  // links this member to the entity so the "Claimed" badge turns on.
  const searchParams = useSearchParams()
  const claimEntityType = searchParams.get("claim_type")
  const claimEntityId = searchParams.get("claim_id")
  const claimEntityName = searchParams.get("claim_name")
  const isClaiming = Boolean(claimEntityType && claimEntityId)

  // Signup intent handed over by the free audit tool (?next=connect). Someone
  // who arrived that way came to connect Google, not to read a membership page,
  // so they're taken straight into the OAuth flow once the account exists.
  //
  // Whitelisted to a known destination rather than redirecting to whatever the
  // query string says: an arbitrary post-signup redirect is a phishing
  // primitive, and this form is exactly the kind of page worth abusing.
  const nextIntent = searchParams.get("next")
  /*
   * Which surface produced this signup. Seven members exist and not one can be
   * attributed, because every entry point links to the same /membership URL —
   * so "is AI Mode a funnel?" has been unanswerable rather than answered badly.
   */
  const signupSource = source ?? searchParams.get("src")
  const wantsConnect = nextIntent === "connect"
  const destination = (fallback: string) =>
    wantsConnect ? "/api/google-business/start" : fallback

  // Which audience's copy they read on the way in. Resolved through the
  // registry so an unknown or not-yet-launched value can't be written to the
  // member row straight from a query string.
  const signupAudience = audienceFromParam(searchParams.get("for") ?? audience)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  })

  // ---- funnel instrumentation ------------------------------------------
  // Refs rather than state: none of this should trigger a render, and the
  // pagehide handler has to read the CURRENT values, not the ones captured
  // when the listener was attached.
  const latest = useRef(formData)
  useEffect(() => {
    latest.current = formData
  }, [formData])

  const meta = useRef({
    started: false,
    submitted: false,
    abandonSent: false,
    lastFocused: null as FieldName | null,
    startedAt: 0,
    invalidCount: 0,
  })

  const claimContext = useCallback(
    () => ({
      form: "community_membership",
      audience: signupAudience,
      is_claiming: isClaiming,
      claim_entity_type: claimEntityType || undefined,
      claim_entity_id: claimEntityId || undefined,
      wants_connect: wantsConnect,
    }),
    [isClaiming, claimEntityType, claimEntityId, wantsConnect, signupAudience]
  )

  /** Field names only — see the note above about never sending values. */
  const progress = useCallback(() => {
    const d = latest.current
    const filled = FIELDS.filter((f) => String(d[f] ?? "").trim().length > 0)
    return {
      filled,
      empty: FIELDS.filter((f) => String(d[f] ?? "").trim().length === 0),
      completed: filled.length,
      total: FIELDS.length,
      seconds_in_form: meta.current.startedAt
        ? Math.round((Date.now() - meta.current.startedAt) / 1000)
        : 0,
    }
  }, [])

  const onFieldFocus = useCallback(
    (name: FieldName) => {
      meta.current.lastFocused = name
      if (!meta.current.started) {
        meta.current.started = true
        meta.current.startedAt = Date.now()
        track("form_start", { ...claimContext(), first_field: name })
      }
    },
    [claimContext]
  )

  // Native HTML5 validation (required, minLength, type=email) rejecting a
  // submit is a real abandonment cause and is otherwise completely silent —
  // the browser shows its own bubble and no JS runs.
  const onFieldInvalid = useCallback(
    (name: FieldName) => {
      meta.current.invalidCount += 1
      track("form_validation_error", { ...claimContext(), field: name, kind: "native_constraint" })
    },
    [claimContext]
  )

  // pagehide fires reliably on mobile where beforeunload does not; the
  // visibility fallback catches tab-switch-then-kill. Both routed through one
  // guarded path so a single abandonment reports once.
  useEffect(() => {
    const report = () => {
      const m = meta.current
      if (!m.started || m.submitted || m.abandonSent) return
      m.abandonSent = true
      track("form_abandon", {
        ...claimContext(),
        last_field: m.lastFocused,
        validation_errors: m.invalidCount,
        ...progress(),
      })
    }
    const onVisibility = () => {
      if (document.visibilityState === "hidden") report()
    }
    window.addEventListener("pagehide", report)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("pagehide", report)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [claimContext, progress])
  // ----------------------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    track("form_submit_attempt", { ...claimContext(), ...progress() })

    if (formData.password !== formData.confirmPassword) {
      track("form_validation_error", {
        ...claimContext(),
        field: "confirmPassword",
        kind: "password_mismatch",
      })
      toast.error("Passwords do not match.")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/community/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, claimEntityType, claimEntityId, audience: signupAudience, signupSource }),
      })

      const data = await response.json()

      if (!data.success) {
        // Distinguish "the server said no" from "they gave up". Previously both
        // ended as an account that never appeared, with nothing to tell them
        // apart. The message is our own copy, never anything they typed.
        track("form_submit_error", {
          ...claimContext(),
          status: response.status,
          reason: data.error || "unknown",
          ...progress(),
        })
        throw new Error(data.error || "Failed to create membership.")
      }

      // Suppresses form_abandon: the navigation that follows is success, not
      // an exit.
      meta.current.submitted = true

      if ((window as any).innerG?.track) {
        (window as any).innerG.track('community_membership_signup', {
          audience: signupAudience,
          claim_entity_type: claimEntityType || undefined,
          claim_entity_id: claimEntityId || undefined,
          claim_linked: !!data.claimLinked,
          seconds_to_signup: progress().seconds_in_form,
        })
      }

      // Surface a silent link failure — the membership is real either way, but
      // the user came here specifically to get the badge.
      if (isClaiming && !data.claimLinked) {
        toast.warning("Membership created, but we couldn't link that listing automatically. Our team will review it.")
      }

      const supabase = createBrowserClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (signInError) {
        console.error("[CommunityMembership] Shadow auth failed:", signInError)
        window.location.href = "/login?redirect=" + encodeURIComponent(destination(data.redirect))
        return
      }

      window.location.href = destination(data.redirect)
    } catch (err: any) {
      console.error("[CommunityMembership] Error:", err)
      // A network failure never reaches the branch above, so it is reported
      // here or not at all.
      track("form_submit_error", {
        ...claimContext(),
        status: 0,
        reason: err?.message || "network_or_unhandled",
        ...progress(),
      })
      toast.error(err.message || "Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {wantsConnect && (
        <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs leading-relaxed text-slate-700">
            <strong>Next: connecting your Google Business Profile.</strong> Membership is free and
            takes a moment — then we&apos;ll send you straight to Google to authorise read-only
            access and run your full audit.
          </p>
        </div>
      )}
      {isClaiming && (
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-xs font-medium leading-relaxed text-emerald-800">
            You&apos;re claiming{" "}
            <span className="font-black">{claimEntityName || "this listing"}</span>. Finish signing up and the
            verified badge goes live on it right away.
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="cm-first-name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">First Name</label>
          <input
            id="cm-first-name"
            type="text"
            required
            minLength={2}
            placeholder="Jordan"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            onFocus={() => onFieldFocus("firstName")}
            onInvalid={() => onFieldInvalid("firstName")}
            className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 focus:ring-0 transition-all outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cm-last-name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Last Name</label>
          <input
            id="cm-last-name"
            type="text"
            required
            minLength={2}
            placeholder="Rivera"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            onFocus={() => onFieldFocus("lastName")}
            onInvalid={() => onFieldInvalid("lastName")}
            className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 focus:ring-0 transition-all outline-none"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cm-email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
        <input
            id="cm-email"
          type="email"
          required
          placeholder="you@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          onFocus={() => onFieldFocus("email")}
          onInvalid={() => onFieldInvalid("email")}
          className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 focus:ring-0 transition-all outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cm-phone" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
        <input
            id="cm-phone"
          type="tel"
          required
          placeholder="(555) 000-0000"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          onFocus={() => onFieldFocus("phone")}
          onInvalid={() => onFieldInvalid("phone")}
          className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 focus:ring-0 transition-all outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cm-password" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Create Password</label>
        <input
            id="cm-password"
          type="password"
          required
          minLength={6}
          placeholder="••••••••"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          onFocus={() => onFieldFocus("password")}
          onInvalid={() => onFieldInvalid("password")}
          className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 focus:ring-0 transition-all outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cm-confirm-password" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirm Password</label>
        <input
            id="cm-confirm-password"
          type="password"
          required
          minLength={6}
          placeholder="••••••••"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          onFocus={() => onFieldFocus("confirmPassword")}
          onInvalid={() => onFieldInvalid("confirmPassword")}
          className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 focus:ring-0 transition-all outline-none"
        />
      </div>

      <Button
        disabled={isSubmitting}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-sm font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating your membership...
          </>
        ) : (
          <>
            Join for Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
      <p className="text-[11px] text-slate-400 text-center leading-relaxed">
        Free, always. No credit card required.
      </p>
    </form>
  )
}
