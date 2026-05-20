import { Target, Cpu, ShieldCheck, Rocket, Zap, Server } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const sdlcStages = [
  {
    stage: "Institutional Audit",
    status: "Phase 1",
    description: "Deep-dive analysis into your current enrollment funnel and compliance vulnerabilities.",
    points: [
      { label: "Enrollment Analysis", icon: Target, text: "Map every drop-off point from ad click to signed application." },
      { label: "Compliance Blueprint", icon: Server, text: "Audit your current Title-IV and NACCAS reporting data structures." },
      { label: "Pedagogy Check", icon: ShieldCheck, text: "Evaluate the state board failure patterns of your previous cohorts." },
      { label: "Economic ROI", icon: Target, text: "Measure your current tuition costs against average graduate earnings." },
    ],
    accentClass: "text-muted-foreground bg-muted border-border",
    glowClass: "bg-muted/5",
  },
  {
    stage: "Cognitive Deployment",
    status: "Phase 2",
    description: "Elite engineering squads building and integrating your custom intelligence models.",
    points: [
      { label: "Dedicated Pods", icon: Cpu, text: "Specialized engineers focused solely on your academy's data." },
      { label: "Diagnostic AI", icon: Zap, text: "Deploying your custom State Board pass probability engine." },
      { label: "Placement Matcher", icon: Server, text: "Mapping 35,000+ local shops specifically for your geography." },
      { label: "Live Transparency", icon: Target, text: "Direct visibility into our technical integration velocity." },
    ],
    accentClass: "text-primary bg-primary/10 border-primary/20",
    glowClass: "bg-primary/20",
    isHighlighted: true,
  },
  {
    stage: "Academy Scale",
    status: "Phase 3",
    description: "Continuous optimization across your school network and instructor portals.",
    points: [
      { label: "Audit Readiness", icon: ShieldCheck, text: "Rigorous mock-audits simulating NACCAS/ACCSC requirements." },
      { label: "Instructor Handoff", icon: Rocket, text: "Comprehensive training for your teaching staff and administration." },
      { label: "Cohort Tracking", icon: Target, text: "Real-time monitoring of active student telemetry and progress." },
      { label: "Institutional Moat", icon: Rocket, text: "Launching the technical advantage that defines your school's brand." },
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
            The Trade School Innovation Lifecycle
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
            Audit. Integrate. Dominate.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Our enterprise-grade implementation cycle is battle-tested for deploying Artificial Domain Intelligence (ADI) into Barber and Cosmetology academies without disrupting daily operations.
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
