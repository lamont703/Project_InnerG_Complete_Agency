"use client"

import { AlertCircle } from "lucide-react"
import { useSignals } from "./use-signals"

interface SignalGridProps {
    projectSlug: string
    initialSignals?: any[]
    onResolve?: (id: string) => void
    isFlush?: boolean
}

import { SignalSlotFeed } from "./components/SignalSlotFeed"

export function SignalGrid({
    projectSlug,
    initialSignals,
    onResolve: parentOnResolve,
    isFlush = false
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

    if (error) {
        return (
            <div className={`p-8 glass-panel text-center border-destructive/20 ${isFlush ? "" : "mb-12"}`}>
                <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
        )
    }

    return (
        <div className={isFlush ? "h-full min-h-0 flex flex-col" : "mb-12 h-[700px]"}>
            <SignalSlotFeed
                slotId="marketing_intelligence"
                signals={signals}
                isResolving={!!resolvingId}
                onResolve={handleResolve}
            />
        </div>
    )
}
