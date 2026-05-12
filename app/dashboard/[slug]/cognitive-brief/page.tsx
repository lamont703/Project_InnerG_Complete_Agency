"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { 
    Loader2, 
    Brain, 
    CheckCircle2, 
    Target, 
    BarChart3, 
    Search as SearchIcon, 
    Filter as FilterIcon, 
    Rocket as RocketIcon,
    FileText,
    ShieldCheck,
    Cpu,
    ArrowRightCircle,
    Activity
} from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/browser"
import { AdminHeader } from "@/features/agency/components/AdminHeader"

const PHASES = [
    { id: 1, title: "Business Alignment", icon: Target, color: "text-amber-500", bg: "bg-amber-500/10" },
    { id: 2, title: "Intelligence Audit", icon: SearchIcon, color: "text-blue-500", bg: "bg-blue-500/10" },
    { id: 3, title: "Execution Pipeline", icon: FilterIcon, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { id: 4, title: "Strategic Modeling", icon: Brain, color: "text-purple-500", bg: "bg-purple-500/10" },
    { id: 5, title: "Performance Evaluation", icon: BarChart3, color: "text-rose-500", bg: "bg-rose-500/10" },
    { id: 6, title: "Operational Impact", icon: RocketIcon, color: "text-indigo-500", bg: "bg-indigo-500/10" }
]

export default function CognitiveBriefPage() {
    const params = useParams()
    const slug = params.slug as string
    
    const [isLoading, setIsLoading] = useState(true)
    const [project, setProject] = useState<any>(null)
    const [iteration, setIteration] = useState<any>(null)
    const [responses, setResponses] = useState<Record<string, string>>({})

    useEffect(() => {
        const loadBriefData = async () => {
            try {
                const supabase = createBrowserClient()
                console.log("[CognitiveBrief] 🧠 Neural Sync Initiated for:", slug)
                
                // 1. Fetch Project via verified schema
                const { data: proj, error: projErr } = await supabase
                    .from("projects")
                    .select("id, name, settings")
                    .eq("slug", slug)
                    .single() as any
                
                if (projErr || !proj) {
                    console.error("[CognitiveBrief] ❌ PROJECT LOOKUP FAILED:", slug, projErr)
                    setIsLoading(false)
                    return
                }
                setProject(proj)
                console.log("[CognitiveBrief] ✅ Project Connection Established:", proj.id)

                // 2. Fetch Latest Iterations for this Project
                const { data: iters, error: iterErr } = await supabase
                    .from("pm_iterations")
                    .select("*")
                    .eq("project_id", proj.id)
                    .order("created_at", { ascending: false }) as any
                
                if (iters && iters.length > 0) {
                    const latestIter = iters[0]
                    setIteration(latestIter)
                    console.log("[CognitiveBrief] 🎯 Target Iteration Synced:", latestIter.id)

                    // 3. Fetch institutional artifacts (Responses)
                    const { data: respData } = await (supabase
                        .from("pm_responses") as any)
                        .select("*")
                        .eq("iteration_id", latestIter.id)

                    if (respData) {
                        const respMap: Record<string, string> = {}
                        respData.forEach((r: any) => {
                            respMap[r.question_key] = r.response_text || ""
                        });
                        setResponses(respMap)
                        console.log("[CognitiveBrief] 📂 Artifacts Verified:", Object.keys(respMap).length)
                    }
                } else {
                    console.warn("[CognitiveBrief] ⚠️ No iterations found for PID:", proj.id)
                }
            } catch (err) {
                console.error("[CognitiveBrief] 🚨 Neural Sync Exception:", err)
            } finally {
                setIsLoading(false)
            }
        }
        loadBriefData()
    }, [slug])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-4" />
                <h2 className="text-xl font-black uppercase tracking-widest italic text-foreground">Synchronizing Project Intelligence...</h2>
            </div>
        )
    }

    if (!iteration) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <Brain className="h-16 w-16 text-muted-foreground/20 mb-6" />
                <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground mb-2">No Active Lifecycle Found</h2>
                <p className="text-muted-foreground max-w-sm">A project management iteration has not been initialized for this project yet.</p>
            </div>
        )
    }

    const getPhaseProgress = (phaseId: number) => {
        if (iteration.current_phase > phaseId) return "COMPLETE"
        if (iteration.current_phase === phaseId) return "LIVE ANALYSIS"
        return "SCHEDULED"
    }

    // High Level Highlights Extracted from Responses
    const summaryHighlights = [
        { label: "Core Objective", value: responses["1-problem"] || "Defining Iteration Target", icon: Target },
        { label: "Success Benchmark", value: responses["1-success-measures"] || "Awaiting KPI Lock", icon: BarChart3 },
        { label: "AI Pattern Architecture", value: responses["1-ai-patterns"] || "Evaluating Pattern", icon: Cpu },
        { label: "Expected Strategic ROI", value: responses["1-roi"] || "Calculating Forecast", icon: Activity }
    ]

    return (
        <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden relative">
            <AdminHeader 
                title="Cognitive Project Brief" 
                subtitle={`${project?.name} • Institutional AI Roadmap`}
            />

            <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10 w-full bg-muted/5">
                <div className="p-6 md:p-10 max-w-5xl mx-auto w-full pb-32">
                    
                    {/* Executive Summary Header */}
                    <div className="p-10 rounded-[48px] bg-gradient-to-br from-amber-500/10 to-transparent border border-white/5 mb-12 relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Brain className="h-32 w-32" />
                        </div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-4">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 block">Institutional AI Charter</span>
                                <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                    iteration.status === 'FINALIZED' 
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                                    : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                }`}>
                                    {iteration.status || 'DRAFT'} SYNC
                                </div>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-foreground uppercase tracking-tighter leading-none mb-6">
                                {iteration.name}
                            </h1>
                            <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed mb-10 font-medium italic">
                                This strategic brief provides a high-level overview of the cognitive intelligence lifecycle being executed for {project?.name}. It tracks technical requirements, business alignment, and performance evaluations to ensure institutional-grade delivery.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {summaryHighlights.map((item) => (
                                    <div key={item.label} className="p-6 rounded-3xl bg-black/20 border border-white/5 shadow-xl">
                                        <div className="flex items-center gap-3 mb-3 text-amber-500">
                                            <item.icon className="h-4 w-4" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
                                        </div>
                                        <p className="text-xs font-bold text-foreground line-clamp-3 leading-relaxed">
                                            {item.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Operational Lifecycle Stepper */}
                    <div className="space-y-6">
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-4 mb-4">Lifecycle Transparency Protocol</h2>
                        
                        {PHASES.map((phase) => (
                            <div 
                                key={phase.id}
                                className={`p-8 rounded-[40px] border transition-all duration-700 bg-white/5 group/phase ${
                                    getPhaseProgress(phase.id) === "COMPLETE" ? 'border-emerald-500/20 bg-emerald-500/[0.02]' : 
                                    getPhaseProgress(phase.id) === "LIVE ANALYSIS" ? 'border-amber-500/20 shadow-2xl shadow-amber-500/5' : 
                                    'border-white/5 opacity-50 grayscale'
                                }`}
                            >
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-6">
                                        <div className={`h-16 w-16 rounded-[24px] flex items-center justify-center transition-all duration-700 ${
                                            getPhaseProgress(phase.id) === "COMPLETE" ? 'bg-emerald-500/10 text-emerald-500 scale-95' :
                                            getPhaseProgress(phase.id) === "LIVE ANALYSIS" ? 'bg-amber-500 text-black shadow-2xl shadow-amber-500/50 rotate-3' :
                                            'bg-muted text-muted-foreground'
                                        }`}>
                                            {getPhaseProgress(phase.id) === "COMPLETE" ? <CheckCircle2 className="h-8 w-8" /> : <phase.icon className="h-8 w-8" />}
                                        </div>
                                        <div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${
                                                getPhaseProgress(phase.id) === "COMPLETE" ? 'text-emerald-500' :
                                                getPhaseProgress(phase.id) === "LIVE ANALYSIS" ? 'text-amber-500 animate-pulse' :
                                                'text-muted-foreground'
                                            }`}>
                                                Phase {phase.id}: {getPhaseProgress(phase.id)}
                                            </span>
                                            <h3 className="text-2xl font-black text-foreground uppercase tracking-tight group-hover/phase:translate-x-1 transition-transform">
                                                {phase.title}
                                            </h3>
                                        </div>
                                    </div>

                                    {getPhaseProgress(phase.id) === "LIVE ANALYSIS" && (
                                        <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                                            <Activity className="h-4 w-4 text-amber-500 animate-bounce" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 italic">Neural Sync Active</span>
                                        </div>
                                    )}
                                </div>

                                {/* Summary Content for Expanded View */}
                                {(getPhaseProgress(phase.id) === "COMPLETE" || getPhaseProgress(phase.id) === "LIVE ANALYSIS") && (
                                    <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-4 duration-700">
                                        {Object.entries(responses)
                                            .filter(([key]) => key.startsWith(`${phase.id}-`))
                                            .slice(0, 4) // Show only first 4 high-level artifacts
                                            .map(([key, value]) => (
                                                <div key={key} className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <ShieldCheck className="h-3 w-3 text-amber-500/50" />
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Verification Artifact</span>
                                                    </div>
                                                    <p className="text-xs text-foreground leading-relaxed italic border-l border-amber-500/20 pl-4 py-1">
                                                        {value}
                                                    </p>
                                                </div>
                                            ))
                                        }
                                        {Object.keys(responses).filter(k => k.startsWith(`${phase.id}-`)).length === 0 && (
                                            <p className="text-xs text-muted-foreground italic col-span-2">Technical artifacts currently being mapped in synchronization with the CPMAI workbook.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-20 p-10 rounded-[48px] border border-white/5 bg-black/40 text-center">
                        <FileText className="h-10 w-10 text-muted-foreground/30 mb-6 mx-auto" />
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-foreground mb-4">Institutional Export Logic</h4>
                        <p className="text-[11px] text-muted-foreground max-w-sm mx-auto italic">This brief represents a snapshot of the current intelligence iteration. A full Technical Documentation package will be generated upon Phase VI completion.</p>
                    </div>

                </div>
            </main>
        </div>
    )
}
