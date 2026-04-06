"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
    Loader2, 
    ArrowLeft, 
    Building2, 
    Shield, 
    Zap, 
    BarChart3, 
    Layout, 
    Search,
    ChevronRight,
    ExternalLink,
    Brain,
    MessageSquare,
    Calendar,
    TrendingUp,
    Briefcase,
    Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/browser"
import { AdminHeader } from "@/features/agency/components/AdminHeader"
import Link from "next/link"

interface Project {
    id: string
    name: string
    slug: string
    created_at: string
}

export default function ProjectManagementPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [projects, setProjects] = useState<Project[]>([])
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        const load = async () => {
            try {
                const supabase = createBrowserClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) { router.push("/login"); return }

                const { data: profile } = await supabase
                    .from("users")
                    .select("role")
                    .eq("id", user.id)
                    .single() as any

                if (!profile || profile.role !== "super_admin") {
                    router.push("/select-portal")
                    return
                }

                const { data: projData } = await supabase
                    .from("projects")
                    .select("*")
                    .order("name", { ascending: true }) as any

                if (projData) setProjects(projData)
            } catch (err) {
                console.error("Failed to load projects", err)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [router])

    const filteredProjects = projects.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.slug.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <h2 className="text-xl font-black uppercase tracking-widest italic text-foreground mb-2">Synchronizing Portfolio...</h2>
                <p className="text-muted-foreground text-sm max-w-xs">Connecting to Neural Asset Registry</p>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden relative">
            <AdminHeader 
                title="Portfolio Architecture" 
                subtitle="Global Client Config & Neural Access Control"
            />

            <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10 w-full">
                <div className="p-6 md:p-10 max-w-6xl mx-auto w-full pb-32">
                    {/* Header Info */}
                    <div className="mb-12">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
                            <div>
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
                                    Project <span className="text-primary font-light italic">Access Hub</span>
                                </h1>
                                <p className="text-muted-foreground text-sm md:text-base mt-3 max-w-2xl leading-relaxed">
                                    Manage configurations, neural intelligence access, and feature entitlements for every client deployment in your ecosystem.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-4 mb-8">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input 
                                type="text"
                                placeholder="Search by project name or slug..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-muted/5 border border-border rounded-xl h-12 pl-12 text-sm placeholder:text-muted-foreground/30 font-medium focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-xl"
                            />
                        </div>
                        <div className="px-4 py-3 rounded-xl bg-accent/5 border border-accent/10 flex items-center gap-3">
                            <Building2 className="h-4 w-4 text-accent" />
                            <span className="text-xs font-black uppercase tracking-widest text-foreground">{projects.length} Active Nodes</span>
                        </div>
                    </div>

                    {/* Project Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProjects.map(project => (
                            <div 
                                key={project.id}
                                className="group p-6 rounded-3xl glass-panel border border-border hover:border-primary/20 transition-all duration-500 flex flex-col h-full relative overflow-hidden"
                            >
                                <div className="flex items-start justify-between mb-6 relative z-10">
                                    <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                        <Building2 className="h-7 w-7 text-primary" />
                                    </div>
                                    <Link 
                                        href={`/dashboard/${project.slug}`}
                                        className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary/20 hover:border-primary/40 transition-all"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                                    </Link>
                                </div>

                                <div className="mb-8 relative z-10">
                                    <h3 className="text-lg font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">{project.name}</h3>
                                    <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground mt-1">{project.slug}</p>
                                </div>

                                <div className="mt-auto space-y-2 relative z-10">
                                    <Link href={`/admin/projects/${project.slug}/agent-config`}>
                                        <Button 
                                            variant="ghost" 
                                            className="w-full justify-between h-12 px-4 rounded-2xl bg-violet-500/5 hover:bg-violet-500/10 border border-violet-500/10 text-violet-400 group/btn transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Brain className="h-4 w-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest italic">AI Intelligence</span>
                                            </div>
                                            <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                        </Button>
                                    </Link>
                                    <Link href={`/admin/projects/${project.slug}/funnel-config`}>
                                        <Button 
                                            variant="ghost" 
                                            className="w-full justify-between h-12 px-4 rounded-2xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 text-amber-500 group/btn transition-all shadow-xl shadow-amber-500/5"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Zap className="h-4 w-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest italic">Funnel Blueprint</span>
                                            </div>
                                            <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                        </Button>
                                    </Link>
                                    <Link href={`/admin/projects/${project.slug}/community`}>
                                        <Button 
                                            variant="ghost" 
                                            className="w-full justify-between h-12 px-4 rounded-2xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 text-emerald-400 group/btn transition-all shadow-xl shadow-emerald-500/5"
                                        >
                                            <div className="flex items-center gap-3">
                                                <MessageSquare className="h-4 w-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest italic">Community Agents</span>
                                            </div>
                                            <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                        </Button>
                                    </Link>
                                    <Link href={`/admin/projects/${project.slug}/social-planner`}>
                                        <Button 
                                            variant="ghost" 
                                            className="w-full justify-between h-12 px-4 rounded-2xl bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 text-blue-400 group/btn transition-all shadow-xl shadow-blue-500/5"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Calendar className="h-4 w-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest italic">Social Scheduling</span>
                                            </div>
                                            <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                        </Button>
                                    </Link>
                                    <Link href={`/admin/projects/${project.slug}/crypto`}>
                                        <Button 
                                            variant="ghost" 
                                            className="w-full justify-between h-12 px-4 rounded-2xl bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 text-indigo-400 group/btn transition-all shadow-xl shadow-indigo-500/5"
                                        >
                                            <div className="flex items-center gap-3">
                                                <TrendingUp className="h-4 w-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest italic">Crypto Strategy</span>
                                            </div>
                                            <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                        </Button>
                                    </Link>
                                    <Link href={`/admin/projects/${project.slug}/cognitive-management`}>
                                        <Button 
                                            variant="ghost" 
                                            className="w-full justify-between h-12 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 group/btn transition-all shadow-lg shadow-rose-500/5 ring-1 ring-rose-500/20"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Briefcase className="h-4 w-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest italic">Cognitive Management</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="h-3 w-3 animate-pulse text-rose-400" />
                                                <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                            </div>
                                        </Button>
                                    </Link>
                                    <Link href={`/admin/projects/${project.slug}/metrics`}>
                                        <Button 
                                            variant="ghost" 
                                            className="w-full justify-between h-12 px-4 rounded-2xl bg-primary/5 hover:bg-primary/10 border border-primary/10 text-primary group/btn transition-all shadow-xl shadow-primary/5"
                                        >
                                            <div className="flex items-center gap-3">
                                                <BarChart3 className="h-4 w-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest italic">Metrics & Ports</span>
                                            </div>
                                            <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                        </Button>
                                    </Link>
                                </div>

                                {/* Background Ambient */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-primary/10 transition-all duration-500" />
                            </div>
                        ))}
                    </div>

                    {filteredProjects.length === 0 && (
                        <div className="py-20 text-center border border-dashed border-border rounded-3xl bg-muted/5">
                            <p className="text-muted-foreground text-sm font-medium">No projects found matching "{searchQuery}"</p>
                            <Button 
                                variant="link" 
                                onClick={() => setSearchQuery("")}
                                className="text-primary mt-2 text-xs font-bold uppercase tracking-widest"
                            >
                                Clear Search Protocol
                            </Button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
