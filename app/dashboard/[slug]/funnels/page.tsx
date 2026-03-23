"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2, TrendingUp, Target, Filter, Sparkles } from "lucide-react"
import { DashboardHeader } from "@/components/layout/dashboard/header"
import { OmniChannelStream } from "@/features/funnels/components/OmniChannelStream"
import { createBrowserClient } from "@/lib/supabase/browser"

export default function ClientFunnelPage() {
    const params = useParams()
    const slug = (params?.slug as string) ?? "agency-global"
    
    // User & Project State
    const [userData, setUserData] = useState<{ name: string; role: string } | null>(null)
    const [projectName, setProjectName] = useState("")
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

                const { data: project } = await supabase
                    .from("projects")
                    .select("name")
                    .eq("slug", slug)
                    .maybeSingle() as any

                if (project) {
                    setProjectName(project.name)
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

                    {/* Analysis Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { title: "Awareness Velocity", value: "+12.4%", status: "STABLE", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                            { title: "Engagement Depth", value: "74.1%", status: "ACTIVE", icon: Sparkles, color: "text-blue-400", bg: "bg-blue-500/10" },
                            { title: "Conversion Accuracy", value: "98.2%", status: "HIGH", icon: Target, color: "text-violet-400", bg: "bg-violet-500/10" }
                        ].map((stat: any) => (
                            <div key={stat.title} className="p-8 rounded-[2.5rem] border border-white/5 bg-white/5 backdrop-blur-md group hover:border-emerald-500/30 transition-all duration-500">
                                <div className="flex items-center justify-between mb-6">
                                    <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                                        <stat.icon className="h-5 w-5" />
                                    </div>
                                    <span className={`text-[10px] font-black px-3 py-1 rounded-full ${stat.bg} ${stat.color} tracking-widest`}>{stat.status}</span>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2 group-hover:text-white/80 transition-colors">{stat.title}</p>
                                <p className="text-3xl font-black text-white">{stat.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    )
}
