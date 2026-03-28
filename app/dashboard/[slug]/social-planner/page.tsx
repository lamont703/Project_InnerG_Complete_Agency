"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
    Calendar,
    Plus,
    Loader2,
    MessageSquare,
    Youtube,
    Instagram,
    Facebook,
    Linkedin,
    Twitter,
    Zap,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Search,
    Filter,
    ArrowRight,
    Globe,
    ExternalLink
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/browser"
import { toast } from "sonner"
import { SocialPostModal } from "@/features/social/components/SocialPostModal"
import { SocialCalendarView } from "@/features/social/components/SocialCalendarView"
import { useAgencyData } from "@/features/agency/use-agency-data"

interface ScheduledPost {
    id: string
    platform: string
    destination_id?: string
    content: string
    title: string | null
    scheduled_at: string | null
    status: string
    error_message?: string | null
    error_log?: string | null
    external_post_id: string | null
    published_at: string | null
    created_at: string
    type: 'manual' | 'agent'
    ai_reasoning?: string | null
    source_type?: string | null
}

export default function SocialPlannerPage() {
    const params = useParams()
    const router = useRouter()
    const slug = params.slug as string
    
    const { 
        socialDrafts, 
        projects, 
        isLoading, 
        refresh,
        generateImage,
        generateVideo,
        clearMedia
    } = useAgencyData(slug)

    const [isPostModalOpen, setIsPostModalOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [sortBy, setSortBy] = useState<'scheduled_at' | 'created_at' | 'status' | 'type'>('scheduled_at')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const [editingPost, setEditingPost] = useState<any>(null)
    const [view, setView] = useState<'queue' | 'calendar'>('queue')

    const currentProject = projects.find(p => p.slug === slug)
    const projectId = currentProject?.id
    
    // Default to the full suite if the project hasn't explicitly restricted its target platforms
    const DEFAULT_PLATFORMS = ['twitter', 'linkedin', 'facebook', 'instagram', 'youtube', 'ghl']
    const allowedPlatforms = (currentProject?.settings?.features?.social_planner_platforms?.length || 0) > 0 
        ? currentProject?.settings?.features?.social_planner_platforms 
        : DEFAULT_PLATFORMS

    const posts = (socialDrafts || []).map((p: any) => ({
        ...p,
        type: p.source_type === 'manual' ? 'manual' : 'agent',
        scheduled_at: p.scheduled_at || p.published_at || p.created_at,
        content: p.content_text,
        title: p.title || (p.source_type ? `${p.source_type.toUpperCase()} Sequence` : "Agent Intel Post"),
        status: p.status
    })).sort((a: any, b: any) => {
        let comparison = 0
        if (sortBy === 'scheduled_at') {
            comparison = new Date(a.scheduled_at || 0).getTime() - new Date(b.scheduled_at || 0).getTime()
        } else if (sortBy === 'created_at') {
            comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        } else if (sortBy === 'status') {
            comparison = a.status.localeCompare(b.status)
        } else if (sortBy === 'type') {
            comparison = a.type.localeCompare(b.type)
        }
        return sortOrder === 'desc' ? comparison * -1 : comparison
    })

    const handlePublishNow = async (id: string) => {
        try {
            const supabase = createBrowserClient()
            const { error } = await (supabase as any)
                .from("social_content_plan")
                .update({ 
                    status: 'published',
                    published_at: new Date().toISOString()
                })
                .eq("id", id)

            if (error) throw error
            toast.success("Dispatch sequence initiated")
            refresh()
        } catch (err: any) {
            toast.error(`Dispatch Failed: ${err.message}`)
        }
    }

    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    useEffect(() => {
        // Feature gate check - Only redirect if we have project data AND it's explicitly disabled
        // We wait for loading to finish and projects to be populated to avoid premature redirects
        if (!isLoading && projects.length > 0 && slug && mounted) {
            const project = projects.find(p => p.slug === slug)
            
            // Critical: ONLY redirect if the project exists AND social_planner is specifically FALSE.
            // If the project is still hydrating, we stay on the page.
            if (project && project.settings?.features?.social_planner === false) {
                console.warn(`[SocialPlanner] Feature disabled for ${slug}, redirecting...`)
                router.push(`/dashboard/${slug}`)
            }
        }
    }, [slug, isLoading, projects, router, mounted])

    const getPlatformIcon = (platform: string) => {
        switch (platform.toLowerCase()) {
            case 'youtube': return <Youtube className="h-4 w-4 text-red-500" />
            case 'instagram': return <Instagram className="h-4 w-4 text-pink-500" />
            case 'facebook': return <Facebook className="h-4 w-4 text-blue-600" />
            case 'linkedin': return <Linkedin className="h-4 w-4 text-blue-500" />
            case 'twitter': return <Twitter className="h-4 w-4 text-zinc-400" />
            case 'ghl': return <MessageSquare className="h-4 w-4 text-orange-500" />
            default: return <Globe className="h-4 w-4 text-primary" />
        }
    }

    const filteredPosts = posts.filter(p => 
        p.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.platform.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden relative">
            <header className="px-6 py-6 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-7xl mx-auto w-full">
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
                            Social <span className="text-primary font-light italic">Tactical Planner</span>
                        </h1>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1 opacity-60 italic">Multi-Platform Content Dispatch Engine</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative hidden md:block w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input 
                                type="text"
                                placeholder="Scan content queue..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-muted/5 border border-border rounded-xl h-10 pl-10 text-xs placeholder:text-muted-foreground/30 font-medium focus:ring-1 focus:ring-primary outline-none"
                            />
                        </div>
                        <div className="flex items-center gap-3 bg-muted/5 border border-border rounded-2xl px-2 h-11 self-end md:self-auto">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-3 hidden sm:inline">Sort Order</span>
                            <div className="flex bg-background/40 border border-border/40 rounded-xl p-1">
                                <button 
                                    onClick={() => setSortBy('scheduled_at')}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === 'scheduled_at' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    Chronos
                                </button>
                                <button 
                                    onClick={() => setSortBy('status')}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === 'status' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    Status
                                </button>
                                <button 
                                    onClick={() => setSortBy('type')}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === 'type' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    Origin
                                </button>
                            </div>
                            <button 
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                className="h-8 w-8 flex items-center justify-center rounded-xl bg-background/60 border border-border/40 hover:bg-muted transition-all text-muted-foreground mr-1"
                            >
                                <Filter className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                        <div className="flex items-center gap-1 bg-muted/10 border border-border/40 rounded-2xl p-1 h-11">
                            <button 
                                onClick={() => setView('queue')}
                                className={`flex items-center gap-2 px-4 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'queue' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:bg-muted/20'}`}
                            >
                                <Zap className="h-3.5 w-3.5" />
                                Queue
                            </button>
                            <button 
                                onClick={() => setView('calendar')}
                                className={`flex items-center gap-2 px-4 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'calendar' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:bg-muted/20'}`}
                            >
                                <Calendar className="h-3.5 w-3.5" />
                                Calendar
                            </button>
                        </div>

                        <Button 
                            onClick={() => setIsPostModalOpen(true)}
                            className="rounded-xl flex items-center gap-2 font-black uppercase tracking-widest text-[10px] h-11 bg-primary text-primary-foreground px-6 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            <Plus className="h-4 w-4" />
                            Provision Broadcast
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
                <div className="max-w-7xl mx-auto w-full pb-20">
                    
                    {/* Status Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        <div className="p-6 rounded-3xl glass-panel border border-border flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                                <Zap className="h-6 w-6" />
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Approved Tactical</span>
                                <span className="text-2xl font-bold text-foreground">{posts.filter(p => p.status === 'approved').length}</span>
                            </div>
                        </div>
                        <div className="p-6 rounded-3xl glass-panel border border-border flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Published Content</span>
                                <span className="text-2xl font-bold text-foreground">{posts.filter(p => p.status === 'published').length}</span>
                            </div>
                        </div>
                        <div className="p-6 rounded-3xl glass-panel border border-border flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500">
                                <Plus className="h-6 w-6" />
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Tactical Drafts</span>
                                <span className="text-2xl font-bold text-foreground">{posts.filter(p => p.status === 'draft').length}</span>
                            </div>
                        </div>
                        <div className="p-6 rounded-3xl glass-panel border border-border flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                                <Clock className="h-6 w-6" />
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Scheduled Dispatch</span>
                                <span className="text-2xl font-bold text-foreground">{posts.filter(p => p.status === 'scheduled').length}</span>
                            </div>
                        </div>
                    </div>

                    {/* operational content switcher */}
                    {view === 'queue' ? (
                        /* Operational Queue */
                        <div className="space-y-6">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 mb-6">
                                <Zap className="h-4 w-4" />
                                Content Deployment Queue
                            </h2>

                            <div className="space-y-4">
                                {filteredPosts.map(post => (
                                    <div 
                                        key={post.id}
                                        className={`p-6 rounded-3xl border transition-all relative overflow-hidden group hover:scale-[1.01] ${
                                            post.status === 'published' ? 'bg-emerald-500/[0.02] border-emerald-500/10' : 
                                            post.status === 'scheduled' ? 'glass-panel-strong border-blue-500/20 shadow-xl shadow-blue-500/5' :
                                            post.status === 'draft' ? 'bg-violet-500/[0.02] border-violet-500/10' :
                                            post.status === 'failed' ? 'bg-red-500/5 border-red-500/20' :
                                            'bg-muted/5 border-border'
                                        }`}
                                    >
                                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                                <div className="h-14 w-14 rounded-2xl bg-background border border-border flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                                                    {getPlatformIcon(post.platform)}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-sm font-bold tracking-tight truncate max-w-[200px]">{post.title || "Untitled Sequence"}</h3>
                                                            {post.type === 'agent' && (
                                                                <div className="flex items-center gap-1 bg-primary/20 text-primary px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border border-primary/20 shadow-lg shadow-primary/10">
                                                                    <Zap className="h-2 w-2" />
                                                                    AI Agent
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className={`text-[8px] px-2.5 py-1 rounded-md font-black uppercase tracking-widest border transition-colors ${
                                                            post.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' :
                                                            post.status === 'scheduled' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.1)]' :
                                                            post.status === 'draft' ? 'bg-muted/10 text-muted-foreground border-white/5' :
                                                            post.status === 'approved' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]' :
                                                            'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
                                                        }`}>
                                                            {post.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground line-clamp-1 italic max-w-xl">"{post.content}"</p>
                                                    {post.ai_reasoning && (
                                                        <p className="text-[9px] text-muted-foreground/60 mt-1 italic line-clamp-1">Intent: {post.ai_reasoning}</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-border/40">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Scheduled Dispatch</span>
                                                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                                        <Clock className="h-3 w-3 text-primary" />
                                                        {new Date(post.scheduled_at || new Date().toISOString()).toLocaleString()}
                                                    </div>
                                                </div>

                                                <div className="h-10 w-px bg-border/40 hidden md:block" />

                                                <div className="flex items-center gap-2">
                                                    {post.status === 'completed' && post.external_post_id && (
                                                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                                                            <ExternalLink className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {post.status === 'pending' && (
                                                        <Button 
                                                            onClick={() => handlePublishNow(post.id)}
                                                            variant="ghost" 
                                                            className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-2 group/pub"
                                                        >
                                                            <Zap className="h-3 w-3 group-hover/pub:animate-pulse" />
                                                            Execute Now
                                                        </Button>
                                                    )}
                                                    <Button 
                                                        variant="ghost" 
                                                        className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all text-muted-foreground"
                                                        onClick={() => {
                                                            setEditingPost(post)
                                                            setIsPostModalOpen(true)
                                                        }}
                                                    >
                                                        Modify
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {post.status === 'error' && post.error_message && (
                                            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] flex items-center gap-2">
                                                <AlertTriangle className="h-3 w-3" />
                                                Dispatch Failure: {post.error_message}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {filteredPosts.length === 0 && (
                                    <div className="py-24 text-center border border-dashed border-border rounded-[2rem] bg-muted/5 flex flex-col items-center">
                                        <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-6 text-primary/20">
                                            <Calendar className="h-10 w-10" />
                                        </div>
                                        <h4 className="text-lg font-bold uppercase tracking-tight italic opacity-40">Queue Matrix Empty</h4>
                                        <p className="text-xs text-muted-foreground max-w-xs mt-2 mb-8 leading-relaxed">No content has been provisioned for automated dispatch. Start by drafting your first broadcast sequence.</p>
                                        <Button 
                                            onClick={() => setIsPostModalOpen(true)}
                                            className="h-12 px-10 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-primary/20"
                                        >
                                            Initiate First Sequence
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <SocialCalendarView 
                            posts={posts} 
                            onPublishNow={handlePublishNow} 
                            getPlatformIcon={getPlatformIcon}
                        />
                    )}

                </div>
            </main>

            <SocialPostModal 
                isOpen={isPostModalOpen} 
                onClose={() => {
                    setIsPostModalOpen(false)
                    setEditingPost(null)
                }} 
                projectId={projectId || ""}
                onSuccess={refresh}
                platforms={allowedPlatforms}
                initialData={editingPost}
                onGenerateImage={generateImage}
                onGenerateVideo={generateVideo}
                onClearMedia={clearMedia}
            />
        </div>
    )
}
