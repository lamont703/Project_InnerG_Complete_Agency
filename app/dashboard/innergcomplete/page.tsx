"use client"

import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { AgencyDashboardInterface } from "@/features/agency/AgencyDashboardInterface"

/**
 * Agency Dashboard Entry Point
 * Uses the Modular Feature Architecture 'Strangler Pattern'.
 * The main logic is encapsulated in the Agency feature folder.
 */
export default function AgencyDashboardPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <AgencyDashboardInterface />
        </Suspense>
    )
}
