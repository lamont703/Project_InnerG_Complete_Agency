"use client"

import React from "react"

function SelectPortalLayoutContent({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background flex flex-col w-full text-foreground">
            <main className="flex-1 flex flex-col min-h-screen bg-background relative w-full selection:bg-primary/30">
                {children}
            </main>
        </div>
    )
}

export default function SelectPortalLayout({ children }: { children: React.ReactNode }) {
    return (
        <SelectPortalLayoutContent>
            {children}
        </SelectPortalLayoutContent>
    )
}
