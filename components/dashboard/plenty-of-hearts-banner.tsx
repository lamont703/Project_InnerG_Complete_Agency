"use client"

import { Heart, Music2, Database, Sparkles } from "lucide-react"

/**
 * Plenty of Hearts — Workspace Initialization Banner
 * Shown when the active project is "plenty-of-hearts".
 *
 * Phase 1 (mock): Static welcome banner with placeholder status cards.
 *
 * TODO Phase 2:
 *   - Replace with real campaign metrics once POH campaign data exists
 *   - Wire TikTok status from system_connections table
 *   - Wire DB status from client_db_connections table (KPI Aggregation)
 */
export function PlentyOfHeartsBanner() {
    return (
        <div className="mb-12">
            <div className="glass-panel-strong rounded-3xl p-6 md:p-10 border border-primary/20 bg-primary/[0.02] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-20 hidden md:block">
                    <Heart className="h-32 w-32 text-primary" />
                </div>
                <div className="relative z-10 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                            Workspace Initialized
                        </span>
                    </div>
                    <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
                        Welcome to Plenty of Hearts
                    </h2>
                    <p className="text-muted-foreground text-base md:text-lg max-w-2xl mb-8 leading-relaxed">
                        We are currently architecting your custom growth dashboard. Your TikTok Creator Bridge
                        and Enterprise Database are successfully linked.
                    </p>
                    <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-stretch md:items-start">
                        <div className="glass-panel px-6 py-4 rounded-2xl border-white/5 flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-cyan-400/10 shrink-0">
                                <Music2 className="h-6 w-6 text-cyan-400" />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">TikTok Status</p>
                                <p className="text-sm font-bold text-foreground">Bridge Operational</p>
                            </div>
                        </div>
                        <div className="glass-panel px-6 py-4 rounded-2xl border-white/5 flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-emerald-500/10 shrink-0">
                                <Database className="h-6 w-6 text-emerald-500" />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Database Status</p>
                                <p className="text-sm font-bold text-foreground">Syncing Clusters</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
