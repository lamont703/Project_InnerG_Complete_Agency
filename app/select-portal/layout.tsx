"use client"

import React from "react"
import { AdminSidebarProvider, useAdminSidebar } from "@/features/agency/context/AdminSidebarContext"
import { MobileNavProvider, useMobileNav } from "@/features/agency/context/MobileNavContext"
import { DashboardMobileNav } from "@/components/dashboard/MobileNav"
import { AgencySidebar } from "@/features/agency/components/AgencySidebar"

function SelectPortalLayoutContent({ children }: { children: React.ReactNode }) {
    const { isSidebarOpen, setIsSidebarOpen, toggleSidebar } = useAdminSidebar()
    const { activeTab, setActiveTab } = useMobileNav()

    return (
        <div className="min-h-screen bg-background flex flex-col lg:flex-row overflow-x-hidden w-full text-foreground">
            <AgencySidebar
                isSidebarOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
            <main className="flex-1 flex flex-col h-screen bg-background relative w-full selection:bg-primary/30 overflow-hidden">
                <div className="flex-1 flex flex-col overflow-y-auto lg:pb-0">
                    {children}
                </div>
                <DashboardMobileNav 
                    activeTab={activeTab} 
                    onTabChange={setActiveTab} 
                    onOpenSidebar={toggleSidebar}
                    className="fixed bottom-0 z-[101]"
                />
            </main>
        </div>
    )
}

export default function SelectPortalLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminSidebarProvider>
            <MobileNavProvider>
                <SelectPortalLayoutContent>
                    {children}
                </SelectPortalLayoutContent>
            </MobileNavProvider>
        </AdminSidebarProvider>
    )
}
