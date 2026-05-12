"use client"

import { MetricCard } from "@/features/metrics/components/MetricCard"

export interface PortfolioMetric {
    label: string
    value: string | number
    change?: string
    trend?: "up" | "down" | "neutral"
    icon: React.ElementType
    color: string
}

interface PortfolioGridProps {
    metrics: any[] // Using any temporarily for mapping
}

export function PortfolioGrid({ metrics }: PortfolioGridProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
            {metrics.map((m) => (
                <MetricCard
                    key={m.label}
                    stat={{
                        label: m.label,
                        value: m.value,
                        change: m.change,
                        trend: m.trend,
                        icon: m.icon,
                        color: m.color
                    }}
                    isAgency={true}
                />
            ))}
        </div>
    )
}
