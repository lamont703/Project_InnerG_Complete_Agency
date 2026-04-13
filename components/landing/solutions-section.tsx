import { Target, Cpu, ShieldCheck, Rocket, Zap, Server } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const sdlcStages = [
  {
    stage: "Aesthetic Mapping",
    status: "Phase 1",
    description: "Deep-dive technical validations of the digital-to-physical client touchpoints.",
    points: [
      { label: "Journey Analysis", icon: Target, text: "Map every digital interaction from booking to treatment." },
      { label: "Integrity Blueprint", icon: Server, text: "Design secure, HIPAA-compliant client data architecture." },
      { label: "Technical Feasibility", icon: ShieldCheck, text: "Validate your AI skin analysis or Web3 loyalty concepts." },
      { label: "Stack Performance", icon: Target, text: "Ensure 99.9% uptime for global service operations." },
    ],
    accentClass: "text-muted-foreground bg-muted border-border",
    glowClass: "bg-muted/5",
  },
  {
    stage: "Cognitive Development",
    status: "Phase 2",
    description: "Elite engineering squads building high-throughput personalized service engines.",
    points: [
      { label: "Dedicated Pods", icon: Cpu, text: "Specialized teams focused on Beauty-Tech innovation." },
      { label: "Personalized AI", icon: Zap, text: "Deploying custom recommendation and analysis engines." },
      { label: "Modular Infrastructure", icon: Server, text: "Future-proof systems that grow with your franchise locations." },
      { label: "Live Transparency", icon: Target, text: "Direct visibility into your technical build velocity." },
    ],
    accentClass: "text-primary bg-primary/10 border-primary/20",
    glowClass: "bg-primary/20",
    isHighlighted: true,
  },
  {
    stage: "Franchise Scale",
    status: "Phase 3",
    description: "Continuous integration and white-glove deployment across your global location network.",
    points: [
      { label: "Audit Readiness", icon: ShieldCheck, text: "Rigorous security and performance auditing for launch." },
      { label: "Edge Deployment", icon: Rocket, text: "Low-latency system performance across all territories." },
      { label: "Operational Handoff", icon: Target, text: "Comprehensive training and technical documentation." },
      { label: "Brand Presence", icon: Rocket, text: "Launching a technical moat that defines your brand authority." },
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
            The Aesthetic Innovation Lifecycle
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
            Design. Build. Dominate.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Our enterprise-grade Software Development Life Cycle (SDLC) is battle-tested for deploying complex Artificial Intelligence and Web3 infrastructure for the world's most elite wellness brands.
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
