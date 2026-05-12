"use client"

import React from "react"
import { AdminSidebarProvider } from "@/features/agency/context/AdminSidebarContext"
import { MobileNavProvider } from "@/features/agency/context/MobileNavContext"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminSidebarProvider>
            <MobileNavProvider>
                {children}
            </MobileNavProvider>
        </AdminSidebarProvider>
    )
}
