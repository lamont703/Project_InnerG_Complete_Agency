"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/browser"
import { PixelSetup } from "@/features/pixel/components/PixelSetup"

function PixelPageContent() {
    const params = useParams()
    const slug = (params?.slug as string) ?? "agency-global"
    
    const [projectData, setProjectData] = useState<{ id: string; name: string } | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const supabase = createBrowserClient()
                
                // Fetch project details by slug
                const { data: project, error } = await supabase
                    .from("projects")
                    .select("id, name")
                    .eq("slug", slug)
                    .maybeSingle() as any

                if (project) {
                    setProjectData({
                        id: project.id,
                        name: project.name
                    })
                }
            } catch (err) {
                console.error("[PixelPage] Error fetching project:", err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchProject()
    }, [slug])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!projectData) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-8 text-center">
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Project Not Found</h2>
                    <p className="text-muted-foreground">Unable to find project data for tracking setup.</p>
                </div>
            </div>
        )
    }

    return (
        <main className="min-h-screen bg-background overflow-y-auto custom-scrollbar pb-24 lg:pb-8">
            <PixelSetup 
                projectId={projectData.id} 
                projectName={projectData.name} 
            />
        </main>
    )
}

export default function PixelPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <PixelPageContent />
        </Suspense>
    )
}
