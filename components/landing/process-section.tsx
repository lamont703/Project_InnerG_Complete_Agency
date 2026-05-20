import { Search, PenTool, Code2, Rocket } from "lucide-react"

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Project Audit",
    description:
      "We analyze your school's current operations, from enrollment funnels to Title-IV compliance, to locate the exact friction points draining your revenue.",
  },
  {
    icon: PenTool,
    step: "02",
    title: "Tailored Design",
    description:
      "We blueprint custom AI agents and diagnostic tools that align directly with your curriculum and your NACCAS or ACCSC accreditation thresholds.",
  },
  {
    icon: Code2,
    step: "03",
    title: "Agile Build",
    description:
      "We rapidly deploy the intelligence layer, seamlessly integrating predictive grading and job placement tracking with your existing school software.",
  },
  {
    icon: Rocket,
    step: "04",
    title: "Continuous Optimization",
    description:
      "We don't just launch and leave. Your ADI model learns from every new student cohort, constantly improving your pass rates and enrollment conversions.",
  },
]

export function ProcessSection() {
  return (
    <section id="process" className="relative py-32">
      {/* Subtle divider glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent" aria-hidden="true" />

      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Our Process
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
            The Inner G Complete Methodology
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            A proven four-phase methodology that integrates our Artificial Domain Intelligence directly into your school's existing workflows.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.step} className="relative group">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="absolute top-12 left-full hidden h-px w-8 bg-gradient-to-r from-primary/30 to-transparent lg:block" aria-hidden="true" />
              )}

              <div className="rounded-2xl glass-panel p-8 transition-all duration-300 hover:border-primary/30 h-full">
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-sm font-bold text-primary/60">{step.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
