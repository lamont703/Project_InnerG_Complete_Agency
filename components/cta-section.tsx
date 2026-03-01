"use client"

import { ArrowRight, Mail, Building2, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"

export function CtaSection() {
  const [submitted, setSubmitted] = useState(false)

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
              Ready to Transform Your Enterprise?
            </h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Schedule a complimentary discovery call with our senior architects. We will assess your
              technology landscape and identify the highest-impact opportunities for AI and blockchain
              in your organization.
            </p>

            <div className="mt-10 space-y-6">
              {[
                { label: "Custom Strategy Session", desc: "Tailored to your enterprise context" },
                { label: "Technical Assessment", desc: "Deep-dive into your infrastructure" },
                { label: "ROI Projection", desc: "Data-driven impact analysis" },
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
                <h3 className="text-2xl font-bold text-foreground">Thank You</h3>
                <p className="mt-3 text-muted-foreground">
                  Our team will reach out within 24 hours to schedule your discovery call.
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setSubmitted(true)
                }}
                className="space-y-5"
              >
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Book a Discovery Call</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Fill out the form and our team will get in touch.
                  </p>
                </div>

                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Full Name"
                    className="bg-input/50 border-border pl-10 text-foreground placeholder:text-muted-foreground focus:border-primary"
                    required
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Work Email"
                    className="bg-input/50 border-border pl-10 text-foreground placeholder:text-muted-foreground focus:border-primary"
                    required
                  />
                </div>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Company Name"
                    className="bg-input/50 border-border pl-10 text-foreground placeholder:text-muted-foreground focus:border-primary"
                    required
                  />
                </div>
                <Textarea
                  placeholder="Tell us about your project or challenge..."
                  className="min-h-[120px] bg-input/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                  rows={4}
                />

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 glow-primary"
                >
                  Schedule Discovery Call
                  <ArrowRight className="h-4 w-4" />
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
