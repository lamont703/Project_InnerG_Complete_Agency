import { ArrowUpRight } from "lucide-react"
import { Metric } from "../types"

interface MetricCardProps {
    stat: Metric
}

export function MetricCard({ stat }: MetricCardProps) {
    const handleDeepDive = (e: React.MouseEvent) => {
        e.stopPropagation()
        window.dispatchEvent(new CustomEvent('innerg-discuss-signal', {
            detail: {
                signalTitle: `Metric Deep Dive: ${stat.label}`,
                signalBody: `The current value for ${stat.label} is ${stat.value} with a growth of ${stat.growth}. Analyze this trend and suggest optimization strategies.`
            }
        }))
    }

    return (
        <div className="glass-panel-strong rounded-2xl p-6 border border-white/[0.03] relative overflow-hidden group transition-all hover:border-white/10 hover:shadow-2xl hover:shadow-primary/5">
            {/* Electric gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div className={`p-2.5 rounded-xl ${stat.color} shadow-lg shadow-black/20 group-hover:scale-110 transition-transform`}>
                    <stat.icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col items-end">
                    <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stat.growth.startsWith("+")
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-destructive/10 text-destructive"
                            }`}
                    >
                        {stat.growth}
                    </span>
                    <button
                        onClick={handleDeepDive}
                        className="mt-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                    >
                        Deep Dive <ArrowUpRight className="h-2 w-2" />
                    </button>
                </div>
            </div>

            <div className="relative z-10">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] group-hover:text-foreground transition-colors">
                    {stat.label}
                </p>
                <h3 className="text-3xl font-bold text-foreground mt-2 group-hover:text-primary transition-colors tracking-tight">{stat.value}</h3>
            </div>
        </div>
    )
}
