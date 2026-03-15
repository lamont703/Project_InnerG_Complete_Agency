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
    const [role, setRole] = useState<'client' | 'admin' | 'super-admin'>('client')
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
        <SlotProvider userRole={role}>
            <ProjectMetricsContent initialUserData={userData} />
        </SlotProvider>
    )
}

interface ProjectMetricsContentProps {
    initialUserData: { name: string; role: string } | null
}

function ProjectMetricsContent({ initialUserData }: ProjectMetricsContentProps) {
    const params = useParams()
    const slug = (params?.slug as string) ?? "innergcomplete"

    const { activeSlotIds, availableSlots, toggleSlot } = useSlotContext()

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

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

                    {/* Preview Section */}
                    <section className="mb-16">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Layout className="h-4 w-4 text-primary" />
                            </div>
                            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-foreground">Live Preview (Primary Grid)</h2>
                        </div>
                        
                        <MetricsGrid 
                            projectSlug={slug} 
                            activeSlotIds={activeSlotIds} 
                        />
                    </section>

                    {/* Slot Registry Management */}
                    <section>
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20">
                                    <Target className="h-4 w-4 text-accent" />
                                </div>
                                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-foreground">Slot Registry & Port Configuration</h2>
                            </div>
                            <div className="px-4 py-1.5 rounded-full bg-muted/10 border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                {activeSlotIds.length} / {availableSlots.length} Active
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {availableSlots.map(slot => {
                                const isActive = activeSlotIds.includes(slot.id)
                                const Icon = getIcon(slot.iconName)

                                return (
                                    <div
                                        key={slot.id}
                                        onClick={() => toggleSlot(slot.id)}
                                        className={`group p-6 rounded-3xl border transition-all duration-500 cursor-pointer relative overflow-hidden h-full flex flex-col ${isActive
                                            ? 'bg-primary/5 border-primary/30 shadow-[0_0_40px_rgba(var(--primary),0.05)]'
                                            : 'bg-muted/5 border-border hover:border-primary/20'
                                            }`}
                                    >
                                        <div className="flex items-start gap-5 mb-6">
                                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border transition-all duration-500 ${isActive ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-110' : 'bg-white/5 text-muted-foreground border-white/10'
                                                }`}>
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-base font-bold tracking-tight ${isActive ? 'text-foreground' : 'text-muted-foreground transition-colors group-hover:text-foreground'}`}>
                                                        {slot.label}
                                                    </span>
                                                    {isActive ? (
                                                        <div className="h-6 w-6 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/40 animate-in zoom-in duration-300">
                                                            <Check className="h-3 w-3 text-primary" />
                                                        </div>
                                                    ) : (
                                                        <EyeOff className="h-4 w-4 text-muted-foreground/20 group-hover:text-muted-foreground transition-colors" />
                                                    )}
                                                </div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mt-1">{slot.category}</p>
                                            </div>
                                        </div>
                                        
                                        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                                            {slot.description}
                                        </p>

                                        <div className="mt-8 pt-6 border-t border-border/20 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-muted'}`} />
                                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/40">{isActive ? 'Broadcasting' : 'Standby'}</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-muted-foreground/20 italic">ID: {slot.id}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>

                    {/* Footer / Info */}
                    <div className="mt-20 p-8 rounded-3xl bg-muted/5 border border-border border-dashed flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <Activity className="h-10 w-10 text-primary/20" />
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-primary">Project Sync Protocol</p>
                                <p className="text-sm text-muted-foreground mt-1 max-w-md">Your configuration affects how the AI prioritizes signal generation and real-time alerts for this project.</p>
                            </div>
                        </div>
                        <Button className="h-12 px-10 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-primary/20 border-b-2 border-black/20">
                            Apply Changes
                        </Button>
                    </div>
                    </div>
                </div>
        </div>
    )
}
