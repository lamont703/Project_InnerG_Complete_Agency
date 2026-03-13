"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    ArrowRight,
    BookOpen,
    Layout,
    ChevronRight,
    Search,
    Filter,
    PlusCircle,
    Building2,
    Calendar,
    Users,
    Heart,
    Music2,
    Loader2,
    AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createBrowserClient } from "@/lib/supabase/browser"
import type { PortalCard } from "@/types"
import { cn } from "@/lib/utils"

// Map project types to icons
const ICON_MAP: Record<string, any> = {
    ecommerce: BookOpen,
    retail: BookOpen,
    community: Heart,
    dating: Heart,
    social: Music2,
    general: Layout,
}

export default function SelectPortalPage() {
    const [searchQuery, setSearchQuery] = useState("")
    const [projects, setProjects] = useState<PortalCard[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [userData, setUserData] = useState<{ name: string; role: string } | null>(null)
    const router = useRouter()

    useEffect(() => {
        const fetchData = async () => {
            try {
                const supabase = createBrowserClient()

                // 1. Fetch User Data for Header
                const { data: { user } } = await supabase.auth.getUser()
                let currentUserRole = ""

                if (user) {
                    const { data: profile } = await supabase
                        .from("users")
                        .select("full_name, role")
                        .eq("id", user.id)
                        .single() as any

                    if (profile) {
                        currentUserRole = profile.role
                        setUserData({
                            name: profile.full_name || "User",
                            role: profile.role.replace("_", " ").toUpperCase()
                        })
                    }
                }

                // 2. Fetch Projects (Joined with Clients)
                let query = supabase
                    .from("projects")
                    .select(`
                        id,
                        name,
                        slug,
                        type,
                        status,
                        active_campaign_name,
                        clients (
                            name
                        )
                    `)

                // Super admins and developers see all projects, others see non-archived ones
                if (currentUserRole !== "super_admin" && currentUserRole !== "developer") {
                    query = query.neq("status", "archived")
                }

                const { data: projectData, error: projectError } = await query as any

                if (projectError) throw projectError

                // 3. Map to PortalCard interface
                const mappedProjects: PortalCard[] = projectData.map((p: any) => ({
                    id: p.slug,
                    name: `Project ${p.name}`,
                    client: p.clients?.name || "Unknown Client",
                    status: p.status.charAt(0).toUpperCase() + p.status.slice(1),
                    type: p.type.charAt(0).toUpperCase() + p.type.slice(1),
                    campaign: p.active_campaign_name || "N/A",
                    lastActivity: "Live Now", // Placeholder until activity_log wiring
                    metrics: "Data Streaming", // Placeholder until snapshot wiring
                    icon: ICON_MAP[p.type.toLowerCase()] || Layout,
                    href: `/dashboard/${p.slug}`,
                }))

                setProjects(mappedProjects)
            } catch (err: any) {
                console.error("[SelectPortal] Error:", err)
                setError("Unable to load client portals. Please try again.")
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [])

    const handleSignOut = async () => {
        try {
            const supabase = createBrowserClient()
            await supabase.auth.signOut()
            router.push("/login")
            router.refresh()
        } catch (error) {
            console.error("Error signing out:", error)
        }
    }

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.client.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (isLoading) {
        return (
            <main className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Initializing growth architectures...</p>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-background text-foreground relative w-full overflow-x-hidden">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[160px] opacity-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[140px] opacity-10 pointer-events-none" />

            <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 md:py-20 flex flex-col min-h-screen">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-16 gap-8">
                    <div className="flex flex-col">
                        <Link href="/" className="inline-flex items-center gap-2 mb-8 group">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105">
                                <span className="text-xl font-bold">G</span>
                            </div>
                            <span className="text-xl font-bold tracking-tight text-foreground">
                                Inner G Complete
                            </span>
                        </Link>
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">Enterprise Client Portals</h1>
                        <p className="mt-4 text-muted-foreground text-base md:text-lg max-w-2xl leading-relaxed">
                            Select an active growth architecture to access specific project analytics, campaign performance, and AI-driven insights.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 mt-8 md:mt-0 p-4 rounded-2xl glass-panel md:bg-transparent md:border-none">
                        <div className="h-12 w-12 rounded-full border border-primary/20 flex items-center justify-center bg-primary/10 transition-colors">
                            <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-foreground">{userData?.name || "User"}</p>
                            <p className="text-[10px] text-primary uppercase tracking-widest font-bold">{userData?.role || "CLIENT"}</p>
                        </div>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="flex flex-col gap-4 mb-10">
                    <div className="relative w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            id="search-projects"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search active portals..."
                            className="bg-muted/10 border-border pl-12 h-14 text-base md:text-lg rounded-2xl focus:border-primary transition-all w-full"
                        />
                    </div>
                    <div className="flex flex-wrap lg:flex-nowrap gap-4">
                        <Button
                            id="btn-filter-status"
                            variant="outline"
                            className="flex-1 md:flex-none h-14 px-6 border-border rounded-2xl gap-2 hover:bg-muted/10 order-2 md:order-1"
                        >
                            <Filter className="h-5 w-5" />
                            Status: Active
                        </Button>
                        {userData?.role === "SUPER ADMIN" && (
                            <div className="flex flex-col md:flex-row gap-4 flex-1 md:flex-auto order-1 md:order-2">
                                <Button
                                    id="btn-deploy-portal"
                                    className="flex-1 h-14 px-8 bg-accent hover:bg-accent/90 text-accent-foreground rounded-2xl gap-2 glow-accent"
                                    asChild
                                >
                                    <Link href="/admin/portals/new">
                                        <PlusCircle className="h-5 w-5" />
                                        Deploy New Architecture
                                    </Link>
                                </Button>
                                <Button
                                    id="btn-request-portal"
                                    variant="outline"
                                    className="flex-1 h-14 px-8 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary rounded-2xl gap-2"
                                    asChild
                                >
                                    <Link href="/admin/invites">
                                        <Users className="h-5 w-5" />
                                        Generate New Portal Invite
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Error handling */}
                {error && (
                    <div className="mb-8 rounded-2xl bg-destructive/10 border border-destructive/20 p-6 flex items-center gap-4 text-destructive">
                        <AlertCircle className="h-6 w-6" />
                        <p className="font-medium">{error}</p>
                    </div>
                )}

                {/* Project List */}
                <div className="grid grid-cols-1 gap-6 flex-1">
                    {filteredProjects.length > 0 ? (
                        filteredProjects.map((project) => (
                            <Link
                                key={project.id}
                                href={project.href}
                                id={`portal-card-${project.id}`}
                                className="group relative block glass-panel-strong hover:border-primary/50 transition-all duration-300 p-8 rounded-3xl shadow-2xl"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110" />

                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
                                    <div className="flex flex-col sm:flex-row items-start gap-6">
                                        <div className="h-16 w-16 shrink-0 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                                            <project.icon className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                                <h2 className="text-xl md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                                                    {project.name}
                                                </h2>
                                                <span className={cn(
                                                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                                                    project.status === "Active" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                        project.status === "Building" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                            project.status === "Paused" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                                                                "bg-slate-500/10 text-slate-500 border-slate-500/20"
                                                )}>
                                                    {project.status}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4" />
                                                    {project.client}
                                                </span>
                                                <span className="flex items-center gap-2">
                                                    <Layout className="h-4 w-4" />
                                                    {project.type}
                                                </span>
                                                <span className="flex items-center gap-2 text-primary whitespace-nowrap">
                                                    <ArrowRight className="h-3.5 w-3.5" />
                                                    Campaign: {project.campaign}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row items-center gap-8 pr-4">
                                        <div className="text-right flex flex-col items-center md:items-end w-full md:w-auto">
                                            <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Architecture State</p>
                                            <p className="text-lg font-bold text-foreground">{project.metrics}</p>
                                            <p className="text-[10px] text-primary mt-1 font-semibold flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                Active Session: {project.lastActivity}
                                            </p>
                                        </div>
                                        <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-all group-hover:translate-x-2 group-hover:glow-primary shadow-lg shadow-primary/20">
                                            <ChevronRight className="h-6 w-6" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 glass-panel-strong rounded-3xl border-dashed border-white/5 opacity-50">
                            <Search className="h-12 w-12 mb-4 text-muted-foreground" />
                            <p className="text-xl font-semibold mb-1">No architectures found</p>
                            <p className="text-sm">Verify your access permissions or adjust filters.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-20 py-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-sm text-muted-foreground font-medium">
                        Securely managed by <span className="text-foreground">Inner G Complete Infrastructure</span>
                    </p>
                    <div className="flex items-center gap-8">
                        <button
                            onClick={handleSignOut}
                            className="text-xs text-muted-foreground hover:text-destructive transition-colors uppercase tracking-widest font-bold tracking-tighter"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </main>
    )
}
