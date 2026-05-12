"use client"

import { TrendingUp, Lock, Zap, Globe } from "lucide-react"

const features = [
  {
    icon: TrendingUp,
    title: "Franchise Velocity",
    stat: "3.2x",
    description: "Average revenue multiplier for wellness clients commercializing AI solutions with our team.",
  },
  {
    icon: Lock,
    title: "Institutional Security",
    stat: "HIPAA",
    description: "All solutions built with medical-grade security, compliance, and audit-ready architecture.",
  },
  {
    icon: Zap,
    title: "Service Deployment",
    stat: "12 wk",
    description: "Average time from architecture to production for specialized autonomous service agents.",
  },
  {
    icon: Globe,
    title: "Global Availability",
    stat: "24/7",
    description: "Solutions engineered for global franchise networks with 99.99% uptime assurance.",
  },
]

export function FeatureHighlight() {
  return (
    <section className="relative py-32 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent" aria-hidden="true" />

      {/* Large background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[800px] rounded-full bg-primary/5 blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Why Inner G Complete Agency
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
            Built for Institutional Scale
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            We combine deep technical expertise with business acumen to deliver solutions
            that don&apos;t just work — they generate measurable enterprise value.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative rounded-2xl glass-panel p-8 text-center transition-all duration-300 hover:border-primary/30"
            >
              <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />

              <div className="relative z-10">
                <div className="mx-auto mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                  <feature.icon className="h-6 w-6" />
                </div>
                <div className="text-3xl font-bold text-gradient">{feature.stat}</div>
                <h3 className="mt-2 text-base font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
