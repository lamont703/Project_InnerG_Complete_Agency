import { ArrowRight, Check, X, TrendingUp, AlertCircle, Rocket } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const maturityStages = [
  {
    stage: "The Breaking Point",
    status: "Where Growth Stalls",
    description: "The 'growing pains' that prevent 7-figure businesses from reaching 8 or 9 figures.",
    points: [
      { label: "Manual Workflows", icon: X, text: "Your team is drowning in repetitive, error-prone tasks." },
      { label: "Data Silos", icon: X, text: "Fragmented information leads to guessing instead of knowing." },
      { label: "Fragile Architecture", icon: X, text: "Database bottlenecks cause frequent downtime and lag." },
      { label: "Reactive Strategy", icon: X, text: "Constantly puting out fires instead of planning ahead." },
    ],
    accentClass: "text-destructive bg-destructive/10 border-destructive/20",
    glowClass: "bg-destructive/5",
  },
  {
    stage: "The Inflection Point",
    status: "The InnerG Intervention",
    description: "We deploy the systems, automations, and data foundations required to scale.",
    points: [
      { label: "AI Process Mapping", icon: TrendingUp, text: "Identifying and automating high-leverage workflows." },
      { label: "Unified Data Lakes", icon: TrendingUp, text: "Consolidating all endpoints into a single source of truth." },
      { label: "Scalable Database", icon: TrendingUp, text: "Re-architecting for performance and 10x throughput." },
      { label: "Fractional Leadership", icon: TrendingUp, text: "Long-term partnership to guide your tech evolution." },
    ],
    accentClass: "text-primary bg-primary/10 border-primary/20",
    glowClass: "bg-primary/20",
    isHighlighted: true,
  },
  {
    stage: "The Scaled State",
    status: "Predictable Expansion",
    description: "A business that operates like a machine, fueled by data and autonomous systems.",
    points: [
      { label: "24/7 AI Operations", icon: Check, text: "Systems that work while your team focuses on strategy." },
      { label: "Growth Intelligence", icon: Check, text: "Real-time visibility into every ROI lever." },
      { label: "Invisible Scaling", icon: Check, text: "Infrastructure that handles spikes without manual effort." },
      { label: "Strategic Moat", icon: Check, text: "Using tech as a competitive advantage, not a hurdle." },
    ],
    accentClass: "text-accent bg-accent/10 border-accent/20",
    glowClass: "bg-accent/5",
  },
]

export function SolutionsSection() {
  return (
    <section id="maturity" className="relative py-32 overflow-hidden">
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
            The Growth Roadmap
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
            Transcend Your Current Plateaus
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Most businesses stall because their systems can't keep up with their vision.
            We provide the bridge from 'Good' to 'Scalable'.
          </p>
        </div>

        <div className="mt-20 grid gap-8 md:grid-cols-2 lg:grid-cols-3 items-stretch">
          {maturityStages.map((stage) => (
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
                      Initiate Transformation
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
