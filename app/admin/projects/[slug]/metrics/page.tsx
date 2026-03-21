"use client"

import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { ProjectSlotConfig } from "@/features/agency/components/ProjectSlotConfig"

export default function ProjectMetricsConfigPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <h2 className="text-xl font-black uppercase tracking-widest italic text-foreground mb-2">Initializing Port Configuration...</h2>
                <p className="text-muted-foreground text-sm max-w-xs">Connecting to Neural Asset Registry</p>
            </div>
        }>
            <ProjectSlotConfig />
        </Suspense>
    )
}
