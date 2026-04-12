import { Target, Cpu, ShieldCheck, Rocket, Zap, Server } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const sdlcStages = [
  {
    stage: "Architecture & Viability",
    status: "Phase 1",
    description: "Deep-dive technical validations to map infrastructure constraints before writing code.",
    points: [
      { label: "Technical Feasibility", icon: Target, text: "Ensure project scope is mathematically and practically sound." },
      { label: "System Mapping", icon: Server, text: "Blueprint robust AI and Web3 infrastructure flow." },
      { label: "Risk Mitigation", icon: ShieldCheck, text: "Identify deployment and security bottlenecks early." },
      { label: "Stack Selection", icon: Target, text: "Lock in the exact enterprise tech stack required." },
    ],
    accentClass: "text-muted-foreground bg-muted border-border",
    glowClass: "bg-muted/5",
  },
  {
    stage: "Cognitive Agile Sprints",
    status: "Phase 2",
    description: "Elite dedicated engineering squads building modular, testable components predictably.",
    points: [
      { label: "Dedicated Squads", icon: Cpu, text: "Specialized engineering and product management teams." },
      { label: "Iterative Sprints", icon: Zap, text: "Rapid prototyping and continuous feature delivery." },
      { label: "Modular Codebase", icon: Server, text: "Architecting scalable system components for future pivots." },
      { label: "Transparent Execution", icon: Target, text: "Complete, direct visibility into weekly sprint progress." },
    ],
    accentClass: "text-primary bg-primary/10 border-primary/20",
    glowClass: "bg-primary/20",
    isHighlighted: true,
  },
  {
    stage: "Security & Deployment",
    status: "Phase 3",
    description: "Rigorous quality assurance, auditing, and white-glove launch into your ecosystem.",
    points: [
      { label: "Safety Benchmarking", icon: ShieldCheck, text: "Rigorous LLM hallucination and security logic testing." },
      { label: "Contract Audits", icon: ShieldCheck, text: "Enterprise-grade Web3 smart contract security reviews." },
      { label: "CI/CD Pipelines", icon: Target, text: "Automated testing and robust continuous integration." },
      { label: "Production Handoff", icon: Rocket, text: "Flawless deployment into your live production environment." },
    ],
    accentClass: "text-accent bg-accent/10 border-accent/20",
    glowClass: "bg-accent/5",
  },
]

export function SolutionsSection() {
  return (
    <section id="sdlc" className="relative py-32 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent" aria-hidden="true" />

      {/* Background growth chart decoration */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none select-none" aria-hidden="true">
        <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
          <path d="M0,1000 L100,900 L200,950 L300,800 L400,850 L500,600 L600,650 L700,400 L800,450 L900,100 L1000,0 L1000,1000 Z" fill="currentColor" />
        </svg>
      </div>

      <div className="mx-auto max-w-7xl px-6 relative z-10">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            The Cognitive Engineering Lifecycle
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
            Architect. Build. Scale.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Our enterprise-grade Software Development Life Cycle (SDLC) is battle-tested for deploying complex Artificial Intelligence and Web3 infrastructure securely and predictably.
          </p>
        </div>

        <div className="mt-20 grid gap-8 md:grid-cols-2 lg:grid-cols-3 items-stretch">
          {sdlcStages.map((stage) => (
            <div
              key={stage.stage}
              className={`group relative rounded-2xl glass-panel flex flex-col transition-all duration-500 ${stage.isHighlighted ? "ring-2 ring-primary/40 scale-[1.05] z-20 shadow-2xl shadow-primary/10" : "scale-[0.98] opacity-80"}`}
            >
              {/* Top glow accent */}
              <div className={`absolute top-0 left-0 right-0 h-px ${stage.glowClass}`} aria-hidden="true" />

              <div className="relative z-10 p-8 flex flex-col flex-1">
                <span className={`inline-flex rounded-full border px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider ${stage.accentClass}`}>
                  {stage.status}
                </span>
                <h3 className="mt-5 text-2xl font-bold text-foreground leading-tight">
                  {stage.stage}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {stage.description}
                </p>

                <div className="mt-8 space-y-6 flex-1">
                  {stage.points.map((point) => (
                    <div key={point.label} className="flex gap-3">
                      <div className={`mt-0.5 rounded-md p-1 shrink-0 ${stage.isHighlighted ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <point.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">{point.label}</div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{point.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {stage.isHighlighted ? (
                  <Button
                    className="mt-10 w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                    asChild
                  >
                    <Link href="#contact">
                      Request Architecture Audit
                    </Link>
                  </Button>
                ) : (
                  <div className="mt-10 h-10" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
