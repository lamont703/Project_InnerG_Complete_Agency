import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Metric } from "../types"

interface MetricCardProps {
    stat: Metric
}

export function MetricCard({ stat, isAgency = false }: MetricCardProps & { isAgency?: boolean }) {
    const handleDeepDive = (e: React.MouseEvent) => {
        e.stopPropagation()
        const eventName = isAgency ? 'innerg-agency-discuss-signal' : 'innerg-discuss-signal'
        window.dispatchEvent(new CustomEvent(eventName, {
            detail: {
                signalTitle: isAgency ? `Portfolio Deep Dive: ${stat.label}` : `Metric Deep Dive: ${stat.label}`,
                signalBody: `The current value for ${stat.label} is ${stat.value}${stat.growth ? ` with a growth of ${stat.growth}` : ''}${stat.change ? ` (${stat.change})` : ''}. Analyze this trend and suggest optimization strategies.`
            }
        }))
    }

    return (
        <div className="glass-panel-strong rounded-3xl p-6 border border-border relative overflow-hidden group transition-all duration-500 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5">
            {/* Electric gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div className={`p-2.5 rounded-xl ${stat.color} shadow-lg shadow-black/20 group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col items-end">
                    {/* Badge: Handles either Growth or Trend/Change */}
                    {(stat.growth || stat.change) && (
                        <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${stat.trend === "up" || (stat.growth && stat.growth.startsWith("+"))
                            ? "bg-emerald-500/10 text-emerald-400"
                            : stat.trend === "down" || (stat.growth && stat.growth.startsWith("-"))
                                ? "bg-red-500/10 text-red-400"
                                : "bg-muted text-muted-foreground"
                            }`}>
                            {stat.trend === "up" && <ArrowUpRight className="h-3 w-3" />}
                            {stat.trend === "down" && <ArrowDownRight className="h-3 w-3 rotate-90" />}
                            {stat.growth || stat.change}
                        </div>
                    )}
                    <button
                        onClick={handleDeepDive}
                        className="mt-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group/btn"
                    >
                        Deep Dive <ArrowUpRight className="h-2 w-2 group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            </div>

            <div className="relative z-10 text-left">
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] group-hover:text-foreground transition-colors">
                    {stat.label}
                </p>
                <h3 className="text-3xl font-bold text-foreground mt-2 group-hover:text-primary transition-colors tracking-tight font-black">{stat.value}</h3>
            </div>
        </div>
    )
}
