"use client"

import React, { useState, useEffect, Suspense } from "react"
import { Loader2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/browser"
import { PixelSetup } from "@/features/pixel/components/PixelSetup"

function AgencyPixelPageContent() {
    // Agency global slug is often "innergcomplete" or similar
    const agencySlug = "innergcomplete"
    
    const [projectData, setProjectData] = useState<{ id: string; name: string } | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const supabase = createBrowserClient()
                
                // Fetch project details for the Agency global project
                const { data: project } = await supabase
                    .from("projects")
                    .select("id, name")
                    .eq("slug", agencySlug)
                    .maybeSingle() as any

                if (project) {
                    setProjectData({
                        id: project.id,
                        name: project.name
                    })
                } else {
                    // Fallback to a default if the project isn't found
                    setProjectData({
                        id: "agency-global-innerg",
                        name: "Inner G Agency"
                    })
                }
            } catch (err) {
                console.error("[AgencyPixelPage] Error fetching project:", err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchProject()
    }, [])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <main className="min-h-screen bg-background overflow-y-auto custom-scrollbar pb-24 lg:pb-8">
            <PixelSetup 
                projectId={projectData?.id || "agency-global-innerg"} 
                projectName={projectData?.name || "Inner G Agency"} 
                isAgency={true}
            />
        </main>
    )
}

export default function AgencyPixelPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <AgencyPixelPageContent />
        </Suspense>
    )
}
