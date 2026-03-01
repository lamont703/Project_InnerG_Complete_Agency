const results = [
  {
    industry: "Financial Services",
    metric: "340%",
    metricLabel: "ROI Increase",
    description:
      "Deployed AI-powered fraud detection system for a top-10 bank, reducing false positives by 67% and saving $48M annually.",
    tags: ["AI/ML", "Risk Analytics", "Real-time Processing"],
  },
  {
    industry: "Supply Chain",
    metric: "52%",
    metricLabel: "Cost Reduction",
    description:
      "Built a blockchain-based traceability platform for a Fortune 500 logistics firm, cutting verification time from days to seconds.",
    tags: ["Blockchain", "Supply Chain", "Smart Contracts"],
  },
  {
    industry: "Healthcare",
    metric: "12x",
    metricLabel: "Faster Diagnosis",
    description:
      "Developed computer vision models for a leading health system, enabling automated analysis of medical imaging at scale.",
    tags: ["Computer Vision", "Healthcare AI", "HIPAA Compliant"],
  },
]

export function ResultsSection() {
  return (
    <section id="results" className="relative py-32">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent" aria-hidden="true" />

      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Results
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
            Proven Impact Across Industries
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Every engagement is measured by the tangible business value we create.
            Here are a few examples of what we deliver.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {results.map((result) => (
            <div
              key={result.industry}
              className="group relative rounded-2xl glass-panel p-8 transition-all duration-300 hover:border-primary/30"
            >
              <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />

              <div className="relative z-10">
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                  {result.industry}
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
      </div>
    </section>
  )
}
