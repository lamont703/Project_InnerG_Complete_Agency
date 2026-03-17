"use client"

import { LayoutDashboard } from "lucide-react"

interface DashboardHeaderProps {
    userName: string
    userRole: string
    currentTime: Date
    mounted: boolean
    onMenuOpen: () => void
    projectName?: string
}

/**
 * Dashboard Top Header Bar.
 * Contains: mobile menu button, date/time display, notification bell, user avatar.
 *
 * TODO Phase 2:
 *  - Bell icon: wire to unresolved ai_signals count from Supabase (Realtime subscription)
 *  - User info: pull from Supabase auth session (user.user_metadata.full_name, users.role)
 */
export function DashboardHeader({
    userName,
    userRole,
    currentTime,
    mounted,
    onMenuOpen,
    projectName
}: DashboardHeaderProps) {
    return (
        <header className="sticky top-0 z-50 h-24 flex items-center justify-between px-4 md:px-10 glass-panel-strong border-b border-border backdrop-blur-2xl">
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
                        <h2 className="text-lg font-black uppercase tracking-[0.2em] text-foreground">
                            {projectName || "Command Center"}
                        </h2>
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground/60 mt-1 uppercase tracking-widest">
                        {mounted && currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </p>
                </div>
            </div>

            {/* Right side: Profile Widget */}
            <div className="flex items-center gap-3 md:gap-8">
                <div className="flex items-center gap-3 md:gap-4 pl-3 md:pl-6 border-l border-border">
                    <div className="hidden md:block text-right">
                        <p className="text-sm font-bold text-foreground leading-none">{userName}</p>
                        <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em] mt-1.5 opacity-80">{userRole}</p>
                    </div>
                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-accent p-[1px] shadow-lg shadow-primary/10 transition-transform hover:scale-105 cursor-pointer">
                        <div className="h-full w-full rounded-[14px] bg-background flex items-center justify-center overflow-hidden">
                            <span className="text-sm font-black text-foreground">{userName?.charAt(0) || "U"}</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}
