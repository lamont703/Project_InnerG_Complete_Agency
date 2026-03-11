import { Database, Zap, Instagram, Loader2, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Signal } from "../types"

const TYPE_ICONS: Record<string, any> = {
    inventory: Database,
    conversion: Zap,
    social: Instagram,
}

interface SignalCardProps {
    signal: Signal
    isResolving: boolean
    onResolve: (id: string) => void
}

export function SignalCard({ signal, isResolving, onResolve, isAgencyMode = false }: SignalCardProps & { isAgencyMode?: boolean }) {
    const Icon = TYPE_ICONS[signal.signalType] || Zap
    const isAgencyInsight = signal.isAgencyOnly || isAgencyMode

    const handleDiscuss = (e: React.MouseEvent) => {
        e.stopPropagation()
        const eventName = isAgencyInsight ? 'innerg-agency-discuss-signal' : 'innerg-discuss-signal'
        window.dispatchEvent(new CustomEvent(eventName, {
            detail: {
                signalTitle: signal.title,
                signalBody: signal.body
            }
        }))
    }

    return (
        <div className={`glass-panel-strong rounded-3xl p-8 border relative overflow-hidden group transition-all duration-500 hover:shadow-2xl ${isAgencyInsight
                ? "border-primary/20 hover:border-primary/40 hover:shadow-primary/10 bg-primary/[0.02]"
                : "border-white/[0.05] hover:border-white/10 hover:shadow-primary/5"
            }`}>
            {/* Ambient electric gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            {/* Pulse Indicator (Dynamic based on severity) */}
            <div className="absolute top-0 right-0 p-4">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">
                        {isAgencyInsight ? "Aura Intelligence" : "System Live"}
                    </span>
                    <span className={`flex h-2.5 w-2.5 rounded-full animate-pulse ${isAgencyInsight ? "bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.5)]" : `${signal.color} shadow-[0_0_12px_rgba(var(--primary),0.5)]`
                        }`} />
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-start gap-6 relative z-10">
                {/* Visual Icon Pillar */}
                <div className={`shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner ${isAgencyInsight ? "bg-violet-500/10" : "bg-white/5"
                    }`}>
                    <Icon className={`h-7 w-7 ${isAgencyInsight ? "text-violet-400" : signal.color.replace('bg-', 'text-')}`} />
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/5 ${isAgencyInsight
                                ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                                : `${signal.color.replace('bg-', 'bg- opacity-10')} ${signal.color.replace('bg-', 'text-')}`
                            }`}>
                            {isAgencyInsight ? "God Mode Strategy" : signal.signalType.replace("_", " ")}
                        </span>
                        {signal.projectName && (
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                                {signal.projectName}
                            </span>
                        )}
                    </div>

                    <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors duration-300 tracking-tight leading-tight">
                        {signal.title}
                    </h3>

                    <p className="text-sm text-balance text-muted-foreground mb-8 leading-relaxed max-w-xl group-hover:text-white/90 transition-colors">
                        {signal.body}
                    </p>

                    {/* Action Hub - Side-by-Side Interconnected Controls */}
                    <div className="flex flex-wrap items-center gap-4">
                        <Button
                            id={`btn-signal-action-${signal.id}`}
                            className={`${isAgencyInsight ? "bg-violet-600 hover:bg-violet-500 text-white" : signal.buttonColor} px-6 rounded-xl h-11 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95 border-b-2 border-black/20`}
                            onClick={() => onResolve(signal.id)}
                            disabled={isResolving}
                        >
                            {isResolving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    {isAgencyInsight ? "ACKNOWLEDGE" : signal.actionLabel}
                                    <ArrowUpRight className="h-4 w-4 ml-2" />
                                </>
                            )}
                        </Button>

                        <Button
                            variant="ghost"
                            className="h-11 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white hover:bg-white/5 border border-white/5 group-hover:border-white/10 transition-all"
                            onClick={handleDiscuss}
                        >
                            {isAgencyInsight ? "Discuss Intelligence" : "Discuss Strategy"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
