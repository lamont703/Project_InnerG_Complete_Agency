"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { Navbar } from "@/components/layout/navbar"
import {
  Mail,
  MessageSquare,
  Building2,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Clock,
  MapPin,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"

function GlowOrb({ className }: { className: string }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
      aria-hidden="true"
    />
  )
}

function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Which CTA sent them. The distance-education pages append ?from=binder,
  // ?from=penalties and so on, so a lead can be traced to the content that
  // earned it without joining against pixel events.
  const params = useSearchParams()
  const source = params.get("from") || "contact_page"

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const form = new FormData(e.currentTarget)
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          business_name: form.get("business_name"),
          phone: form.get("phone"),
          message: form.get("message"),
          website: form.get("website"), // honeypot
          source,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) {
        // Only claim success when the server actually stored it. The previous
        // version of this page awaited a 1500ms timer and showed a success
        // screen regardless — every submission was discarded while the visitor
        // was told it had been received.
        setError(json.error || "Something went wrong. Please email us directly.")
        setIsSubmitting(false)
        return
      }
      setIsSubmitting(false)
      setIsSubmitted(true)
    } catch {
      setError("Couldn't reach the server. Please email us directly.")
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="py-12 text-center animate-in fade-in zoom-in duration-500">
        <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-foreground mb-3">Got it — thank you.</h2>
        <p className="text-muted-foreground font-medium mb-8">
          We&apos;ll come back to you within one business day, usually sooner.
        </p>
        <Button
          onClick={() => setIsSubmitted(false)}
          variant="outline"
          className="border-primary/20 text-primary hover:bg-primary/5 px-8 font-bold"
        >
          Send another message
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Honeypot: hidden from people, filled by bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="name" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
            Your name
          </label>
          <input
            id="name"
            name="name"
            required
            type="text"
            autoComplete="name"
            placeholder="Jordan Ellis"
            className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 font-medium"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            required
            type="email"
            autoComplete="email"
            placeholder="you@yourschool.com"
            className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 font-medium"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="business_name" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
          School or shop <span className="font-medium normal-case tracking-normal opacity-60">(optional)</span>
        </label>
        <div className="relative">
          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
          <input
            id="business_name"
            name="business_name"
            type="text"
            autoComplete="organization"
            placeholder="e.g. Ogle School — Houston"
            className="w-full bg-secondary/30 border border-border rounded-xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 font-medium"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="message" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
          What do you need?
        </label>
        <div className="relative">
          <MessageSquare className="absolute left-4 top-4 h-4 w-4 text-muted-foreground/40" />
          <textarea
            id="message"
            name="message"
            required
            rows={4}
            placeholder="A compliance binder for our distance-education hours, a listing question, something else…"
            className="w-full bg-secondary/30 border border-border rounded-xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 font-medium resize-none"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {error}{" "}
            <a href="mailto:info@innergcomplete.com" className="underline underline-offset-2">
              info@innergcomplete.com
            </a>
          </span>
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-8 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 group transition-all active:scale-[0.98]"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-3" />
            Sending…
          </>
        ) : (
          <>
            Send message
            <ArrowRight className="h-4 w-4 ml-3 group-hover:translate-x-2 transition-transform" />
          </>
        )}
      </Button>

      <p className="text-[10px] text-center text-muted-foreground font-medium mt-6">
        By submitting you agree to our{" "}
        <a href="/privacy-policy" className="text-primary hover:underline">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  )
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background light text-foreground flex flex-col pt-20">
      <Navbar />

      <section className="relative py-20 sm:py-28 overflow-hidden border-b border-border/50">
        <GlowOrb className="top-1/4 -left-32 h-96 w-96 bg-primary/10 animate-float" />
        <GlowOrb className="bottom-1/4 -right-32 h-80 w-80 bg-primary/5 animate-float-delayed" />

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-6xl leading-none">
              Talk to us about your school or shop
            </h1>
            <p className="mt-6 text-xl text-muted-foreground leading-relaxed text-balance font-medium">
              Compliance binders for distance-education hours, listing and claim questions, or
              anything else on the directory. Tell us what you need and we&apos;ll come back within a
              business day.
            </p>
          </div>
        </div>
      </section>

      <section className="relative flex-1 py-16 sm:py-24 bg-secondary/5">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div className="space-y-12">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-foreground mb-6">
                  How to reach us
                </h2>
                <div className="grid gap-6">
                  <div className="group flex items-center gap-4 p-6 rounded-2xl border border-border bg-white hover:shadow-xl transition-all duration-300">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                      <Mail className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email</div>
                      <div className="text-lg font-bold text-foreground tracking-tight">info@innergcomplete.com</div>
                    </div>
                  </div>

                  <div className="group flex items-center gap-4 p-6 rounded-2xl border border-border bg-white hover:shadow-xl transition-all duration-300">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Based in</div>
                      <div className="text-lg font-bold text-foreground tracking-tight">Atlanta, Georgia</div>
                    </div>
                  </div>

                  <div className="group flex items-center gap-4 p-6 rounded-2xl border border-border bg-white hover:shadow-xl transition-all duration-300">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                      <Clock className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Response time</div>
                      <div className="text-lg font-bold text-foreground tracking-tight">Within one business day</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 rounded-3xl border border-primary/20 bg-primary/5 relative overflow-hidden group">
                <ShieldCheck className="absolute -right-8 -bottom-8 h-32 w-32 text-primary/5 group-hover:scale-110 transition-transform duration-700" />
                <div className="relative z-10">
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-4">
                    Where our numbers come from
                  </h3>
                  <p className="text-sm text-balance text-muted-foreground font-medium leading-relaxed">
                    Every rule we check is traced to a named source — TDLR&apos;s SHEARS Operations
                    Manual, the PSI candidate bulletin for the specific licence, or a numbered NACCAS
                    policy. We cite the document behind each figure rather than summarising it, so you
                    can take our findings to your accreditor and they hold up.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-primary/5 blur-3xl -z-10 rounded-full opacity-50" />
              <div className="glass-panel p-8 sm:p-12 rounded-3xl border-border/50 bg-white/80 backdrop-blur-xl shadow-2xl relative">
                <Suspense fallback={<div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>}>
                  <ContactForm />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white border-t border-border/50">
        <div className="mx-auto max-w-4xl px-6 text-center space-y-6">
          <h2 className="text-2xl font-black tracking-tight text-foreground">
            What happens after you write to us
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed text-balance">
            If you&apos;re a school asking about distance-education compliance, we&apos;ll ask for an
            hours export and run it through the same checks the public binder demonstrates — the
            separate core and specialty ceilings, the limit on time away from campus, and the
            requirement that every graded assessment happens on site. You get back a dated binder,
            per student, with the rule and source behind every flag.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed text-balance">
            If you&apos;re a shop or salon owner, it&apos;s usually about claiming your listing,
            correcting your details, or booth rent and chair availability. Those we can normally sort
            out in a single reply.
          </p>
        </div>
      </section>
    </main>
  )
}
