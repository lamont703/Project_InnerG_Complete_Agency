"use client"

import { AlertCircle } from "lucide-react"
import { useSignals } from "./use-signals"

interface SignalGridProps {
    projectSlug: string
    initialSignals?: any[]
    onResolve?: (id: string, params?: { platforms?: string[], scheduledAt?: string }) => void
    isFlush?: boolean
}

import { UnifiedStream } from "../agency/components/UnifiedStream"

export function SignalGrid({
    projectSlug,
    initialSignals,
    onResolve: parentOnResolve,
    isFlush = false
}: SignalGridProps) {
    const {
        signals,
        drafts,
        isLoading,
        resolvingId,
        error,
        resolveSignal,
        publishDraft,
        deleteDraft
    } = useSignals(projectSlug, initialSignals)

    const handleResolve = async (id: string, params?: { platforms?: string[], scheduledAt?: string }) => {
        await resolveSignal(id, params)
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

    // Map signals to the format UnifiedStream expects if necessary
    // (In this case they already match mostly, but we define the mapper for safety)
    const mappedSignals = signals.map(s => ({
        ...s,
        createdAt: s.createdAt || new Date().toISOString()
    }))

    return (
        <div className={isFlush ? "h-full min-h-0 flex flex-col" : "mb-12 h-[700px]"}>
            <UnifiedStream
                signals={mappedSignals}
                drafts={drafts}
                onResolveSignal={handleResolve}
                onPublishDraft={publishDraft}
                onDeleteDraft={deleteDraft}
                isResolving={!!resolvingId}
                isFlush={isFlush}
            />
        </div>
    )
}
