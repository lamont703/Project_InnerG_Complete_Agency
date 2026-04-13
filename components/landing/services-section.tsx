"use client"

import { Brain, Blocks, Rocket, Shield, Cpu, BarChart3, Database, Zap, LineChart, Users, ChessKnight, LayoutDashboard } from "lucide-react"

const services = [
  {
    icon: Database,
    title: "Aesthetic Logic",
    description:
      "Future-proof your wellness enterprise with robust database foundations and unified cloud infrastructure designed for global franchise scaling.",
    highlights: ["Unified Franchise Data", "Cloud Scaling", "High Availability"],
  },
  {
    icon: Zap,
    title: "Autonomous Concierge",
    description:
      "Transform booking bottlenecks into automated workflows. We deploy AI agents that handle scheduling, upselling, and client nurturing 24/7.",
    highlights: ["AI Booking Agents", "Process Mapping", "Operational ROI"],
  },
  {
    icon: LineChart,
    title: "Client Science",
    description:
      "Turn fragmented skin, hair, and wellness data into growth intelligence. We build unified dashboards that predict client LTV and retention.",
    highlights: ["LTV Modeling", "Predictive Recommendations", "Unified Data Lakes"],
  },
  {
    icon: Shield,
    title: "Supply Chain Authority",
    description:
      "Leverage Blockchain to verify the ethical provenance of professional-grade assets. Secure your brand's authority with on-chain verification.",
    highlights: ["Asset Provenance", "Ethical Verification", "On-Chain Audit"],
  },
  {
    icon: ChessKnight,
    title: "Fractional CTO & Strategy",
    description:
      "Technical leadership for wellness brands. Navigate the complex intersection of personal services and institutional-grade technology.",
    highlights: ["Technical Roadmap", "Team Mentorship", "Vendor Management"],
  },
  {
    icon: LayoutDashboard,
    title: "Performance Auditing",
    description:
      "Real-time visibility into your digital-to-physical touchpoints. We ensure every system we build is measurable, transparent, and high-performing.",
    highlights: ["KPI Tracking", "Service-Level Assurance", "Real-time Audits"],
  },
]

export function ServicesSection() {
  return (
    <section id="services" className="relative py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Aesthetic Intelligence Suite
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
            Engineered for Luxury Wellness
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            We provide the technical bedrock and strategic foresight that 
            high-end Beauty and Grooming enterprises need to dominate the marketplace.
          </p>
        </div>

        {/* Grid */}
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.title}
              className={`group relative rounded-2xl glass-panel p-8 transition-all duration-300 hover:border-primary/30 hover:bg-secondary/30 ${service.title === "Aesthetic Logic" ? "border-primary/40 ring-1 ring-primary/20 scale-[1.02] shadow-xl shadow-primary/5" : ""}`}
            >
              {service.title === "Aesthetic Logic" && (
                <div className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
                  Flagship Offering
                </div>
              )}
              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />

              <div className="relative z-10">
                <div className="mb-6 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                  <service.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">{service.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {service.highlights.map((h) => (
                    <span
                      key={h}
                      className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
