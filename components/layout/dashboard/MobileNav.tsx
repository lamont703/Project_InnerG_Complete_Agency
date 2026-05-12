"use client"

import React from "react"
import { BarChart3, MessageSquare, Zap } from "lucide-react"

export type MobileTab = "chat" | "signals"

interface DashboardMobileNavProps {
    activeTab: MobileTab
    onTabChange: (tab: MobileTab) => void
    onOpenSidebar: () => void
    className?: string
    projectType?: string
}

export function DashboardMobileNav({ activeTab, onTabChange, onOpenSidebar, className = "", projectType }: DashboardMobileNavProps) {
    const isEducational = ['barber_student', 'barber_instructor', 'barber_school_owner'].includes(projectType?.toLowerCase() || '')
    const chatLabel = isEducational ? "Prep Hub" : "Chat"

    return (
        <div className={`lg:hidden fixed bottom-4 left-[20%] right-[20%] z-[100] h-10 glass-panel-strong border border-border rounded-full px-2 flex items-center justify-around pb-0 ${className} shadow-2xl`}>
            <button
                onClick={onOpenSidebar}
                className="flex flex-col items-center gap-0 text-muted-foreground/60 active:text-primary transition-all duration-300"
            >
                <div className="p-0.5 rounded-lg bg-transparent">
                    <BarChart3 className="h-3 w-3" />
                </div>
                <span className="text-[6px] font-black uppercase tracking-[0.2em] leading-none">Metrics</span>
            </button>

            <button
                onClick={() => onTabChange("chat")}
                className={`flex flex-col items-center gap-0 transition-all duration-300 ${
                    activeTab === "chat" ? "text-primary scale-110" : "text-muted-foreground/60"
                }`}
            >
                <div className={`p-0.5 rounded-lg transition-colors ${
                    activeTab === "chat" ? "bg-primary/10" : "bg-transparent"
                }`}>
                    <MessageSquare className="h-3 w-3" />
                </div>
                <span className="text-[6px] font-black uppercase tracking-[0.2em] leading-none">{chatLabel}</span>
            </button>

            <button
                onClick={() => onTabChange("signals")}
                className={`flex flex-col items-center gap-0 transition-all duration-300 ${
                    activeTab === "signals" ? "text-primary scale-110" : "text-muted-foreground/60"
                }`}
            >
                <div className={`p-0.5 rounded-lg transition-colors ${
                    activeTab === "signals" ? "bg-primary/10" : "bg-transparent"
                }`}>
                    <Zap className="h-3 w-3" />
                </div>
                <span className="text-[6px] font-black uppercase tracking-[0.2em] leading-none">Signals</span>
            </button>
        </div>
    )
}
