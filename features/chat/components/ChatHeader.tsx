import { Bot, Sparkles, Cpu, Maximize2, Minimize2 } from "lucide-react"

interface ChatHeaderProps {
    isExpanded: boolean
    onToggleExpand: () => void
    modelName: string
}

export function ChatHeader({ isExpanded, onToggleExpand, modelName }: ChatHeaderProps) {
    return (
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                    <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        Growth Assistant
                        <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                    </h3>
                    <p className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider">Systems Online</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                    <Cpu className="h-3 w-3 text-primary" />
                    <span className="text-[9px] font-bold text-primary uppercase tracking-widest">{modelName}</span>
                </div>

                <button
                    onClick={onToggleExpand}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors text-muted-foreground"
                >
                    {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
            </div>
        </div>
    )
}
