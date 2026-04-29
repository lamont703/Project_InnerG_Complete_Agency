import React from "react"
import { BarChart3, Zap, Activity, Database, Shield, Layers } from "lucide-react"

interface Signal {
  label: string
  value: string
  icon?: "chart" | "zap" | "activity" | "data" | "shield" | "layers"
}

interface StatisticalSignalProps {
  signals: Signal[]
}

const iconMap = {
  chart: BarChart3,
  zap: Zap,
  activity: Activity,
  data: Database,
  shield: Shield,
  layers: Layers
}

export function StatisticalSignal({ signals }: StatisticalSignalProps) {
  return (
    <div className="my-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
      {signals.map((signal, index) => {
        const Icon = signal.icon ? iconMap[signal.icon] : Activity
        return (
          <div 
            key={index}
            className="p-6 rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/5 to-transparent flex flex-col items-center text-center group hover:border-primary/30 transition-all duration-300"
          >
            <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="text-2xl font-black text-foreground tracking-tighter mb-1">
              {signal.value}
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors">
              {signal.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}
