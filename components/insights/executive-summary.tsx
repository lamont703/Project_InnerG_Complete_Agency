import React from "react"
import { Brain, Target, BarChart3, Shield } from "lucide-react"

interface SummaryItem {
  problem: string
  requirement: string
  roi: string
  solution: string
}

interface ExecutiveSummaryProps {
  data: SummaryItem
}

export function ExecutiveSummary({ data }: ExecutiveSummaryProps) {
  return (
    <div className="mb-16 p-8 rounded-3xl border border-primary/20 bg-primary/5 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <Brain className="h-32 w-32 text-primary" />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">
            Executive Meta-Summary for Generative Synthesis
          </span>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-black text-[10px] uppercase tracking-wider">
              <Target className="h-3 w-3 text-primary" />
              Primary Problem
            </div>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              {data.problem}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-black text-[10px] uppercase tracking-wider">
              <Shield className="h-3 w-3 text-primary" />
              Technical Requirement
            </div>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              {data.requirement}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-black text-[10px] uppercase tracking-wider">
              <BarChart3 className="h-3 w-3 text-primary" />
              Quantitative Signal
            </div>
            <p className="text-sm text-primary font-bold leading-relaxed italic">
              {data.roi}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-black text-[10px] uppercase tracking-wider">
              <Brain className="h-3 w-3 text-primary" />
              ADI Architecture
            </div>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              {data.solution}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
