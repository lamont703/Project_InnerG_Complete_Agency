"use client"

import { AlertCircle } from "lucide-react"
import { SignalCard } from "./components/SignalCard"
import { useSignals } from "./use-signals"
import { Signal } from "./types"

interface SignalGridProps {
    projectSlug: string
    initialSignals?: Signal[]
    onResolve?: (id: string) => void
}

export function SignalGrid({
    projectSlug,
    initialSignals,
    onResolve: parentOnResolve
}: SignalGridProps) {
    const {
        signals,
        isLoading,
        resolvingId,
        error,
        resolveSignal
    } = useSignals(projectSlug, initialSignals)

    const handleResolve = async (id: string) => {
        await resolveSignal(id)
        parentOnResolve?.(id)
    }

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                {[1, 2, 3].map(i => (
                    <div key={i} className="glass-panel h-64 animate-pulse rounded-2xl" />
                ))}
            </div>
        )
    }

    if (signals.length === 0 && !error) return null

    return (
        <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Campaign Funnel Intelligence</h2>
                    <p className="text-sm text-muted-foreground">
                        Real-time signals from your integrated data stack.
                    </p>
                </div>
                <div className="flex gap-2">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/20">
                        Live Analytics
                    </span>
                </div>
            </div>

            {error ? (
                <div className="p-8 glass-panel text-center border-destructive/20">
                    <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                    <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {signals.map((signal) => (
                        <SignalCard
                            key={signal.id}
                            signal={signal}
                            isResolving={resolvingId === signal.id}
                            onResolve={handleResolve}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
