const results = [
  {
    category: "Enrollment Velocity",
    metric: "3.2x",
    metricLabel: "Lead Conversion",
    description:
      "Deployed Omni-Channel Admissions AI for a regional cosmetology academy, recovering 400+ abandoned applications in the first quarter.",
    tags: ["Lead Recovery", "AI Admissions", "Enrollment ROI"],
  },
  {
    category: "State Board Licensure",
    metric: "92%",
    metricLabel: "First-Time Pass Rate",
    description:
      "Integrated our Predictive Diagnostics engine, catching at-risk students 30 days prior to their exams and boosting state board pass rates.",
    highlights: ["NACCAS-Compliant", "Predictive Analytics", "Early Intervention"],
    tags: ["Compliance", "Diagnostic AI", "Pass Probability"],
  },
  {
    category: "Job Placement",
    metric: "100%",
    metricLabel: "Audit Readiness",
    description:
      "Mapped 35,000+ local shops to automatically secure graduate interviews, ensuring perfect placement thresholds for Title-IV audits.",
    tags: ["Career Placement", "Geospatial AI", "Title-IV Security"],
  },
]

export function ResultsSection() {
  return (
    <section id="results" className="relative py-32">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent" aria-hidden="true" />

      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Proven Outcomes
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
            Realized Institutional Intelligence
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Every deployment is measured by the tangible enrollment growth and compliance security we create for ambitious trade schools.
          </p>
        </div>

        {/* Results Grid */}
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {results.map((result) => (
            <div
              key={result.category}
              className="group relative rounded-2xl glass-panel p-8 transition-all duration-300 hover:border-primary/30"
            >
              <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />

              <div className="relative z-10">
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                  {result.category}
                </span>

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-gradient">{result.metric}</span>
                  <span className="text-sm font-medium text-muted-foreground">{result.metricLabel}</span>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {result.description}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {result.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Industry Experience Logo Cloud */}
        <div className="mt-32">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
            Institutional Experience Across
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-x-12 gap-y-8 opacity-60">
            {[
              "Cosmetology Academies",
              "Barber Colleges",
              "Trade School Networks",
              "NACCAS Audits",
              "Title-IV Compliance",
              "Esthetics Programs",
            ].map((industry) => (
              <div
                key={industry}
                className="text-lg font-bold tracking-tight text-foreground/80 hover:text-primary transition-colors cursor-default"
              >
                {industry}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
