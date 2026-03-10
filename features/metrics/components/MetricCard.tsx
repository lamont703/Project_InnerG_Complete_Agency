import { Metric } from "../types"

interface MetricCardProps {
    stat: Metric
}

export function MetricCard({ stat }: MetricCardProps) {
    return (
        <div className="glass-panel-strong rounded-2xl p-6 border border-white/5 transition-transform hover:scale-[1.02]">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-lg ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                </div>
                <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stat.growth.startsWith("+")
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-destructive/10 text-destructive"
                        }`}
                >
                    {stat.growth}
                </span>
            </div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {stat.label}
            </p>
            <h3 className="text-2xl font-bold text-foreground mt-1">{stat.value}</h3>
        </div>
    )
}
