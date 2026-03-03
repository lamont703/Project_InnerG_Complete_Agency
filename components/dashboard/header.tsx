"use client"

import { Bell, User, Menu } from "lucide-react"

interface DashboardHeaderProps {
    userName: string
    userRole: string
    currentTime: Date
    mounted: boolean
    onMenuOpen: () => void
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
}: DashboardHeaderProps) {
    return (
        <header className="flex h-20 items-center justify-between px-4 md:px-8 border-b border-white/5 relative z-10 bg-[#020617]/50 backdrop-blur-md sticky top-0 lg:static">
            <div className="flex items-center gap-4">
                <button
                    id="btn-open-sidebar"
                    onClick={onMenuOpen}
                    className="lg:hidden h-10 w-10 flex items-center justify-center rounded-xl glass-panel text-muted-foreground"
                    aria-label="Open navigation menu"
                >
                    <Menu className="h-5 w-5" />
                </button>
                <div className="hidden md:block">
                    <h2 className="text-sm font-medium text-muted-foreground">
                        {mounted &&
                            currentTime.toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                            })}
                    </h2>
                </div>
                <div className="md:hidden">
                    <span className="text-lg font-bold tracking-tight text-foreground">Inner G</span>
                </div>
            </div>

            <div className="flex items-center gap-3 md:gap-6">
                {/* Notification Bell — TODO Phase 2: wire to unresolved signal count */}
                <button
                    id="btn-notifications"
                    className="relative h-9 w-9 md:h-10 md:w-10 rounded-full glass-panel flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Notifications"
                >
                    <Bell className="h-4 w-4 md:h-5 md:w-5" />
                    {/* Red dot — hidden until real notification count exists */}
                    <span className="absolute top-2 right-2.5 h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-primary border-2 border-background" />
                </button>

                <div className="flex items-center gap-2 md:gap-3 pl-3 md:pl-6 border-l border-white/10">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-foreground leading-none">{userName}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{userRole}</p>
                    </div>
                    <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                        <User className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                </div>
            </div>
        </header>
    )
}
