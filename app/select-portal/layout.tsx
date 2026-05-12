"use client"

import React from "react"

export default function SelectPortalLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background flex flex-col overflow-x-hidden w-full text-foreground font-sans selection:bg-primary/30">
            <main className="flex-1 flex flex-col w-full relative">
                {children}
            </main>
        </div>
    )
}
