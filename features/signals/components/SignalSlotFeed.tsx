"use client"

import { CheckCircle2 } from "lucide-react"
import { Signal, SignalSlot } from "../types"
import { getSignalSlotById } from "../registry"
import { getSignalIcon } from "../utils/icon-map"
import { SignalCard } from "./SignalCard"

interface SignalSlotFeedProps {
    slotId: string
    signals: Signal[]
    isAgencyMode?: boolean
    onResolve?: (id: string) => void
    isResolving?: boolean
    highlightId?: string | null
}

/**
 * SignalSlotFeed
 * 
 * A dynamic feed component that renders AI Signals based on a Slot configuration.
 * This can be dropped into any dashboard "Slot" to show context-specific intelligence.
 */
export function SignalSlotFeed({
    slotId,
    signals,
    isAgencyMode = false,
    onResolve = () => { },
    isResolving = false,
    highlightId = null
}: SignalSlotFeedProps) {
    const config = getSignalSlotById(slotId)

    if (!config) {
        console.warn(`[SignalSlotFeed] Slot ID "${slotId}" not found in registry.`)
        return null
    }

    const Icon = getSignalIcon(config.iconName)

    return (
        <div className="glass-panel-strong rounded-3xl p-8 border border-white/[0.05] relative overflow-hidden group/main h-full flex flex-col">
            {/* Background ambient glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="hidden lg:flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-[0.2em] text-white">{config.label}</h3>
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">{config.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Live Stream</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2 relative z-10 min-h-0 pb-24 lg:pb-0">
                {signals.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                        <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-4 border border-primary/10">
                            <CheckCircle2 className="h-8 w-8 text-primary/40" />
                        </div>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">No signals detected</p>
                        <p className="text-[10px] text-muted-foreground/40 mt-2 px-12 italic">Everything looks stable. Aura is monitoring the stream.</p>
                    </div>
                ) : (
                    signals.map((signal) => (
                        <SignalCard
                            key={signal.id}
                            signal={signal}
                            isResolving={isResolving}
                            onResolve={onResolve}
                            isAgencyMode={isAgencyMode || config.category === 'agency'}
                            isHighlighted={signal.id === highlightId}
                        />
                    ))
                )}
            </div>
        </div>
    )
}
