const results = [
  {
    category: "Operational Efficiency",
    metric: "84%",
    metricLabel: "Time Reclaimed",
    description:
      "Automated multi-location booking and membership workflows for a 50-unit MedSpa franchise, reclaiming 1,200+ team hours monthly.",
    tags: ["AI Automation", "Franchise Scale", "ROI Focus"],
  },
  {
    category: "Infrastructure Scaling",
    metric: "10x",
    metricLabel: "Throughput Boost",
    description:
      "Re-architected patient records and supply chain tracking for a global dermo-cosmetics network to handle surge in digital diagnostics.",
    highlights: ["HIPAA-Compliant", "Cloud Architecture", "Zero Downtime"],
    tags: ["Scalability", "Clinical Data", "Cloud Ops"],
  },
  {
    category: "Revenue Expansion",
    metric: "42%",
    metricLabel: "LTV Increase",
    description:
      "Deployed a skin-type analysis and product recommendation engine that boosted lifetime value for a Tier-1 luxury skincare brand.",
    tags: ["Personalization", "Retention AI", "Beauty-Tech"],
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
            Realized Business Intelligence
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Every engagement is measured by the tangible business value we create
            for the world's most ambitious wellness enterprises.
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
              "Medical Aesthetics",
              "Luxury Skincare",
              "Global Franchises",
              "Professional Grooming",
              "Dermo-Cosmetics",
              "Wellness Tech",
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
