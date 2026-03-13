"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { usePathname, useRouter, useParams } from "next/navigation"

export type MobileTab = "chat" | "signals"

interface MobileNavContextType {
    activeTab: MobileTab
    setActiveTab: (tab: MobileTab) => void
}

const MobileNavContext = createContext<MobileNavContextType | undefined>(undefined)

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const params = useParams()
    const [activeTab, setActiveTabState] = useState<MobileTab>("chat")

    const setActiveTab = (tab: MobileTab) => {
        setActiveTabState(tab)
        
        // If we are not on a dashboard page, navigate to one
        const isAgencyDashboard = pathname?.includes("/dashboard/innergcomplete")
        const isClientDashboard = pathname?.startsWith("/dashboard/") && !isAgencyDashboard
        
        if (!isAgencyDashboard && !isClientDashboard) {
            // Default to agency dashboard for admins, or try to find a slug?
            // For now, let's just navigate to the agency dashboard as a safe bet for admins
            router.push(`/dashboard/innergcomplete?tab=${tab}`)
        }
    }

    // Sync tab from URL if present
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search)
        const tab = searchParams.get("tab") as MobileTab
        if (tab && (tab === "chat" || tab === "signals")) {
            setActiveTabState(tab)
        }
    }, [pathname])

    return (
        <MobileNavContext.Provider value={{ activeTab, setActiveTab }}>
            {children}
        </MobileNavContext.Provider>
    )
}

export function useMobileNav() {
    const context = useContext(MobileNavContext)
    if (context === undefined) {
        throw new Error("useMobileNav must be used within a MobileNavProvider")
    }
    return context
}
