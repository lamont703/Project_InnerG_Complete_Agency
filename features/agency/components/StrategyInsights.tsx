"use client"

import { Sparkles } from "lucide-react"

export interface StrategicSignal {
    id: string
    title: string
    body: string
    severity: "critical" | "warning" | "info"
    created_at: string
    projects?: {
        name: string
    }
}

interface StrategyInsightsProps {
    signals: StrategicSignal[]
    newSignalId?: string | null
}

export function StrategyInsights({ signals, newSignalId }: StrategyInsightsProps) {
    return (
        <div className="glass-panel-strong rounded-2xl p-6 border border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    Agency Strategic Insights
                </h3>
                <span className="text-[10px] font-bold py-0.5 px-2 rounded-full bg-primary/20 text-primary border border-primary/30 uppercase tracking-widest">
                    Super Admin Eyes Only
                </span>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {signals.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6 italic">No strategic insights generated yet.</p>
                ) : (
                    signals.map((signal) => (
                        <div
                            key={signal.id}
                            className={`p-4 rounded-xl border transition-all duration-1000 ${newSignalId === signal.id
                                ? "bg-primary/20 border-primary ring-2 ring-primary animate-pulse"
                                : "bg-white/[0.03] border-white/10 hover:border-primary/40"
                                }`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-bold text-foreground leading-tight">{signal.title}</p>
                                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{signal.body}</p>
                                    <div className="flex items-center gap-2 mt-3">
                                        <span className="text-[9px] font-bold uppercase py-0.5 px-1.5 rounded bg-white/10 text-muted-foreground">
                                            {signal.projects?.name || "Global"}
                                        </span>
                                        <span className="text-[9px] text-muted-foreground/60 font-medium">
                                            {new Date(signal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${signal.severity === "critical" ? "bg-red-500/20 text-red-400" :
                                    signal.severity === "warning" ? "bg-amber-500/20 text-amber-400" :
                                        "bg-blue-500/20 text-blue-400"
                                    }`}>
                                    {signal.severity}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
