"use client"

import React from "react"
import { useParams } from "next/navigation"
import { AdminSidebarProvider, useAdminSidebar } from "@/features/agency/context/AdminSidebarContext"
import { MobileNavProvider, useMobileNav } from "@/features/agency/context/MobileNavContext"
import { DashboardMobileNav } from "@/components/layout/dashboard/MobileNav"
import { DashboardSidebar } from "@/components/layout/dashboard/sidebar"
import { AgencySidebar } from "@/features/agency/components/AgencySidebar"
import { createBrowserClient } from "@/lib/supabase/browser"
import { useState, useEffect } from "react"

function ClientDashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const params = useParams()
    const slug = (params?.slug as string) ?? "agency-global"
    const { isSidebarOpen, setIsSidebarOpen, toggleSidebar } = useAdminSidebar()
    const { activeTab, setActiveTab } = useMobileNav()

    const isAgencyPortal = slug === "innergcomplete"
    const [projectType, setProjectType] = useState<string>("general")

    useEffect(() => {
        if (!isAgencyPortal) {
            const supabase = createBrowserClient()
            supabase.from("projects").select("type").eq("slug", slug).maybeSingle()
                .then(({ data }: { data: any }) => {
                    if (data?.type) setProjectType(data.type)
                })
        }
    }, [slug, isAgencyPortal])

    return (
        <div className="min-h-screen bg-background flex flex-col lg:flex-row overflow-x-hidden w-full text-foreground text-foreground">
            {isAgencyPortal ? (
                <AgencySidebar
                    isSidebarOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />
            ) : (
                <DashboardSidebar
                    projectSlug={slug}
                    isSidebarOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />
            )}
            <main className="flex-1 flex flex-col h-screen bg-background relative w-full selection:bg-primary/30 overflow-hidden">
                <div className="flex-1 flex flex-col min-h-0">
                    {children}
                </div>
                <DashboardMobileNav 
                    activeTab={activeTab} 
                    onTabChange={setActiveTab} 
                    onOpenSidebar={toggleSidebar}
                    className="fixed bottom-0 z-[101]"
                    projectType={projectType}
                />
            </main>
        </div>
    )
}

export default function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminSidebarProvider>
            <MobileNavProvider>
                <ClientDashboardLayoutContent>
                    {children}
                </ClientDashboardLayoutContent>
            </MobileNavProvider>
        </AdminSidebarProvider>
    )
}
