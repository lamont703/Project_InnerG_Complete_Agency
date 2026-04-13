"use client"

import { Brain, Blocks, Rocket, Shield, Cpu, BarChart3, Database, Zap, LineChart, Users, ChessKnight, LayoutDashboard } from "lucide-react"

const services = [
  {
    icon: Database,
    title: "Domain Intelligence (ADI)",
    description:
      "We architect a proprietary intelligence layer for your wellness enterprise. Unified data structures designed for global autonomous operations.",
    highlights: ["Sovereign Data Lakes", "Model Foundations", "Franchise Scaling"],
  },
  {
    icon: Zap,
    title: "Workflow Intelligence",
    description:
      "Automate high-fidelity workflows with custom agentic systems. We deploy AI intelligence that manages clinical intake and client nurturing.",
    highlights: ["Agentic Systems", "Neural Workflows", "Institutional ROI"],
  },
  {
    icon: LineChart,
    title: "Cognitive Analytics",
    description:
      "Transform fragmented client records into predictive growth intelligence. Build high-fidelity models that anticipate treatment paths.",
    highlights: ["LTV Prediction", "Behavioral Modeling", "Growth Engines"],
  },
  {
    icon: Shield,
    title: "Supply Chain Authority",
    description:
      "Leverage Blockchain to verify the ethical provenance of professional-grade assets. Secure your brand's authority with on-chain verification.",
    highlights: ["Supply Chain Trust", "Ethical Verification", "On-Chain Audit"],
  },
  {
    icon: ChessKnight,
    title: "Fractional CTO & Strategy",
    description:
      "High-agency fractional CTO leadership for wellness brands. We architect your technical future with institutional-grade strategy.",
    highlights: ["Technical Roadmap", "IP Ownership", "Risk Mitigation"],
  },
  {
    icon: LayoutDashboard,
    title: "Performance Auditing",
    description:
      "Total transparency into your digital-to-physical touchpoints. We ensure every system we architect is measurable and compliant.",
    highlights: ["HIPAA Compliance", "Service Audits", "KPI Infrastructure"],
  },
]

export function ServicesSection() {
  return (
    <section id="services" className="relative py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-primary mb-4">
            Aesthetic Intelligence Suite
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
            Engineered for Luxury Wellness
          </h2>
          <p className="mx-auto mt-8 max-w-3xl text-lg text-muted-foreground leading-relaxed font-medium">
            We partner with a selective cohort of Beauty and Wellness enterprises to build 
            the sovereign intelligence layers required for the next decade of market dominance.
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
