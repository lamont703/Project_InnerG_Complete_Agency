"use client"

import { Zap, CheckCircle2 } from "lucide-react"
import { StrategicSignal, OperationalSignal } from "../types"
import { SignalCard } from "@/features/signals/components/SignalCard"
import { Signal, SignalType, SignalSeverity } from "@/features/signals/types"

interface AgencySignalGridProps {
    strategicSignals: StrategicSignal[]
    operationalSignals: OperationalSignal[]
    newSignalId?: string | null
}

export function AgencySignalGrid({ strategicSignals, operationalSignals, newSignalId }: AgencySignalGridProps) {
    // Map agency signals to standard Signal type for unified Card usage
    const allSignals: Signal[] = [
        ...strategicSignals.map(s => ({
            id: s.id,
            signalType: 'strategic' as SignalType,
            title: s.title,
            body: s.body,
            actionLabel: "STRATEGY ACK",
            severity: s.severity as SignalSeverity,
            color: s.severity === 'critical' ? 'bg-red-500' : s.severity === 'warning' ? 'bg-amber-500' : 'bg-primary',
            buttonColor: 'bg-primary',
            isAgencyOnly: true,
            projectName: s.projects?.name,
            createdAt: s.created_at
        })),
        ...operationalSignals.map(s => ({
            id: s.id,
            signalType: s.signal_type as SignalType,
            title: s.title,
            body: s.body,
            actionLabel: "RESOLVE",
            severity: s.severity as SignalSeverity,
            color: s.severity === 'critical' ? 'bg-red-500' : s.severity === 'warning' ? 'bg-amber-500' : 'bg-primary',
            buttonColor: 'bg-primary',
            isAgencyOnly: false,
            projectName: s.projects?.name,
            createdAt: s.created_at
        }))
    ].sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())

    return (
        <div className="glass-panel-strong rounded-3xl p-8 border border-white/[0.05] relative overflow-hidden group/main h-full flex flex-col">
            {/* Background ambient glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-[0.2em] text-white">Portfolio Intelligence</h3>
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">Cross-Architecture Monitoring</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Neural Sync</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2 relative z-10 min-h-0">
                {allSignals.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                        <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-4 border border-primary/10">
                            <CheckCircle2 className="h-8 w-8 text-primary/40" />
                        </div>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">Intelligence Stream Isolated</p>
                        <p className="text-[10px] text-muted-foreground/40 mt-2 px-12 italic">No high-level strategic or operational signals detected across the global portfolio.</p>
                    </div>
                ) : (
                    allSignals.map((signal) => (
                        <SignalCard
                            key={signal.id}
                            signal={signal}
                            isResolving={false}
                            onResolve={() => { }}
                            isAgencyMode={true}
                        />
                    ))
                )}
            </div>
        </div>
    )
}
