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
    const isStudent = projectType?.toLowerCase() === 'barber_student'
    const chatLabel = isStudent ? "Prep Hub" : "Chat"

    return (
        <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-[100] h-20 glass-panel-strong border-t border-border px-6 flex items-center justify-around pb-safe ${className}`}>
            <button
                onClick={onOpenSidebar}
                className="flex flex-col items-center gap-1 text-muted-foreground/60 active:text-primary transition-all duration-300"
            >
                <div className="p-2 rounded-xl bg-transparent">
                    <BarChart3 className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Metrics</span>
            </button>

            <button
                onClick={() => onTabChange("chat")}
                className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                    activeTab === "chat" ? "text-primary scale-110" : "text-muted-foreground/60"
                }`}
            >
                <div className={`p-2 rounded-xl transition-colors ${
                    activeTab === "chat" ? "bg-primary/10" : "bg-transparent"
                }`}>
                    <MessageSquare className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">{chatLabel}</span>
            </button>

            <button
                onClick={() => onTabChange("signals")}
                className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                    activeTab === "signals" ? "text-primary scale-110" : "text-muted-foreground/60"
                }`}
            >
                <div className={`p-2 rounded-xl transition-colors ${
                    activeTab === "signals" ? "bg-primary/10" : "bg-transparent"
                }`}>
                    <Zap className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Signals</span>
            </button>
        </div>
    )
}
