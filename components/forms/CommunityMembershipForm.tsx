"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/browser"
import { toast } from "sonner"

// Modeled on BarberRegisterForm's shadow-auth-handshake pattern (register
// via the admin-privileged API route, then sign in client-side with the
// same credentials) but deliberately simpler — one fixed membership tier,
// no school/role selection, since the only benefit right now is search
// visibility, not a business dashboard.
export function CommunityMembershipForm() {
  // Claim context handed over by ClaimShopButton. When present, signup also
  // links this member to the entity so the "Claimed" badge turns on.
  const searchParams = useSearchParams()
  const claimEntityType = searchParams.get("claim_type")
  const claimEntityId = searchParams.get("claim_id")
  const claimEntityName = searchParams.get("claim_name")
  const isClaiming = Boolean(claimEntityType && claimEntityId)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match.")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/community/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, claimEntityType, claimEntityId }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to create membership.")
      }

      if ((window as any).innerG?.track) {
        (window as any).innerG.track('community_membership_signup', {
          claim_entity_type: claimEntityType || undefined,
          claim_entity_id: claimEntityId || undefined,
          claim_linked: !!data.claimLinked,
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
        window.location.href = "/login?redirect=" + encodeURIComponent(data.redirect)
        return
      }

      window.location.href = data.redirect
    } catch (err: any) {
      console.error("[CommunityMembership] Error:", err)
      toast.error(err.message || "Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
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
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">First Name</label>
          <input
            type="text"
            required
            minLength={2}
            placeholder="Jordan"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 focus:ring-0 transition-all outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Last Name</label>
          <input
            type="text"
            required
            minLength={2}
            placeholder="Rivera"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 focus:ring-0 transition-all outline-none"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 focus:ring-0 transition-all outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
        <input
          type="tel"
          required
          placeholder="(555) 000-0000"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 focus:ring-0 transition-all outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Create Password</label>
        <input
          type="password"
          required
          minLength={6}
          placeholder="••••••••"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 focus:ring-0 transition-all outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirm Password</label>
        <input
          type="password"
          required
          minLength={6}
          placeholder="••••••••"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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
