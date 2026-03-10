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

export function SignalCard({ signal, isResolving, onResolve }: SignalCardProps) {
    const Icon = TYPE_ICONS[signal.signalType] || Zap

    return (
        <div className="glass-panel-strong rounded-2xl p-6 border border-white/[0.03] relative overflow-hidden group transition-all hover:border-white/10">
            {/* Pulse indicator */}
            <div className="absolute top-0 right-0 p-3">
                <span className={`flex h-2 w-2 rounded-full animate-pulse ${signal.color}`} />
            </div>

            <div className="flex items-center gap-3 mb-4">
                <Icon className={`h-5 w-5 ${signal.color.replace('bg-', 'text-')}`} />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {signal.signalType.replace("_", " ")} Signal
                </span>
            </div>

            <h3 className="text-lg font-bold mb-2">{signal.title}</h3>
            <p className="text-sm text-muted-foreground mb-6 line-clamp-3 leading-relaxed">{signal.body}</p>

            <Button
                id={`btn-signal-action-${signal.id}`}
                className={`w-full ${signal.buttonColor} gap-2 h-11 font-bold shadow-lg shadow-black/20 transition-transform active:scale-95`}
                onClick={() => onResolve(signal.id)}
                disabled={isResolving}
            >
                {isResolving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <>
                        {signal.actionLabel}
                        <ArrowUpRight className="h-4 w-4" />
                    </>
                )}
            </Button>
        </div>
    )
}
