"use client"

import { useState, useEffect, Suspense } from "react"
import { useParams } from "next/navigation"
import {
    Loader2
} from "lucide-react"
import { ChatInterface } from "@/features/chat/ChatInterface"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { MetricsGrid as KpiMetricsGrid } from "@/features/metrics/MetricsGrid"
import { SignalGrid as AiSignalCards } from "@/features/signals/SignalGrid"
import { createBrowserClient } from "@/lib/supabase/browser"
import { SlotProvider, useSlotContext } from "@/features/metrics/SlotContext"
import { DashboardCustomizer } from "@/features/metrics/components/DashboardCustomizer"

function DashboardContent() {
    return (
        <SlotProvider userRole="client">
            <DashboardPageContent />
        </SlotProvider>
    )
}

function DashboardPageContent() {
    const params = useParams()
    const slug = (params?.slug as string) ?? "innergcomplete"

    const { activeSlotIds } = useSlotContext()

    // User & Project State
    const [userData, setUserData] = useState<{ name: string; role: string } | null>(null)
    const [projectName, setProjectName] = useState("")
    const [isLoading, setIsLoading] = useState(true)

    const [currentTime, setCurrentTime] = useState(new Date())
    const [mounted, setMounted] = useState(false)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    useEffect(() => {
        setMounted(true)

        const fetchData = async () => {
            try {
                const supabase = createBrowserClient()

                // 1. Fetch User data
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data: profile } = await supabase
                        .from("users")
                        .select("full_name, role")
                        .eq("id", user.id)
                        .single() as any

                    if (profile) {
                        setUserData({
                            name: profile.full_name || "User",
                            role: profile.role.replace("_", " ").toUpperCase()
                        })
                    }
                }

                // 2. Fetch Project Name
                const { data: project } = await supabase
                    .from("projects")
                    .select("name")
                    .eq("slug", slug)
                    .maybeSingle() as any

                if (project) {
                    setProjectName(project.name)
                }

            } catch (err) {
                console.error("[Dashboard] Error fetching initial data:", err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()

        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [slug])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background flex flex-col lg:flex-row overflow-x-hidden w-full">
            <DashboardSidebar
                projectSlug={slug}
                isSidebarOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <main className="flex-1 flex flex-col min-h-screen bg-[#020617] relative w-full overflow-x-hidden">
                {/* Background ambient gradients */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-20 pointer-events-none animate-pulse" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] opacity-10 pointer-events-none animate-pulse" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none" />

                <DashboardHeader
                    userName={userData?.name || "User"}
                    userRole={userData?.role || "CLIENT"}
                    currentTime={currentTime}
                    mounted={mounted}
                    onMenuOpen={() => setIsSidebarOpen(true)}
                />

                {/* Content Area */}
                <div className="flex-1 p-4 md:p-8 relative z-10 max-w-7xl mx-auto w-full overflow-x-hidden">
                    {/* Welcome */}
                    <div className="mb-8 md:mb-10 text-center lg:text-left">
                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
                            Welcome Back, {userData?.name.split(" ")[0] || "User"}
                        </h1>
                        <p className="text-muted-foreground text-sm md:text-base mt-3 max-w-2xl leading-relaxed text-balance mx-auto lg:ml-0">
                            The <span className="text-foreground font-medium">{projectName || "Project"}</span> growth systems are
                            performing at optimal levels. All external bridges and retail API handshakes are
                            stable as of{" "}
                            <span className="text-foreground font-medium">
                                {mounted && currentTime.toLocaleTimeString()}
                            </span>
                            .
                        </p>
                    </div>

                    <KpiMetricsGrid projectSlug={slug} activeSlotIds={activeSlotIds} />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                        <div className="rounded-2xl border border-white/5 overflow-hidden flex flex-col min-h-0 bg-[#020617]/40 backdrop-blur-xl">
                            <ChatInterface projectSlug={slug} />
                        </div>

                        <div className="flex flex-col gap-8">
                            <AiSignalCards projectSlug={slug} />
                        </div>
                    </div>
                </div>
                <DashboardCustomizer />
            </main>
        </div>
    )
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#020617]" />}>
            <DashboardContent />
        </Suspense>
    )
}
