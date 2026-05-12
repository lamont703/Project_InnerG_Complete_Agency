"use client"

import { useAdminSidebar } from "@/features/agency/context/AdminSidebarContext"
import { Menu, User } from "lucide-react"
import { useAgencyData } from "@/features/agency/use-agency-data"
import { useEffect, useState } from "react"

interface AdminHeaderProps {
    title: string
    subtitle?: string
}

export function AdminHeader({ title, subtitle }: AdminHeaderProps) {
    const { setIsSidebarOpen } = useAdminSidebar()
    const { userData } = useAgencyData()
    const [currentTime, setCurrentTime] = useState(new Date())
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    return (
        <header className="sticky top-0 z-50 h-24 flex items-center justify-between px-4 md:px-10 glass-panel-strong border-b border-border backdrop-blur-2xl">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="lg:hidden h-12 w-12 flex items-center justify-center rounded-xl glass-panel text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Open navigation menu"
                >
                    <Menu className="h-6 w-6" />
                </button>
                <div>
                    <h1 className="text-lg font-black uppercase tracking-[0.2em] text-foreground leading-none">{title}</h1>
                    {subtitle && (
                        <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-widest font-bold hidden sm:block">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3 md:gap-8">
                <div className="hidden sm:flex flex-col items-end pl-6 border-l border-border">
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest leading-none">
                        {mounted && currentTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                    <p className="text-[10px] font-bold text-primary/80 uppercase tracking-widest mt-1.5 leading-none text-right">
                        {mounted && currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                
                <div className="flex items-center gap-3 md:gap-4 pl-3 md:pl-6 border-l border-border">
                    <div className="hidden md:block text-right">
                        <p className="text-sm font-bold text-foreground leading-none">{userData?.name}</p>
                        <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em] mt-1.5 opacity-80">{userData?.role || "SUPER ADMIN"}</p>
                    </div>
                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-accent p-[1px] shadow-lg shadow-primary/10 transition-transform hover:scale-105 cursor-pointer">
                        <div className="h-full w-full rounded-[14px] bg-background flex items-center justify-center overflow-hidden">
                            <span className="text-sm font-black text-foreground">{userData?.name?.charAt(0) || "A"}</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}
