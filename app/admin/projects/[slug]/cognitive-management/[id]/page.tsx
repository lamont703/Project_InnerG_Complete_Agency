"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
    Loader2, 
    Brain, 
    CheckCircle2, 
    ChevronRight, 
    ChevronLeft, 
    Sparkles, 
    Save, 
    Target, 
    BarChart3, 
    Search as SearchIcon, 
    Filter as FilterIcon, 
    Rocket as RocketIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/browser"
import { AdminHeader } from "@/features/agency/components/AdminHeader"
import { toast } from "sonner"

const PHASES = [
    { id: 1, title: "Business Understanding", icon: Target, color: "text-amber-500", bg: "bg-amber-500/10" },
    { id: 2, title: "Data Understanding", icon: SearchIcon, color: "text-blue-500", bg: "bg-blue-500/10" },
    { id: 3, title: "Data Preparation", icon: FilterIcon, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { id: 4, title: "Model Development", icon: Brain, color: "text-purple-500", bg: "bg-purple-500/10" },
    { id: 5, title: "Model Evaluation", icon: BarChart3, color: "text-rose-500", bg: "bg-rose-500/10" },
    { id: 6, title: "Operationalization", icon: RocketIcon, color: "text-indigo-500", bg: "bg-indigo-500/10" }
]

export default function IterationDetailPage() {
    const params = useParams()
    const router = useRouter()
    const slug = params.slug as string
    const id = params.id as string
    
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isAIGenerating, setIsAIGenerating] = useState(false)
    
    const [iteration, setIteration] = useState<any>(null)
    const [projectName, setProjectName] = useState("")
    const [currentStep, setCurrentStep] = useState(1)
    
    const [responses, setResponses] = useState<Record<string, string>>({})
    const [aiSuggestions, setAiSuggestions] = useState<Record<string, string>>({})

    useEffect(() => {
        const load = async () => {
            try {
                const supabase = createBrowserClient()
                
                // 1. Get Project Detail
                const { data: project } = await supabase
                    .from("projects")
                    .select("id, name")
                    .eq("slug", slug)
                    .single() as any
                
                setProjectName(project?.name || "")

                // 2. Get Iteration Detail
                const { data: iterData } = await supabase
                    .from("pm_iterations")
                    .select("*")
                    .eq("id", id)
                    .single() as any
                
                if (!iterData) {
                    toast.error("Iteration not found")
                    router.push(`/admin/projects/${slug}/cognitive-management`)
                    return
                }

                setIteration(iterData)
                setCurrentStep(iterData.current_phase)

                // 3. Get Responses
                const { data: respData } = await (supabase
                    .from("pm_responses") as any)
                    .select("*")
                    .eq("iteration_id", id)

                if (respData) {
                    const respMap: Record<string, string> = {}
                    const suggestionMap: Record<string, string> = {}
                    respData.forEach((r: any) => {
                        respMap[r.question_key] = r.response_text || ""
                        if (r.ai_suggestion) suggestionMap[r.question_key] = r.ai_suggestion
                    });
                    setResponses(respMap)
                    setAiSuggestions(suggestionMap)
                }
            } catch (err) {
                console.error("Load error:", err)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [slug, id, router])

    const saveResponses = async (nextPhase?: number) => {
        setIsSaving(true)
        try {
            const supabase = createBrowserClient()
            
            // Prepare batches
            const upserts = Object.keys(responses)
                .filter(key => {
                    const phaseNum = parseInt(key.split('-')[0])
                    return phaseNum === currentStep
                })
                .map(key => ({
                    iteration_id: id,
                    phase: currentStep,
                    question_key: key,
                    response_text: responses[key],
                    ai_suggestion: aiSuggestions[key] || null
                }));

            if (upserts.length > 0) {
                const { error } = await (supabase
                    .from("pm_responses") as any)
                    .upsert(upserts, { onConflict: 'iteration_id, question_key' })

                if (error) throw error
            }

            // Update current phase if proceeding
            if (nextPhase && nextPhase > iteration.current_phase) {
                await (supabase
                    .from("pm_iterations") as any)
                    .update({ current_phase: nextPhase })
                    .eq("id", id)
            }

            toast.success("Cognitive State Preserved")
            if (nextPhase) setCurrentStep(nextPhase)
        } catch (err) {
            toast.error("Failed to save progress")
            console.error(err)
        } finally {
            setIsSaving(false)
        }
    }

    const generateAIDraft = async () => {
        setIsAIGenerating(true)
        const currentPhaseObj = PHASES.find(p => p.id === currentStep)
        toast.info(`Generating ${currentPhaseObj?.title} Draft...`)
        
        try {
            await new Promise(res => setTimeout(res, 2000))
            
            const phaseQuestions = (questionsByPhase as Record<number, any[]>)[currentStep] || []
            const newSuggestions: Record<string, string> = { ...aiSuggestions }
            
            phaseQuestions.forEach((q: any) => {
                newSuggestions[q.key] = `AI ANALYZED CONTEXT [v1.0]: For the verbatim target of "${q.description}", I recommend documenting the following institutional procedures based on project history...`
            })

            setAiSuggestions(newSuggestions)
            toast.success("Neural Suggestions Primed")
        } catch (err) {
            toast.error("AI Assistant extraction failed")
        } finally {
            setIsAIGenerating(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-4" />
                <h2 className="text-xl font-black uppercase tracking-widest italic text-foreground mb-2">Accessing Neural Archive...</h2>
                <p className="text-muted-foreground text-sm max-w-xs">Connecting to iteration {id.split('-')[0]}</p>
            </div>
        )
    }

    const currentPhase = PHASES.find(p => p.id === currentStep)!
    const phaseQuestions = (questionsByPhase as Record<number, any[]>)[currentStep] || []

    return (
        <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden relative">
            <AdminHeader 
                title={`${iteration.name}`} 
                subtitle={`${projectName} • Iterative Mastery`}
            />

            <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10 w-full bg-muted/5">
                <div className="p-6 md:p-10 max-w-5xl mx-auto w-full pb-32">
                    
                    {/* Multi-Step Stepper */}
                    <div className="flex items-center justify-between gap-2 mb-12 overflow-x-auto no-scrollbar pb-4 p-2 rounded-3xl bg-white/5 border border-white/5 shadow-2xl">
                        {PHASES.map((phase) => (
                            <button
                                key={phase.id}
                                onClick={() => {
                                    if (phase.id <= iteration.current_phase || phase.id === currentStep) {
                                        setCurrentStep(phase.id)
                                    } else {
                                        toast.info(`Complete Phase ${currentStep} to unlock.`)
                                    }
                                }}
                                className={`flex flex-col items-center gap-3 px-6 py-4 rounded-2xl transition-all duration-500 min-w-[140px] relative ${
                                    currentStep === phase.id 
                                    ? 'bg-amber-500/10 border-amber-500/20 shadow-lg scale-105' 
                                    : phase.id < iteration.current_phase 
                                    ? 'opacity-80 hover:opacity-100 hover:bg-white/5' 
                                    : 'opacity-30 cursor-not-allowed'
                                }`}
                            >
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                                    currentStep === phase.id ? phase.bg + " " + phase.color : 
                                    phase.id < iteration.current_phase ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
                                }`}>
                                    {phase.id < iteration.current_phase ? <CheckCircle2 className="h-5 w-5" /> : <phase.icon className="h-5 w-5" />}
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-[0.15em] transition-colors ${
                                    currentStep === phase.id ? phase.color : 'text-muted-foreground'
                                }`}>Phase {phase.id}</span>
                                {currentStep === phase.id && (
                                    <div className="absolute -bottom-2 w-12 h-0.5 bg-amber-400 rounded-full animate-in slide-in-from-left-4 duration-500" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Current Phase Content */}
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className={`p-4 rounded-3xl ${currentPhase.bg} ${currentPhase.color}`}>
                                    <currentPhase.icon className="h-8 w-8" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">CPMAI Mastery Phase</span>
                                    <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">{currentPhase.title}</h2>
                                </div>
                            </div>
                            <Button 
                                onClick={generateAIDraft}
                                disabled={isAIGenerating}
                                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded-2xl h-12 px-6 font-black uppercase tracking-widest text-[9px] gap-2 transition-all shadow-xl shadow-amber-500/5 group"
                            >
                                {isAIGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />}
                                Draft with AI
                            </Button>
                        </div>

                        {/* Questions Wizard */}
                        <div className="space-y-8">
                            {phaseQuestions.map((q: any) => (
                                <div 
                                    key={q.key} 
                                    className={`p-8 rounded-[40px] glass-panel border bg-white/5 hover:border-amber-500/20 transition-all duration-500 group/card ${
                                        q.isGoNoGo ? 'border-rose-500/20 bg-rose-500/[0.05]' : 'border-border'
                                    }`}
                                >
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-8 w-8 rounded-full border border-amber-500/30 flex items-center justify-center text-[11px] font-black ${
                                                q.isGoNoGo ? 'bg-rose-500/10 text-rose-500 border-rose-500/30' : 'bg-amber-500/10 text-amber-500'
                                            }`}>
                                                {q.id}
                                            </div>
                                            <h3 className={`text-lg font-bold group-hover/card:text-amber-500 transition-colors ${
                                                q.isGoNoGo ? 'text-rose-500' : 'text-foreground'
                                            }`}>{q.title}</h3>
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${
                                            q.isGoNoGo ? 'text-rose-500 animate-pulse' : 'text-muted-foreground/40'
                                        }`}>{q.isGoNoGo ? 'Decision Gate' : 'Artifact'}</span>
                                    </div>

                                    <div className="mb-6">
                                        <p className="text-sm text-foreground font-medium italic opacity-90 leading-relaxed border-l-2 border-amber-500/30 pl-4 py-1">
                                            {q.description}
                                        </p>
                                    </div>

                                    <textarea 
                                        value={responses[q.key] || ""}
                                        onChange={(e) => setResponses(prev => ({ ...prev, [q.key]: e.target.value }))}
                                        placeholder="Enter your documentation here..."
                                        className="w-full bg-black/20 border border-border rounded-3xl p-6 min-h-[160px] text-sm text-foreground focus:ring-1 focus:ring-amber-500/40 transition-all placeholder:text-muted-foreground/30 leading-relaxed font-normal"
                                    />

                                    {aiSuggestions[q.key] && (
                                        <div className="mt-6 p-6 rounded-3xl bg-amber-500/5 border border-amber-500/20 flex flex-col gap-4 animate-in slide-in-from-top-4 duration-500">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 text-amber-500">
                                                    <Brain className="h-4 w-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Neural Draft Suggestion</span>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={() => {
                                                        const confirmText = responses[q.key] ? responses[q.key] + "\n\n" + aiSuggestions[q.key] : aiSuggestions[q.key];
                                                        setResponses(prev => ({ ...prev, [q.key]: confirmText }))
                                                        setAiSuggestions(prev => {
                                                            const n = { ...prev }
                                                            delete n[q.key]
                                                            return n
                                                        })
                                                    }}
                                                    className="h-7 text-[8px] font-black uppercase tracking-widest hover:bg-amber-500/20 text-amber-500 px-3 rounded-lg"
                                                >
                                                    Accept & Merge
                                                </Button>
                                            </div>
                                            <p className="text-xs text-amber-500/80 leading-relaxed italic">{aiSuggestions[q.key]}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Navigation Actions */}
                        <div className="mt-16 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-border pt-12">
                            <Button 
                                variant="ghost"
                                onClick={() => {
                                    if (currentStep > 1) {
                                        saveResponses()
                                        setCurrentStep(prev => prev - 1)
                                    } else {
                                        router.push(`/admin/projects/${slug}/cognitive-management`)
                                    }
                                }}
                                className="h-14 px-8 rounded-2xl bg-white/5 hover:bg-white/10 text-muted-foreground font-black uppercase tracking-widest text-[11px] gap-3"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                {currentStep === 1 ? 'Exit Lifecycle' : 'Previous Phase'}
                            </Button>

                            <div className="flex items-center gap-4">
                                <Button 
                                    onClick={() => saveResponses()}
                                    disabled={isSaving}
                                    className="h-14 px-8 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-foreground font-black uppercase tracking-widest text-[11px] gap-3 shadow-2xl"
                                >
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin text-amber-500" /> : <Save className="h-4 w-4" />}
                                    Save Progress
                                </Button>
                                
                                {currentStep < 6 && (
                                    <Button 
                                        onClick={() => saveResponses(currentStep + 1)}
                                        className="h-14 px-12 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-widest text-[11px] gap-3 shadow-2xl shadow-amber-600/20"
                                    >
                                        Execute Phase {currentStep + 1}
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                )}
                                
                                {currentStep === 6 && (
                                    <Button 
                                        onClick={async () => {
                                            await saveResponses()
                                            const supabase = createBrowserClient()
                                            await (supabase.from("pm_iterations") as any).update({ status: 'FINALIZED' }).eq("id", id)
                                            toast.success("Iteration Mastered & Finalized")
                                            router.push(`/admin/projects/${slug}/cognitive-management`)
                                        }}
                                        className="h-14 px-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[11px] gap-3 shadow-2xl shadow-emerald-600/20"
                                    >
                                        Finalize Mastery
                                        <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

const questionsByPhase: Record<number, any[]> = {
    1: [
        { id: 1, key: "1-problem", title: "Problem Identification", description: "What problem are you solving with AI in this iteration?" },
        { id: 2, key: "1-success-measures", title: "Measures of Success", description: "What are the objective measures of success for this project iteration?" },
        { id: 3, key: "1-budget", title: "Cost & Time Budget", description: "What is the cost and time budget for this project?" },
        { id: 4, key: "1-roi", title: "Expected ROI", description: "What is the expected ROI for this project?" },
        { id: 5, key: "1-cognitive-need", title: "Cognitive Decision Rationale", description: "Why does this project need a cognitive (AI) solution?" },
        { id: 6, key: "1-noncognitive-alt", title: "Noncognitive Analysis", description: "What noncognitive (non-AI) alternatives are there to solving the current business problem? For those alternatives, why are they not feasible for this project? If noncognitive alternatives are feasible, then why are they not being used for this project?" },
        { id: 7, key: "1-hybrid-scope", title: "Hybrid Project Scope", description: "What are the noncognitive (non-AI) portions of this project that will be used in conjunction with the cognitive components?" },
        { id: 8, key: "1-automation-alt", title: "Automation Potential Audit", description: "Are non-cognitive automation alternatives possible for this iteration? If so, why are they not being used for this project iteration?" },
        { id: 9, key: "1-cognitive-objectives", title: "Cognitive Objectives", description: "What are the cognitive objectives for this project?" },
        { id: 10, key: "1-cognitive-outcomes", title: "Outcomes & Goals", description: "What are the cognitive outcomes and goals for this project?" },
        { id: 11, key: "1-ai-vs-non-ai", title: "AI Comparative Advantage", description: "What would the AI project need to successfully do that a non-AI project would not be able to do? In what ways would the AI system need to be better than a non-AI system?" },
        { id: 12, key: "1-ai-patterns", title: "Pattern Selection", description: "Which pattern(s) of AI are you implementing for this project iteration?" },
        { id: 13, key: "1-schedule", title: "Schedule Constraints", description: "What are the project iteration schedule requirements or constraints?" },
        { id: 14, key: "1-tech-resources", title: "Technology Resources", description: "What technology resources do you need for this project?" },
        { id: 15, key: "1-skills", title: "Skills Inventory", description: "What skills do you need for this project iteration?" },
        { id: 16, key: "1-talent", title: "Team Resources", description: "What talent/team resources do you need for this project?" },
        { id: 17, key: "1-other-constraints", title: "Deliverability Risk Constraints", description: "What are the other project constraints that might impact the ability to deliver this iteration?" },
        { id: 18, key: "1-performance-metrics", title: "Statistical Metrics & Sensitivity", description: "What are the desired or required performance metrics for the model? What sensitivities are there to false positives or negatives in the case of a binary classifier or inaccurate responses in the case of generative AI solutions?" },
        { id: 19, key: "1-business-kpi", title: "Business KPI Targets", description: "What are the desired or required business KPI performance metrics for this AI project iteration?" },
        { id: 20, key: "1-tech-kpi", title: "Technology KPI Targets", description: "What are the desired or required technology KPI performance metrics for this AI project iteration?" },
        { id: 21, key: "1-trustworthy-ai", title: "Trustworthy Framework Selection", description: "What, if any, trustworthy AI framework will you be using for this project? If none, how will you ensure consistent application of trustworthy AI across this project and others?" },
        { id: 22, key: "1-potential-harms", title: "Impact & Harm Mitigation", description: "What potential physical, financial, emotional, environmental, or other harms could be caused by this project? What approaches will you use to mitigate those potential harms?" },
        { id: 23, key: "1-failure-handling", title: "Failure Analysis Plan", description: "How will you know when the AI project is failing to provide adequate results? How will you handle AI system failures for this iteration?" },
        { id: 24, key: "1-risks", title: "Top Risks to Failure", description: "What do you see as the most significant risks for this project that could lead to project failure?" },
        { id: 25, key: "1-human-in-loop", title: "Human-in-the-Loop Strategy", description: "How will you maintain a human in the loop or otherwise involved in the AI project operation?" },
        { id: 26, key: "1-informational-bias", title: "Informational Bias Strategy", description: "How will you identify and minimize exposure to informational bias?" },
        { id: 27, key: "1-compliance", title: "Compliance & Regulations", description: "For this AI project iteration, what laws, regulations, or other compliance may be required? If you do not know, how will you find out?" },
        { id: 28, key: "1-data-source-transparency", title: "Data Source Transparency", description: "What transparency are you going to provide to others about the source(s) of the data used in this AI project?" },
        { id: 29, key: "1-data-filter-transparency", title: "Selection Methodology Transparency", description: "What transparency are you going to provide to others about the methods you use to select and filter the data you are using for your AI project?" },
        { id: 30, key: "1-explainability", title: "Explainability Requirements", description: "What are the requirements for explainable algorithms for this AI project?" },
        { id: 31, key: "1-go-no-go-objectives", title: "Objective Clarity Gate", isGoNoGo: true, description: "Do you have a clear description of the problem with regard to the business objectives? If so, mark this a “GO.” If not, what additional definition is required? Mark this as a “No-Go.”" },
        { id: 32, key: "1-go-no-go-customer", title: "Customer Strategy Gate", isGoNoGo: true, description: "Is the customer/business owner/product owner willing to implement/put in production the cognitive solution that your team will be producing? If so, mark this as “Go.” If not, what obstacles are in the way of implementing your AI project? Mark this as a “No-Go.”" },
        { id: 33, key: "1-go-no-go-roi", title: "ROI/Impact Gate", isGoNoGo: true, description: "Does the cognitive solution provide enough ROI or impact? If so, mark this as “Go.” If not, what do you need to modify in your project to provide a positive return? Mark this as a “No-Go.”" },
        { id: 34, key: "1-go-no-go-data-available", title: "Data Sufficiency Gate", isGoNoGo: true, description: "Is the data required to create the cognitive model available, and does it actually measure what you need? If so, mark this as “Go.” If not, what data do you need? Mark this as a “No-Go.”" },
        { id: 35, key: "1-go-no-go-data-access", title: "Data Access Gate", isGoNoGo: true, description: "Do you have access to the data you need? If so, mark this as “Go. If not, what do you need for access to the data? Mark this as a “No-Go.”" },
        { id: 36, key: "1-go-no-go-data-quality", title: "Data Quality Guess Gate", isGoNoGo: true, description: "Does the data have a sufficient level of quality to be useful? If so, mark this as “Go.” If not, mark as a “No-Go.” We will revisit this Go/No-Go during CPMAI Phase II, so make your best guess based on what you know now." },
        { id: 37, key: "1-go-no-go-tech-expertise", title: "Tech/Team Availability Gate", isGoNoGo: true, description: "Do you have access to the technology and expertise you need for this iteration? If so, mark this as “Go.” If not, what technology or expertise do you need? Mark as a “No-Go.” " },
        { id: 38, key: "1-go-no-go-feasibility", title: "Implementation Feasibility Gate", isGoNoGo: true, description: "Is it feasible to implement the model where and how you want to? If so, mark this as “Go.” If not, how can you obtain the answers needed to make it feasible? Mark as a “No-Go.” " },
        { id: 39, key: "1-go-no-go-sense", title: "Final Strategic Sense Gate", isGoNoGo: true, description: "Does it make technical, operational, business, and financial sense to implement the model in the way and in the location you want to? If so, mark this as “Go.” If not, how can you get the answers needed to make it feasible? Mark as a “No-Go.” " }
    ],
    2: [
        { id: 1, key: "2-inventory", title: "Data Inventory & Discovery", description: "Detail the list of data and locations of that data you will need for this iteration of the AI project. If you are encountering any issues with locating or accessing data, document resolution to these issues." },
        { id: 2, key: "2-nature", title: "Nature & Structure Audit", description: "Document the nature of the data you need. What structure is it? Does it have the elements that you need for your AI project iteration? If not, how will you resolve issues of mismatch with the data you need and what you have?" },
        { id: 3, key: "2-inspection", title: "Data Inspection Findings", description: "Have you inspected and selected some of the data to ensure it meets your needs? Detail what you discovered. Is the data a sufficient quantity for your AI project iteration needs? If not, how will you resolve the lack of data?" },
        { id: 4, key: "2-quality", title: "Current Data Quality Audit", description: "What is the current quality of the data you located for your AI project? What needs do you have for data preparation, augmentation, enhancement, and transformation?" },
        { id: 5, key: "2-training-data", title: "Training Strategy Requirements", description: "What additional, specific needs do you have for training data for your AI project? How will you make sure you have sufficient training, test, and validation data?" },
        { id: 6, key: "2-edge-needs", title: "Edge Logic Requirements", description: "Do you have special needs for data to or from edge devices? If so, detail those needs here." },
        { id: 7, key: "2-foundation-models", title: "Foundation/Pretrained Analysis", description: "Can you make use of any pretrained models, models from third parties, or foundation models? If so, detail those models and where and how you will access them. If you need to extend the models through transfer learning or fine-tuning, detail those needs here." }
    ],
    3: [
        { id: 1, key: "3-selection", title: "Selection Methodology", description: "Select the data that is needed for the project and provide some documentation of the data selection method. If data sources or data within a data source was excluded, detail that exclusion for future reference." },
        { id: 2, key: "3-cleansing", title: "Cleansing & Pipeline Mapping", description: "Perform data-cleansing and preparation operations. Detail the methods used for preparation. Document the data pipeline used, from data collection and ingestion through data preparation." },
        { id: 3, key: "3-augmentation", title: "Augmentation & Enhancement Log", description: "Perform data augmentation and enhancement operations. Detail the methods used for augmentation. Document additions or modifications to the data pipeline for augmentation." },
        { id: 4, key: "3-labeling", title: "Labeling Strategy & Cost Analysis", description: "Perform data labeling as necessary for data. Detail method and approach used for data labeling and how the costs will scale as data-labeling needs increase. Document additions or modifications to the data pipeline for data labeling." }
    ],
    4: [
        { id: 1, key: "4-algorithm", title: "Algorithm Selection & Approach", description: "Select the appropriate algorithm and approach to be used for model development. If a generative AI, foundation model, or pretrained model will be used, see a later workbook task." },
        { id: 2, key: "4-ensemble", title: "Model Ensemble Configuration", description: "If an ensemble of models will be developed for this iteration, detail the configuration of that ensemble." },
        { id: 3, key: "4-automl", title: "AutoML Application strategy", description: "If you will use AutoML tools to accelerate model development, detail the tool(s) used and how they will be applied for this AI project iteration." },
        { id: 4, key: "4-pretrained", title: "Foundation Model Fine-Tuning", description: "If a pretrained model or foundation model will be used, detail which model(s) will be used and the method, if any, used to fine-tune the model for your specific AI project iteration." },
        { id: 5, key: "4-gen-ai", title: "Gen-AI API Costs & Limitations", description: "If needed, detail which generative AI approach will be used; if hosted through an API, detail the costs and limitations of the API." },
        { id: 6, key: "4-prompt", title: "Prompt Engineering Approach", description: "Determine the approach for prompt engineering to be used with the generative AI solution." },
        { id: 7, key: "4-chaining", title: "LLM Chaining & Post-Processing", description: "Determine the approach used, if any, to chain LLM or generative AI results to be used with additional resources or data sources of pre- or post-processing of generative AI/LLM results." },
        { id: 8, key: "4-validation", title: "Overfit/Underfit Validation", description: "Determine the approach used to validate the model and ensure that it does not overfit or underfit data and achieves desired machine learning objectives." },
        { id: 10, key: "4-hyperparameters", title: "Optimization & HP Tuning", description: "Document measurements of model fit against training, test, and validation data. Determine methods for hyperparameter optimization and perform optimization, documenting results." }
    ],
    5: [
        { id: 1, key: "5-performance", title: "Model Performance Audit", description: "Evaluate the model and produce evaluation measures including, as relevant, confusion matrices, ROC curves, and other assessments of model performance." },
        { id: 2, key: "5-business-kpi", title: "Business KPI Measurement", description: "Measure model performance against the business KPIs detailed in Phase I. If the model does not perform adequately, detail the steps needed to improve the KPI performance of the model in this iteration." },
        { id: 3, key: "5-tech-kpi", title: "Technology KPI Measurement", description: "Measure model performance against the technology KPIs detailed in Phase I. If the model does not perform adequately, detail the steps needed to improve the KPI performance of the model in this iteration." },
        { id: 4, key: "5-iteration", title: "Iterative Improvement Approach", description: "Detail approach that will be used to iterate this model to improve on any of the results in this phase. If any iteration is required to previous phases to improve the results, detail what previous phases need iteration." },
        { id: 5, key: "5-approvals", title: "Production Approval Governance", description: "Detail any required approvals or reviews to be conducted before the model can be operationalized in production." }
    ],
    6: [
        { id: 1, key: "6-mode", title: "Deployment Mode & Location", description: "How will this model be operationalized, and in what mode and location(s)?" },
        { id: 2, key: "6-it-process", title: "IT Operationalization Context", description: "What IT processes must be followed to operationalize the model as planned?" },
        { id: 3, key: "6-hybrid-activities", title: "Hybrid Non-Cognitive Activities", description: "What additional non-AI/noncognitive activities, such as application development should be done to operationalize this model as intended for this iteration?" },
        { id: 4, key: "6-monitoring", title: "Continuous Monitoring Strategy", description: "What continuous monitoring and management approach and tools will be used for the model in this iteration?" },
        { id: 5, key: "6-governance", title: "Governance & Ownership Structure", description: "Determine which group(s) will be responsible for governance and ownership of the model for this and future iterations, as well as the means by which the group will respond to various needs after this iteration." },
        { id: 6, key: "6-next-steps", title: "Next Iteration Planning", description: "What should be done in the next iteration for this AI project? What resources exist to pursue the next iteration?" },
        { id: 7, key: "6-post-mortem", title: "Iteration Post-Mortem Review", description: "Perform an iteration post-mortem. What went well during this iteration? What did not go well? What can be improved for future AI project iterations?" }
    ]
}
