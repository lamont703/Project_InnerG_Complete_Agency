"use client"

import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

function GlowOrb({ className }: { className: string }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
      aria-hidden="true"
    />
  )
}

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background orbs */}
      <GlowOrb className="top-1/4 -left-32 h-96 w-96 bg-primary/15 animate-float" />
      <GlowOrb className="bottom-1/4 -right-32 h-80 w-80 bg-accent/12 animate-float-delayed" />
      <GlowOrb className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] bg-primary/5" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.7 0.15 220 / 0.3) 1px, transparent 1px), linear-gradient(90deg, oklch(0.7 0.15 220 / 0.3) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full glass-panel px-5 py-2.5">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">Enterprise AI & Blockchain Partner</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
          <span className="text-balance block text-foreground">
            Architect the Future
          </span>
          <span className="text-balance block text-gradient mt-2">
            of Your Enterprise
          </span>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          We help enterprises architect, build, and commercialize AI and blockchain solutions
          to drive real business innovation and lasting competitive advantage.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-8 py-6 text-base glow-primary"
            asChild
          >
            <Link href="#contact">
              Schedule a Discovery Call
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="border-border text-foreground hover:bg-secondary/50 gap-2 px-8 py-6 text-base"
            asChild
          >
            <Link href="#services">Explore Our Solutions</Link>
          </Button>
        </div>

        {/* Trust indicators */}
        <div className="mt-20 glass-panel rounded-2xl p-6">
          <p className="mb-6 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Trusted by forward-thinking enterprises
          </p>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { metric: "150+", label: "Enterprise Clients" },
              { metric: "$2.4B", label: "Value Generated" },
              { metric: "98%", label: "Client Retention" },
              { metric: "40+", label: "Industries Served" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-2xl font-bold text-foreground sm:text-3xl">{item.metric}</div>
                <div className="mt-1 text-sm text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
