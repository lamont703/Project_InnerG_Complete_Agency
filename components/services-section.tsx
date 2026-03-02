"use client"

import { Brain, Blocks, Rocket, Shield, Cpu, BarChart3, Database, Zap, LineChart, Users, ChessKnight, LayoutDashboard } from "lucide-react"

const services = [
  {
    icon: Database,
    title: "Scalable Architecture",
    description:
      "Future-proof your business with robust database foundations and cloud infrastructure designed to handle 10x growth without crumbling.",
    highlights: ["Database Optimization", "Cloud Scaling", "High Availability"],
  },
  {
    icon: Zap,
    title: "Advanced Automations",
    description:
      "Transform manual bottlenecks into automated workflows. We deploy AI agents that work 24/7 to reclaim your team's most valuable hours.",
    highlights: ["AI Workflows", "Process Mapping", "Operational ROI"],
  },
  {
    icon: LineChart,
    title: "Data Analytics",
    description:
      "Turn fragmented data into growth intelligence. We build unified dashboards that tell you exactly where to double down on your spend.",
    highlights: ["Growth Intelligence", "Predictive Modeling", "Unified Data Lakes"],
  },
  {
    icon: Users,
    title: "Customer Personalization",
    description:
      "Leverage AI to deliver hyper-personalized experiences. Increase LTV and retention by treating every customer like your only customer.",
    highlights: ["Retention Strategy", "Dynamic Content", "Behavioral Tuning"],
  },
  {
    icon: ChessKnight,
    title: "Fractional CTO & Strategy",
    description:
      "A long-term strategic partnership focused on technical leadership and resource allocation without the full-time executive cost.",
    highlights: ["Technical Roadmap", "Team Mentorship", "Vendor Management"],
  },
  {
    icon: LayoutDashboard,
    title: "Performance Monitoring",
    description:
      "Real-time visibility into your new infrastructure. We ensure every system we build is measurable, transparent, and high-performing.",
    highlights: ["KPI Tracking", "Uptime Assurance", "Real-time Audits"],
  },
]

export function ServicesSection() {
  return (
    <section id="services" className="relative py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Our Capability Suite
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
            Engineered for Scaling Businesses
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            We provide the technical bedrock and strategic foresight that
            growth-stage founders need to outpace the competition.
          </p>
        </div>

        {/* Grid */}
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.title}
              className={`group relative rounded-2xl glass-panel p-8 transition-all duration-300 hover:border-primary/30 hover:bg-secondary/30 ${service.title === "AI Strategy & Architecture" ? "border-primary/40 ring-1 ring-primary/20 scale-[1.02] shadow-xl shadow-primary/5" : ""}`}
            >
              {service.title === "AI Strategy & Architecture" && (
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
