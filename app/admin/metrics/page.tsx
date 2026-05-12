"use client"

import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { AgencyMetricsPage } from "@/features/agency/AgencyMetricsPage"

export default function MetricsAdminPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <AgencyMetricsPage />
        </Suspense>
    )
}
