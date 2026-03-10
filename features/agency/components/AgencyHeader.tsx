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
        <header className="sticky top-0 z-50 h-20 flex items-center justify-between px-6 md:px-8 glass-panel border-b border-white/5 bg-[#020617]/50 backdrop-blur-md">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuOpen}
                    className="lg:hidden h-10 w-10 rounded-lg glass-panel flex items-center justify-center"
                >
                    <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
                </button>
                <div>
                    <p className="text-sm font-medium text-foreground">Agency Command Center</p>
                    <p className="text-xs text-muted-foreground">
                        {mounted && currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={isSyncing}
                        onClick={onSyncGHL}
                        className="h-8 gap-2 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 transition-all"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                        {isSyncing ? "Syncing GHL..." : "Sync GHL"}
                    </Button>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-medium text-primary">Systems Online</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm">
                        {userData?.name?.charAt(0) || "A"}
                    </div>
                    <div className="hidden md:block">
                        <p className="text-sm font-medium text-foreground">{userData?.name}</p>
                        <p className="text-[10px] text-primary font-bold uppercase tracking-widest">{userData?.role}</p>
                    </div>
                </div>
            </div>
        </header>
    )
}
