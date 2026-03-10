"use client"

import { SignalGrid } from "@/features/signals/SignalGrid"
import { Signal } from "@/features/signals/types"

interface AiSignalCardsProps {
    projectSlug: string
    /** Optional: Initial signals if parent provides them */
    signals?: any[]
    campaignLabel?: string
    /** Called when a signal action button is clicked */
    onResolve?: (signalId: string) => void
}

/**
 * @deprecated Use @/features/signals/SignalGrid instead.
 * This is a wrapper to maintain backward compatibility during the modular refactor.
 */
export function AiSignalCards({
    projectSlug,
    onResolve
}: AiSignalCardsProps) {
    return (
        <SignalGrid
            projectSlug={projectSlug}
            onResolve={onResolve}
        />
    )
}
