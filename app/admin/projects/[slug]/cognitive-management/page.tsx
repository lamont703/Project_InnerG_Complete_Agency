"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
    Loader2, 
    ArrowLeft, 
    Plus, 
    Briefcase, 
    Brain, 
    IterationCcw, 
    ShieldCheck, 
    Zap, 
    BarChart3, 
    ChevronRight,
    Search,
    History,
    Calendar,
    Sparkles,
    CheckCircle2,
    Play
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/browser"
import { AdminHeader } from "@/features/agency/components/AdminHeader"
import Link from "next/link"
import { toast } from "sonner"

interface Iteration {
    id: string
    name: string
    status: 'DRAFT' | 'ACTIVE' | 'FINALIZED'
    current_phase: number
    created_at: string
}

export default function CognitiveManagementPage() {
    const params = useParams()
    const router = useRouter()
    const slug = params.slug as string
    
    const [isLoading, setIsLoading] = useState(true)
    const [projectId, setProjectId] = useState<string | null>(null)
    const [projectName, setProjectName] = useState("")
    const [iterations, setIterations] = useState<Iteration[]>([])
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        const load = async () => {
            try {
                const supabase = createBrowserClient()
                
                // 1. Get Project ID
                const { data: project } = await supabase
                    .from("projects")
                    .select("id, name")
                    .eq("slug", slug)
                    .single() as any
                
                if (!project) {
                    toast.error("Project not found")
                    router.push("/admin/projects")
                    return
                }

                setProjectId(project.id)
                setProjectName(project.name)

                // 2. Get Iterations
                const { data: iterData } = await supabase
                    .from("pm_iterations")
                    .select("*")
                    .eq("project_id", project.id)
                    .order("created_at", { ascending: false }) as any

                if (iterData) setIterations(iterData)
            } catch (err) {
                console.error("Failed to load PM data", err)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [slug, router])

    const startNewIteration = async () => {
        if (!projectId) return
        
        setIsLoading(true)
        try {
            const supabase = createBrowserClient()
            const name = `Iteration: ${new Date().toLocaleDateString()}`
            
            const { data, error } = await (supabase
                .from("pm_iterations") as any)
                .insert({
                    project_id: projectId,
                    name: name,
                    status: 'DRAFT',
                    current_phase: 1
                })
                .select()
                .single();

            if (error) {
                console.error("Supabase error creating iteration:", error)
                throw error
            }
            
            toast.success("New Cognitive Cycle Initiated")
            router.push(`/admin/projects/${slug}/cognitive-management/${data.id}`)
        } catch (err) {
            toast.error("Failed to initiate cycle")
            console.error("Failed to initiate cycle:", err)
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-4" />
                <h2 className="text-xl font-black uppercase tracking-widest italic text-foreground mb-2">Synchronizing Framework...</h2>
                <p className="text-muted-foreground text-sm max-w-xs">Connecting to CPMAI Global Registry</p>
            </div>
        )
    }

    const filteredIterations = iterations.filter(i => 
        i.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden relative">
            <AdminHeader 
                title={`${projectName}`} 
                subtitle="Cognitive Project Management Hub (CPMAI)"
            />

            <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10 w-full">
                <div className="p-6 md:p-10 max-w-6xl mx-auto w-full pb-32">
                    
                    {/* Back Link */}
                    <Link 
                        href="/admin/projects"
                        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group"
                    >
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Back to Portfolio</span>
                    </Link>

                    {/* Section Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                        <div className="max-w-2xl">
                            <h1 className="text-3xl md:text-5xl font-black tracking-tight flex items-center gap-4">
                                <Briefcase className="h-8 w-8 text-amber-500" />
                                Iteration <span className="text-amber-500 font-light italic">Mastery</span>
                            </h1>
                            <p className="text-muted-foreground text-sm mt-4 leading-relaxed italic border-l-2 border-amber-500/20 pl-4">
                                Manage high-level project lifecycles using the CPMAI hexagonal methodology. 
                                Each iteration treats the project as a living document to ensure neural alignment and scaling efficiency.
                            </p>
                        </div>
                        <Button 
                            onClick={startNewIteration}
                            className="bg-amber-600 hover:bg-amber-500 text-white rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-amber-500/20 gap-3"
                        >
                            <Plus className="h-4 w-4" />
                            Initiate New Cycle
                        </Button>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-6 mb-10 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
                        <div className="relative flex-1 min-w-[300px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input 
                                type="text"
                                placeholder="Search iterations history..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-muted/5 border border-border rounded-2xl h-12 pl-12 text-sm placeholder:text-muted-foreground/30 font-medium focus:ring-1 focus:ring-amber-500/40 transition-all shadow-xl"
                            />
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Neural Capacity</span>
                                <span className="text-sm font-bold text-foreground">Active Hub</span>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            </div>
                        </div>
                    </div>

                    {/* Iterations Grid */}
                    <div className="grid gap-4">
                        {filteredIterations.map(iteration => (
                            <Link 
                                key={iteration.id}
                                href={`/admin/projects/${slug}/cognitive-management/${iteration.id}`}
                                className="group block"
                            >
                                <div className="p-6 rounded-3xl glass-panel border border-border group-hover:border-amber-500/30 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                                    
                                    <div className="flex items-center gap-6 relative z-10">
                                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border transition-all duration-500 group-hover:scale-110 ${
                                            iteration.status === 'ACTIVE' 
                                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-500 animate-pulse' 
                                            : 'bg-muted border-border text-muted-foreground'
                                        }`}>
                                            <IterationCcw className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-foreground group-hover:text-amber-500 transition-colors">{iteration.name}</h3>
                                            <div className="flex items-center gap-4 mt-2">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                                                    iteration.status === 'ACTIVE' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                                    iteration.status === 'FINALIZED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                                    'bg-muted border-border text-muted-foreground'
                                                }`}>
                                                    {iteration.status}
                                                </span>
                                                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-2">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(iteration.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-12 relative z-10">
                                        <div className="hidden lg:flex flex-col items-center">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Phase Mastery</span>
                                            <div className="flex items-center gap-1">
                                                {[1, 2, 3, 4, 5, 6].map(p => (
                                                    <div 
                                                        key={p} 
                                                        className={`h-1.5 w-6 rounded-full transition-all duration-500 ${
                                                            p <= iteration.current_phase ? 'bg-amber-500' : 'bg-muted border border-border'
                                                        }`} 
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-[9px] font-bold text-foreground mt-2">Phase {iteration.current_phase} / 6</span>
                                        </div>
                                        
                                        <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-amber-500/20 group-hover:border-amber-500/40 transition-all group-hover:translate-x-1">
                                            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-500" />
                                        </div>
                                    </div>

                                    {/* Ambient Background for Active */}
                                    {iteration.status === 'ACTIVE' && (
                                        <div className="absolute top-1/2 left-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[80px] -translate-y-1/2 pointer-events-none" />
                                    )}
                                </div>
                            </Link>
                        ))}

                        {filteredIterations.length === 0 && (
                            <div className="py-24 text-center border border-dashed border-border rounded-3xl bg-muted/5 group hover:bg-amber-500/5 transition-colors cursor-pointer" onClick={startNewIteration}>
                                <div className="h-16 w-16 rounded-full bg-amber-500/5 border border-amber-500/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                    <Sparkles className="h-8 w-8 text-amber-500 opacity-20" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-2 italic tracking-tight">No Active Cognitive Cycles</h3>
                                <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-8 leading-relaxed opacity-60">
                                    Initiate your first project lifecycle using the CPMAI framework to begin structured scaling.
                                </p>
                                <Button variant="outline" className="h-12 px-8 rounded-xl border-amber-500/20 text-amber-500 hover:bg-amber-500/10 font-black uppercase tracking-widest text-[10px]">
                                    Kickoff Neural Iteration
                                </Button>
                            </div>
                        )}
                    </div>

                </div>
            </main>
        </div>
    )
}
