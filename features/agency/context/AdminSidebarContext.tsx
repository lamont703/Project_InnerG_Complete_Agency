"use client"

import React, { createContext, useContext, useState } from "react"

interface AdminSidebarContextType {
    isSidebarOpen: boolean
    setIsSidebarOpen: (open: boolean) => void
    toggleSidebar: () => void
}

const AdminSidebarContext = createContext<AdminSidebarContextType | undefined>(undefined)

export function AdminSidebarProvider({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    const toggleSidebar = () => setIsSidebarOpen(prev => !prev)

    return (
        <AdminSidebarContext.Provider value={{ isSidebarOpen, setIsSidebarOpen, toggleSidebar }}>
            {children}
        </AdminSidebarContext.Provider>
    )
}

export function useAdminSidebar() {
    const context = useContext(AdminSidebarContext)
    if (context === undefined) {
        throw new Error("useAdminSidebar must be used within an AdminSidebarProvider")
    }
    return context
}
