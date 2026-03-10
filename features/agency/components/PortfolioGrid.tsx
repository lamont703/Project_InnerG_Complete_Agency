"use client"

import { ReactNode } from "react"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"

export interface PortfolioMetric {
    label: string
    value: string | number
    change?: string
    trend?: "up" | "down" | "neutral"
    icon: React.ElementType
    color: string
}

interface PortfolioCardProps {
    metric: PortfolioMetric
}

function PortfolioCard({ metric }: PortfolioCardProps) {
    return (
        <div className="glass-panel rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-all group">
            <div className="flex items-start justify-between mb-4">
                <div className={`h-10 w-10 rounded-xl ${metric.color} flex items-center justify-center`}>
                    <metric.icon className="h-5 w-5" />
                </div>
                {metric.change && (
                    <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${metric.trend === "up"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : metric.trend === "down"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-white/5 text-muted-foreground"
                        }`}>
                        {metric.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : metric.trend === "down" ? <ArrowDownRight className="h-3 w-3" /> : null}
                        {metric.change}
                    </div>
                )}
            </div>
            <p className="text-2xl font-bold text-foreground tracking-tight">{metric.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{metric.label}</p>
        </div>
    )
}

interface PortfolioGridProps {
    metrics: PortfolioMetric[]
}

export function PortfolioGrid({ metrics }: PortfolioGridProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
            {metrics.map((metric) => (
                <PortfolioCard key={metric.label} metric={metric} />
            ))}
        </div>
    )
}
