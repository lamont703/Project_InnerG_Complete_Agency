"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2, TrendingUp, Target, Filter, Sparkles } from "lucide-react"
import { DashboardHeader } from "@/components/layout/dashboard/header"
import { OmniChannelStream } from "@/features/funnels/components/OmniChannelStream"
import { FunnelHourlyMetrics } from "@/features/funnels/components/FunnelHourlyMetrics"
import { createBrowserClient } from "@/lib/supabase/browser"

export default function ClientFunnelPage() {
    const params = useParams()
    const slug = (params?.slug as string) ?? "agency-global"
    
    // User & Project State
    const [userData, setUserData] = useState<{ name: string; role: string } | null>(null)
    const [projectName, setProjectName] = useState("")
    const [funnelEnabled, setFunnelEnabled] = useState(true)
    const [isLoading, setIsLoading] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const fetchData = async () => {
            try {
                const supabase = createBrowserClient()
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

                const { data: project } = await (supabase
                    .from("projects") as any)
                    .select("name, funnel_enabled")
                    .eq("slug", slug)
                    .maybeSingle()

                if (project) {
                    setProjectName(project.name)
                    setFunnelEnabled(project.funnel_enabled ?? true)
                }
            } catch (err) {
                console.error("[FunnelPage] Error fetching data:", err)
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

    if (!funnelEnabled) {
        return (
            <div className="flex-1 flex flex-col min-h-0 relative h-full overflow-hidden">
                <DashboardHeader
                    userName={userData?.name || "User"}
                    userRole={userData?.role || "CLIENT"}
                    currentTime={currentTime}
                    mounted={mounted}
                    onMenuOpen={() => {}}
                    projectName={projectName}
                />
                <main className="flex-1 flex items-center justify-center p-6 text-center">
                    <div className="max-w-md space-y-6">
                        <div className="h-20 w-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
                            <Filter className="h-10 w-10 text-amber-500 opacity-50" />
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-widest italic text-foreground">Blueprint Masked</h2>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            The requested Funnel Architecture has been deactivated for this instance. 
                            Contact your <span className="text-primary font-bold italic">Inner G Agent</span> to provision these insights.
                        </p>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 relative h-full overflow-hidden">
            {/* Background ambient gradients */}
            <div className="absolute top-0 right-[10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none z-0" />
            <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] opacity-10 pointer-events-none z-0" />

            <DashboardHeader
                userName={userData?.name || "User"}
                userRole={userData?.role || "CLIENT"}
                currentTime={currentTime}
                mounted={mounted}
                onMenuOpen={() => {}} // Handle separately if needed
                projectName={projectName}
            />

            <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10 w-full px-6 py-10">
                <div className="max-w-7xl mx-auto space-y-12">
                    {/* Hero Section */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/5">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500 italic">Conversion Intelligence</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
                                Revenue <span className="text-emerald-500 font-light italic">& Funnels</span>
                            </h1>
                            <p className="text-muted-foreground text-sm md:text-base max-w-2xl leading-relaxed font-medium">
                                Track the pulse of your marketing ecosystem. From global reach to high-value revenue actions, visualize your growth in real-time.
                            </p>
                        </div>
                    </div>

                    {/* Funnel Display */}
                    <OmniChannelStream 
                        projectSlug={slug} 
                        title="Project Conversion Stream" 
                        showMetricsGrid={true}
                    />

                    {/* Funnel Hoverly Metrics */}
                    <FunnelHourlyMetrics projectSlug={slug} />
                </div>
            </main>
        </div>
    )
}
