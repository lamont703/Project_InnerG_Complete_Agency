"use client"

import { useState } from "react"
import { ArrowRight, Mail, Building2, User, Loader2, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { leadSchema, type LeadInput } from "@/lib/validations/lead"
import { toast } from "sonner"
import { createBrowserClient } from "@/lib/supabase/browser"


export function CtaSection() {
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      company_name: "",
      challenge: "",
    },
  })

  const onLeadSubmit = async (values: LeadInput) => {
    setIsSubmitting(true)

    try {
      const { data, error } = await createBrowserClient().functions.invoke("submit-growth-audit-lead", {
        body: values,
      })

      console.log("[CtaSection] Submission response:", { data, error })

      if (error) {
        throw new Error(error.message || "Failed to submit lead.")
      }



      setSubmitted(true)
      toast.success("Audit request received! We'll be in touch soon.")
      reset()
    } catch (err) {
      console.error("[CtaSection] Submission error:", err)
      toast.error("Something went wrong. Please try again later.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="contact" className="relative py-32">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent" aria-hidden="true" />

      {/* Background orbs */}
      <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-primary/8 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute top-1/4 right-1/4 h-72 w-72 rounded-full bg-accent/6 blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-20 items-center">
          {/* Left: Copy */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Get Started
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
              Let's Architect Your Scale.
            </h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Schedule a complimentary Growth Audit with our senior architects. We'll identify your
              highest-leverage scaling bottlenecks and design a roadmap for automated, data-driven expansion.
            </p>

            <div className="mt-10 space-y-6">
              {[
                { label: "Infrastructure Gap Analysis", desc: "Identify the technical debt holding you back" },
                { label: "Automation ROI Assessment", desc: "Calculate the exact hours we can reclaim for your team" },
                { label: "Fractional CTO Strategy", desc: "Long-term partnership to guide your evolution" },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Form */}
          <div className="glass-panel-strong rounded-2xl p-8 lg:p-10">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ArrowRight className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Audit Requested</h3>
                <p className="mt-3 text-muted-foreground">
                  Our team will reach out within 24 hours to schedule your strategy session.
                </p>
                <Button
                  variant="link"
                  onClick={() => setSubmitted(false)}
                  className="mt-6 text-primary"
                >
                  Submit another request
                </Button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onLeadSubmit)}
                className="space-y-5"
              >
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Schedule a Growth Audit</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Get a clear technical roadmap for your next phase of growth.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      {...register("full_name")}
                      placeholder="Full Name"
                      className={`bg-input/50 border-border pl-10 text-foreground placeholder:text-muted-foreground focus:border-primary ${errors.full_name ? "border-destructive focus:border-destructive" : ""}`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.full_name && <p className="text-[10px] text-destructive ml-1">{errors.full_name.message}</p>}
                </div>

                <div className="space-y-1">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      {...register("email")}
                      placeholder="Work Email"
                      className={`bg-input/50 border-border pl-10 text-foreground placeholder:text-muted-foreground focus:border-primary ${errors.email ? "border-destructive focus:border-destructive" : ""}`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.email && <p className="text-[10px] text-destructive ml-1">{errors.email.message}</p>}
                </div>

                <div className="space-y-1">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      {...register("phone")}
                      placeholder="Phone Number"
                      className={`bg-input/50 border-border pl-10 text-foreground placeholder:text-muted-foreground focus:border-primary ${errors.phone ? "border-destructive focus:border-destructive" : ""}`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.phone && <p className="text-[10px] text-destructive ml-1">{errors.phone.message}</p>}
                </div>

                <div className="space-y-1">
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      {...register("company_name")}
                      placeholder="Company Name"
                      className={`bg-input/50 border-border pl-10 text-foreground placeholder:text-muted-foreground focus:border-primary ${errors.company_name ? "border-destructive focus:border-destructive" : ""}`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.company_name && <p className="text-[10px] text-destructive ml-1">{errors.company_name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Textarea
                    {...register("challenge")}
                    placeholder="What is your biggest scaling challenge right now?"
                    className="min-h-[120px] bg-input/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                    rows={4}
                    disabled={isSubmitting}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 glow-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending Request...
                    </>
                  ) : (
                    <>
                      Request Growth Audit
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  No obligation. Your information is kept strictly confidential.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
