"use client"

import { AlertTriangle, CheckCircle2 } from "lucide-react"

export interface OperationalSignal {
    id: string
    title: string
    signal_type: string
    severity: "critical" | "warning" | "info"
    created_at: string
    is_resolved: boolean
    projects?: {
        name: string
    }
}

interface OperationalSignalsProps {
    signals: OperationalSignal[]
    newSignalId?: string | null
}

export function OperationalSignals({ signals, newSignalId }: OperationalSignalsProps) {
    const activeSignals = signals.filter(s => !s.is_resolved)

    return (
        <div className="glass-panel rounded-2xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    Operational Signals
                </h3>
                <span className="text-xs text-muted-foreground">{activeSignals.length} active</span>
            </div>
            <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar">
                {activeSignals.length === 0 ? (
                    <div className="flex flex-col items-center py-6 text-center">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                        <p className="text-sm text-muted-foreground">No active operational signals.</p>
                    </div>
                ) : (
                    activeSignals.slice(0, 10).map((signal) => (
                        <div
                            key={signal.id}
                            className={`p-3 rounded-xl border transition-all ${newSignalId === signal.id
                                ? "bg-amber-500/20 border-amber-500 animate-pulse"
                                : signal.severity === "critical" ? "bg-red-500/5 border-red-500/20"
                                    : signal.severity === "warning" ? "bg-amber-500/5 border-amber-500/20"
                                        : "bg-blue-500/5 border-blue-500/20"
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-foreground">{signal.title}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        {signal.projects?.name || "Unknown"} • {signal.signal_type} • {new Date(signal.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${signal.severity === "critical"
                                    ? "bg-red-500/20 text-red-400"
                                    : signal.severity === "warning"
                                        ? "bg-amber-500/20 text-amber-400"
                                        : "bg-blue-500/20 text-blue-400"
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
