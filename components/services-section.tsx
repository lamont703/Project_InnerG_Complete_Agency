"use client"

import { Brain, Blocks, Rocket, Shield, Cpu, BarChart3 } from "lucide-react"

const services = [
  {
    icon: Brain,
    title: "AI Strategy & Architecture",
    description:
      "Custom AI roadmaps aligned with your business goals. From LLMs to computer vision, we design architectures that scale.",
    highlights: ["Custom AI Roadmaps", "Model Selection", "Data Strategy"],
  },
  {
    icon: Blocks,
    title: "Blockchain Engineering",
    description:
      "Business-grade blockchain solutions. Smart contracts, tokenization, and decentralized infrastructure built for performance.",
    highlights: ["Smart Contracts", "Tokenization", "DeFi Infrastructure"],
  },
  {
    icon: Rocket,
    title: "Product Commercialization",
    description:
      "Turn technology into revenue. We help you build go-to-market strategies and launch AI and blockchain products at scale.",
    highlights: ["GTM Strategy", "Revenue Modeling", "Market Validation"],
  },
  {
    icon: Shield,
    title: "Security & Compliance",
    description:
      "Business-grade security for AI and blockchain deployments. Audits, compliance frameworks, and risk mitigation.",
    highlights: ["Smart Contract Audits", "Compliance", "Risk Assessment"],
  },
  {
    icon: Cpu,
    title: "AI Integration & Deployment",
    description:
      "Seamless integration of AI capabilities into your existing tech stack. MLOps, APIs, and production-ready deployments.",
    highlights: ["MLOps Pipelines", "API Development", "Edge AI"],
  },
  {
    icon: BarChart3,
    title: "Data & Analytics",
    description:
      "Transform raw data into strategic insights. Advanced analytics, real-time dashboards, and predictive modeling.",
    highlights: ["Predictive Analytics", "Real-time Dashboards", "Data Lakes"],
  },
]

export function ServicesSection() {
  return (
    <section id="services" className="relative py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Our Expertise
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
            Solutions for the Modern SMB
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            We deliver high-impact AI and blockchain services tailored for Retail, Finance, and Healthcare,
            helping small to medium businesses bridge the gap between innovation and reality.
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
