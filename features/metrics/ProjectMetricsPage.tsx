"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2, Activity, Target, Layout, Check, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"

// Modular Components
import { DashboardSidebar } from "@/components/layout/dashboard/sidebar"
import { DashboardHeader } from "@/components/layout/dashboard/header"
import { MetricsGrid } from "@/features/metrics/MetricsGrid"
import { SlotProvider, useSlotContext } from "@/features/metrics/SlotContext"
import { getIcon } from "@/features/metrics/utils/icon-map"
import { createBrowserClient } from "@/lib/supabase/browser"

export function ProjectMetricsPage() {
    const params = useParams()
    const [role, setRole] = useState<'client-admin' | 'client-viewer' | 'super-admin'>('client-admin')
    const [userData, setUserData] = useState<{ name: string; role: string } | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchRole = async () => {
            try {
                const supabase = createBrowserClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data: profile } = await supabase
                        .from("users")
                        .select("full_name, role")
                        .eq("id", user.id)
                        .maybeSingle() as any
                    
                    if (profile) {
                        const name = profile.full_name || "User"
                        const fetchedRole = profile.role?.replace('_', '-') || "client"
                        setRole(fetchedRole as any)
                        setUserData({ name, role: fetchedRole.toUpperCase() })
                    }
                }
            } catch (err) {
                console.error("Failed to fetch role", err)
            } finally {
                setIsLoading(false)
            }
        }
        fetchRole()
    }, [])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <SlotProvider userRole={role} projectSlug={params?.slug as string}>
            <ProjectMetricsContent initialUserData={userData} />
        </SlotProvider>
    )
}

interface ProjectMetricsContentProps {
    initialUserData: { name: string; role: string } | null
}

function ProjectMetricsContent({ initialUserData }: ProjectMetricsContentProps) {
    const params = useParams()
    const slug = (params?.slug as string) ?? "agency-global"

    const { 
        activeSlotIds, 
        availableSlots, 
        toggleSlot, 
        saveChanges, 
        isSaving, 
        isInitialLoading: isConfigLoading 
    } = useSlotContext()

    // User & Project State
    const [userData, setUserData] = useState<{ name: string; role: string } | null>(initialUserData)
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

                // 1. If no initial user data, fetch it
                if (!userData) {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (user) {
                        const { data: profile } = await supabase
                            .from("users")
                            .select("full_name, role")
                            .eq("id", user.id)
                            .maybeSingle() as any

                        const meta = user.user_metadata || {}
                        const name = profile?.full_name || meta.full_name || meta.name || meta.display_name || "User"
                        const role = profile?.role?.replace("_", " ").toUpperCase() || "CLIENT"

                        setUserData({ name, role })
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
                console.error("[ProjectMetrics] Error fetching initial data:", err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()

        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [slug])

    if (isLoading || isConfigLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground font-medium tracking-widest uppercase">Initializing Port Registry...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden relative">
            {/* Background ambient gradients */}
            <div className="absolute top-0 right-[10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none z-0" />
            <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] opacity-10 pointer-events-none z-0" />

                <DashboardHeader
                    userName={userData?.name || "User"}
                    userRole={userData?.role || "CLIENT"}
                    currentTime={currentTime}
                    mounted={mounted}
                    onMenuOpen={() => setIsSidebarOpen(true)}
                    projectName={projectName}
                />

                <div className="flex-1 overflow-y-auto p-6 md:p-10 relative z-10 w-full custom-scrollbar">
                    <div className="max-w-7xl mx-auto w-full pb-20">
                    {/* Header Section */}
                    <div className="mb-12">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
                            <div>
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
                                    Metrics <span className="text-primary font-light italic">& Intelligence</span>
                                </h1>
                                <p className="text-muted-foreground text-sm md:text-base mt-3 max-w-2xl leading-relaxed">
                                    Manage your project telemetry slots and intelligence distribution. Select which "Key Performance Ports" appear on your primary dashboard.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Live Metrics Architecture (Read-Only) */}
                    <section>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Layout className="h-4 w-4 text-primary" />
                            </div>
                            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-foreground">Active Intelligence Grid</h2>
                        </div>
                        
                        <MetricsGrid 
                            projectSlug={slug} 
                            activeSlotIds={activeSlotIds} 
                        />
                    </section>
                    </div>
                </div>
        </div>
    )
}
