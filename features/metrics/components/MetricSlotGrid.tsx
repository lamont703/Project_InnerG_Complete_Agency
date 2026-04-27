"use client"

import { Metric } from "../types"
import { getSlotById } from "../registry"
import { getIcon } from "../utils/icon-map"
import { MetricCard } from "./MetricCard"

interface MetricSlotGridProps {
    slotIds: string[]
    metrics: Metric[]
    isAgency?: boolean
    className?: string
}

/**
 * MetricSlotGrid
 * 
 * A dynamic grid that renders MetricCards based on Slot IDs.
 * This is the primary interface for the AI and users to compose
 * their dashboard layouts.
 */
export function MetricSlotGrid({
    slotIds,
    metrics,
    isAgency = false,
    className = ""
}: MetricSlotGridProps) {
    return (
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10 ${className}`}>
            {slotIds.map(id => {
                const config = getSlotById(id)
                if (!config) {
                    console.warn(`[MetricSlotGrid] Slot ID "${id}" not found in registry.`)
                    return null
                }

                // Match fetched data to registry config
                const stat = metrics.find(m => m.id === id || m.label === config.label)

                // Resolve icon from registry string
                const Icon = getIcon(config.iconName)

                if (!stat) {
                    // Show a high-fidelity placeholder if no data yet
                    return (
                        <MetricCard
                            key={id}
                            stat={{
                                id: id,
                                label: config.label,
                                value: "---",
                                growth: "Analyzing...",
                                trend: "neutral",
                                icon: Icon,
                                color: "text-muted-foreground bg-muted/10"
                            }}
                            isAgency={isAgency}
                        />
                    )
                }

                return (
                    <MetricCard
                        key={id}
                        stat={{
                            ...stat,
                            icon: Icon,
                            label: config.label // Registry label is the "Source of Truth"
                        }}
                        isAgency={isAgency}
                    />
                )
            })}
        </div>
    )
}
