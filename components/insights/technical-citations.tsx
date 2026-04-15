import React from "react"
import { ExternalLink, ShieldCheck } from "lucide-react"

interface Citation {
  source: string
  label: string
  url: string
}

interface TechnicalCitationsProps {
  citations: Citation[]
}

export function TechnicalCitations({ citations }: TechnicalCitationsProps) {
  return (
    <section className="mt-20 py-12 border-t border-border/50 bg-secondary/5 rounded-3xl px-8">
      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">
          Institutional Standards & Adherence
        </span>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {citations.map((citation, index) => (
          <div 
            key={index}
            className="flex items-start gap-4 p-4 rounded-xl border border-border bg-white group hover:border-primary/20 transition-all duration-300"
          >
            <div className="flex-1">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                {citation.source}
              </div>
              <div className="text-sm font-bold text-foreground">
                {citation.label}
              </div>
            </div>
            <a 
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 w-8 rounded-lg bg-secondary/50 flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all duration-300"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        ))}
      </div>
      
      <p className="mt-8 text-[10px] text-muted-foreground leading-relaxed italic font-medium max-w-2xl px-2">
        Inner G Complete Agency architectures are built explicitly to exceed the governance and ethical constraints defined by these global standard-bearing organizations.
      </p>
    </section>
  )
}
