"use client"

import { ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const solutions = [
  {
    label: "AI Solutions",
    title: "Intelligent Systems That Learn, Adapt, and Scale",
    description:
      "From custom LLMs to predictive analytics, we build AI systems that solve your most complex business challenges and create new revenue streams.",
    features: [
      "Custom Large Language Models & Fine-Tuning",
      "Computer Vision & Image Recognition",
      "Natural Language Processing Pipelines",
      "Predictive Analytics & Forecasting",
      "Autonomous Agent Architectures",
      "Real-time Decision Engines",
    ],
    accentClass: "text-primary bg-primary/10 border-primary/20",
    glowClass: "bg-primary/8",
  },
  {
    label: "Blockchain Solutions",
    title: "Decentralized Infrastructure for Enterprise Trust",
    description:
      "We engineer enterprise blockchain solutions that enhance transparency, automate processes, and unlock new business models through tokenization.",
    features: [
      "Enterprise Smart Contract Development",
      "Asset Tokenization & Digital Securities",
      "DeFi Protocol Architecture",
      "Cross-chain Interoperability",
      "Supply Chain Traceability",
      "Decentralized Identity Solutions",
    ],
    accentClass: "text-accent bg-accent/10 border-accent/20",
    glowClass: "bg-accent/8",
  },
]

export function SolutionsSection() {
  return (
    <section id="solutions" className="relative py-32">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent" aria-hidden="true" />

      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Solutions
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
            Tailored Technology for Enterprise Growth
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            We specialize in the two most transformative technologies of our era.
            Each solution is architected specifically for your enterprise context.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          {solutions.map((solution) => (
            <div
              key={solution.label}
              className="group relative rounded-2xl glass-panel overflow-hidden"
            >
              {/* Top glow accent */}
              <div className={`absolute top-0 left-0 right-0 h-px ${solution.glowClass}`} aria-hidden="true" />

              <div className="relative z-10 p-8 lg:p-10">
                <span className={`inline-flex rounded-full border px-4 py-1.5 text-xs font-semibold ${solution.accentClass}`}>
                  {solution.label}
                </span>
                <h3 className="mt-5 text-2xl font-bold text-foreground leading-tight text-balance">
                  {solution.title}
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {solution.description}
                </p>

                <ul className="mt-6 space-y-3">
                  {solution.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant="ghost"
                  className="mt-8 gap-2 text-primary hover:text-primary hover:bg-primary/10 px-0"
                  asChild
                >
                  <Link href="#contact">
                    Learn More
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
