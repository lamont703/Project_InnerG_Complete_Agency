"use client"

import { Button } from "@/components/ui/button"
import { RefreshCw, LayoutDashboard } from "lucide-react"

interface AgencyHeaderProps {
    userData: { name: string; role: string } | null
    currentTime: Date
    mounted: boolean
    isSyncing: boolean
    onSyncGHL: () => void
    onMenuOpen: () => void
}

export function AgencyHeader({
    userData,
    currentTime,
    mounted,
    isSyncing,
    onSyncGHL,
    onMenuOpen
}: AgencyHeaderProps) {
    return (
        <header className="sticky top-0 z-50 h-24 flex items-center justify-between px-4 md:px-10 glass-panel-strong border-b border-white/[0.05] bg-[#020617]/40 backdrop-blur-2xl">
            {/* Left side: Navigation / Breadcrumbs */}
            <div className="flex items-center gap-3 md:gap-6">
                <button
                    onClick={onMenuOpen}
                    className="lg:hidden h-12 w-12 rounded-xl glass-panel flex items-center justify-center hover:bg-white/5 transition-colors"
                >
                    <LayoutDashboard className="h-6 w-6 text-primary" />
                </button>
                <div>
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse" />
                        <h2 className="text-lg font-black uppercase tracking-[0.2em] text-foreground">Command Center</h2>
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground/60 mt-1 uppercase tracking-widest">
                        {mounted && currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </p>
                </div>
            </div>

            {/* Right side: Global Actions & Profile */}
            <div className="flex items-center gap-3 md:gap-8">
                <div className="hidden lg:flex items-center gap-6">
                    {/* GHL Sync Control */}
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={isSyncing}
                        onClick={onSyncGHL}
                        className="h-10 px-5 gap-3 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/40 transition-all rounded-xl shadow-lg shadow-primary/5 group"
                    >
                        <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} />
                        <span className="text-[11px] font-black uppercase tracking-widest">
                            {isSyncing ? "Force Syncing..." : "Global GHL Sync"}
                        </span>
                    </Button>

                    <div className="h-10 w-px bg-white/5 mx-2" />

                    {/* Meta Status */}
                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                        <div className="relative">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping absolute" />
                            <div className="h-2 w-2 rounded-full bg-emerald-500 relative" />
                        </div>
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Aura Systems active</span>
                    </div>
                </div>

                {/* Profile Widget */}
                <div className="flex items-center gap-3 md:gap-4 pl-3 md:pl-6 border-l border-white/5">
                    <div className="hidden md:block text-right">
                        <p className="text-sm font-bold text-foreground leading-none">{userData?.name}</p>
                        <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em] mt-1.5 opacity-80">{userData?.role}</p>
                    </div>
                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-accent p-[1px] shadow-lg shadow-primary/10 transition-transform hover:scale-105 cursor-pointer">
                        <div className="h-full w-full rounded-[14px] bg-[#020617] flex items-center justify-center overflow-hidden">
                            <span className="text-sm font-black text-white">{userData?.name?.charAt(0) || "A"}</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}
