"use client"

import { Button } from "@/components/ui/button"
import { RefreshCw, LayoutDashboard } from "lucide-react"

interface AgencyHeaderProps {
    userData: { name: string; role: string } | null
    currentTime: Date
    mounted: boolean
    isSyncing: boolean
    onSyncGHL: () => void
    onSyncGithub: () => void
    onMenuOpen: () => void
}

export function AgencyHeader({
    userData,
    currentTime,
    mounted,
    isSyncing,
    onSyncGHL,
    onSyncGithub,
    onMenuOpen
}: AgencyHeaderProps) {
    return (
        <header className="sticky top-0 z-[100] h-16 flex items-center justify-between px-6 border-b border-white/10 bg-[#020617]/80 backdrop-blur-xl">
            {/* Left side: Navigation / Breadcrumbs */}
            <div className="flex items-center gap-6">
                <button
                    onClick={onMenuOpen}
                    className="lg:hidden h-10 w-10 rounded-lg glass-panel flex items-center justify-center hover:bg-white/5 transition-colors"
                >
                    <LayoutDashboard className="h-5 w-5 text-primary" />
                </button>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse" />
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">Aura Dash</h2>
                    </div>
                </div>
            </div>

            {/* Right side: Global Actions & Profile */}
            <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                <div className="hidden lg:flex items-center gap-6">
                    <span className="flex items-center gap-2">
                        {mounted && currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="h-4 w-px bg-white/5" />
                    
                    <button 
                        onClick={onSyncGHL}
                        disabled={isSyncing}
                        className="hover:text-primary transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
                        GHL
                    </button>

                    <button 
                        onClick={onSyncGithub}
                        disabled={isSyncing}
                        className="hover:text-primary transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
                        Github
                    </button>

                    <div className="h-4 w-px bg-white/5" />

                    <div className="flex items-center gap-2 text-emerald-500/60">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Aura Live
                    </div>
                </div>

                {/* Profile Widget */}
                <div className="flex items-center gap-3 pl-6 border-l border-white/10 h-8">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary via-primary/80 to-accent p-[1px] shadow-lg shadow-primary/10 cursor-pointer">
                        <div className="h-full w-full rounded-[7px] bg-[#020617] flex items-center justify-center overflow-hidden">
                            <span className="text-[10px] font-black text-white">{userData?.name?.charAt(0) || "A"}</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}
