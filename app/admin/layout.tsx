"use client"

import React from "react"
import { AdminSidebarProvider, useAdminSidebar } from "@/features/agency/context/AdminSidebarContext"
import { AgencySidebar } from "@/features/agency/components/AgencySidebar"

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const { isSidebarOpen, setIsSidebarOpen } = useAdminSidebar()

    return (
        <div className="min-h-screen bg-background flex flex-col lg:flex-row overflow-x-hidden w-full text-foreground">
            <AgencySidebar
                isSidebarOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
            <main className="flex-1 flex flex-col min-h-screen bg-background relative w-full selection:bg-primary/30 overflow-x-hidden">
                {children}
            </main>
        </div>
    )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminSidebarProvider>
            <AdminLayoutContent>
                {children}
            </AdminLayoutContent>
        </AdminSidebarProvider>
    )
}
