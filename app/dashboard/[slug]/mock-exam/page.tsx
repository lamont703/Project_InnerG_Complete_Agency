"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
    ShieldCheck, 
    Timer, 
    Brain, 
    AlertCircle, 
    ChevronRight,
    Loader2,
    CheckCircle2,
    Zap,
    Sparkles,
    Sparkle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/browser"
import { cn } from "@/lib/utils"

import { MockExamSimulation } from "@/features/student/components/MockExamSimulation"

export default function MockExamPage() {
    const params = useParams()
    const router = useRouter()
    const slug = params?.slug as string
    
    const [mode, setMode] = useState<'briefing' | 'simulation' | 'results'>('briefing')
    const [isLoading, setIsLoading] = useState(true)
    const [isInitializing, setIsInitializing] = useState(false)
    const [passProb, setPassProb] = useState<string>("0%")
    const [isConfirmed, setIsConfirmed] = useState(false)
    const [hardwareChecked, setHardwareChecked] = useState(false)
    
    // Exam State
    const [examId, setExamId] = useState<string | null>(null)
    const [questions, setQuestions] = useState<any[]>([])
    const [startedAt, setStartedAt] = useState<string>("")
    const [results, setResults] = useState<any>(null)
    const [analysis, setAnalysis] = useState<any>(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    useEffect(() => {
        const loadMastery = async () => {
            try {
                const supabase = createBrowserClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                // Check for existing active exam
                const { data: activeExam } = await (supabase
                    .from('mock_exams' as any) as any)
                    .select('*')
                    .eq('student_id', user.id)
                    .eq('status', 'started')
                    .maybeSingle() as any
                
                if (activeExam) {
                    setExamId(activeExam.id)
                    setQuestions(activeExam.questions)
                    setStartedAt(activeExam.started_at)
                    setMode('simulation')
                }

                const { data: telemetry } = await fetch(`/api/barber/telemetry-context`).then(res => res.json())
                
                if (telemetry?.performance_telemetry_snapshot?.estimated_pass_probability) {
                    setPassProb(telemetry.performance_telemetry_snapshot.estimated_pass_probability)
                }
            } catch (err) {
                console.error("Failed to load neural forecast", err)
            } finally {
                setIsLoading(false)
            }
        }
        loadMastery()
    }, [])

    const handleStartExam = async () => {
        setIsInitializing(true)
        try {
            const supabase = createBrowserClient()
            const { data: { user } } = await supabase.auth.getUser()
            
            // Fetch project ID first
            const { data: project } = await supabase.from('projects').select('id').eq('slug', slug).single() as any

            const res = await fetch('/api/barber/mock-exam/initialize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    studentId: user?.id, 
                    projectId: project?.id,
                    predictedScore: passProb
                })
            }).then(r => r.json())

            if (res.success) {
                setExamId(res.examId)
                setQuestions(res.questions)
                setStartedAt(res.startedAt)
                setMode('simulation')
            }
        } catch (err) {
            console.error("Failed to start exam", err)
        } finally {
            setIsInitializing(false)
        }
    }

    const triggerAutopsy = async (examId: string) => {
        setIsAnalyzing(true)
        try {
            const res = await fetch('/api/barber/mock-exam/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ examId })
            }).then(r => r.json())

            if (res.success) {
                setAnalysis(res.analysis)
            }
        } catch (err) {
            console.error("Autopsy failed", err)
        } finally {
            setIsAnalyzing(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground text-sm font-black uppercase tracking-widest italic">Synchronizing Neural Forecast...</p>
            </div>
        )
    }

    if (mode === 'simulation' && examId && questions.length > 0) {
        return (
            <MockExamSimulation 
                examId={examId}
                initialQuestions={questions}
                startedAt={startedAt}
                onComplete={(res) => {
                    setResults(res)
                    setMode('results')
                    triggerAutopsy(examId)
                }}
                onAbandon={() => {
                    setMode('briefing')
                    setExamId(null)
                    setQuestions([])
                }}
            />
        )
    }

    if (mode === 'results') {
        const isPass = (results?.score || 0) >= 70
        return (
            <div className="min-h-screen bg-background p-6 md:p-12 lg:p-24 flex flex-col items-center max-w-6xl mx-auto pb-32">
                {/* Result Header */}
                <div className="flex flex-col items-center mb-16 text-center">
                    <div className={cn(
                        "h-24 w-24 rounded-full flex items-center justify-center mb-8 border-2 transition-all duration-1000 animate-pulse",
                        isPass ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" : "bg-rose-500/10 border-rose-500/40 text-rose-400"
                    )}>
                        {isPass ? <CheckCircle2 className="h-12 w-12" /> : <AlertCircle className="h-12 w-12" />}
                    </div>
                    <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-4">
                        Examination <span className={isPass ? "text-emerald-400" : "text-rose-400"}>{isPass ? "PASSED" : "FAILED"}</span>
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-md">
                        Simulation complete. Your final results have been benchmarked against PSI State Board standards.
                    </p>
                </div>

                {/* Score Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mb-12">
                    <div className="p-10 rounded-3xl glass-panel border border-border flex flex-col items-center justify-center relative overflow-hidden group">
                        <span className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground mb-4 relative z-10">Actual Score</span>
                        <span className="text-8xl font-black text-foreground tracking-tighter relative z-10">{results?.score}%</span>
                        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
                    </div>
                    
                    <div className="p-10 rounded-3xl glass-panel border border-border flex flex-col items-center justify-center bg-primary/5">
                        <span className="text-xs font-black uppercase tracking-[0.3em] text-primary mb-4">AI Predicted Variance</span>
                        <div className="flex items-center gap-4">
                            <span className="text-5xl font-black text-foreground">{passProb}</span>
                            <ChevronRight className="h-6 w-6 text-muted-foreground opacity-30" />
                            <span className="text-5xl font-black text-primary">{results?.score}%</span>
                        </div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mt-6 tracking-widest italic">
                            Accuracy Delta: {Math.abs(parseInt(passProb) - (results?.score || 0))}%
                        </p>
                    </div>
                </div>

                {/* AI Autopsy Section */}
                <div className="w-full">
                    {isAnalyzing ? (
                        <div className="p-12 rounded-3xl border border-dashed border-border bg-muted/5 flex flex-col items-center justify-center text-center">
                            <Loader2 className="h-10 w-10 animate-spin text-primary mb-6" />
                            <h3 className="text-xl font-bold text-foreground mb-2 italic">Gemini Pro is performing Autopsy...</h3>
                            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
                                Analyzing 100 questions for behavioral markers and hidden Board Risks.
                            </p>
                        </div>
                    ) : analysis ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                            <div className="p-10 rounded-[2.5rem] glass-panel border-l-8 border-l-primary bg-primary/[0.03] relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <Brain className="h-24 w-24 text-primary" />
                                </div>
                                <div className="flex items-center gap-3 mb-6">
                                    <Sparkles className="h-5 w-5 text-primary" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">High-Fidelity AI Diagnostic</span>
                                </div>
                                <h3 className="text-2xl font-bold text-foreground mb-4">Executive Summary</h3>
                                <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl italic">
                                    "{analysis.executive_summary}"
                                </p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="p-8 rounded-3xl bg-rose-500/5 border border-rose-500/10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <AlertCircle className="h-5 w-5 text-rose-500" />
                                        <h4 className="text-sm font-black uppercase tracking-widest text-rose-400 italic">State Board Risks</h4>
                                    </div>
                                    <ul className="space-y-4">
                                        {analysis.board_risks.map((risk: string, i: number) => (
                                            <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground leading-normal italic font-medium">
                                                <div className="h-1.5 w-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
                                                {risk}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <Zap className="h-5 w-5 text-emerald-500" />
                                        <h4 className="text-sm font-black uppercase tracking-widest text-emerald-400 italic">Certification Roadmap</h4>
                                    </div>
                                    <ul className="space-y-4">
                                        {analysis.certification_roadmap.map((step: string, i: number) => (
                                            <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground leading-normal italic font-medium">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                                                {step}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="mt-20 flex flex-col items-center gap-6">
                    <Button 
                        onClick={() => router.push(`/dashboard/${slug}`)}
                        className="h-16 px-12 rounded-2xl bg-foreground text-background hover:bg-foreground/90 transition-all font-black uppercase tracking-widest italic"
                    >
                        Return to Intelligence Hub
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background p-6 md:p-12 lg:p-24 flex flex-col items-center max-w-5xl mx-auto">
            {/* Header Area */}
            <div className="w-full mb-12 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-6">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4 uppercase italic">
                    State Barber <span className="text-primary font-light">Mock Exam</span>
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                    This is a certified 90-minute simulation of the Texas State Board Barber Exam. 
                    The Digital Proctor will track your accuracy, latency, and behavioral markers.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                {/* Neural Forecast Card */}
                <div className="p-8 rounded-3xl glass-panel border border-border relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <Brain className="h-5 w-5 text-primary" />
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Neural Readiness Forecast</span>
                        </div>
                        <div className="flex items-baseline gap-2 mb-4">
                            <span className="text-6xl font-black text-foreground tracking-tighter">{passProb}</span>
                            <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Pass Probability</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Based on your historical telemetry, the AI predicts a <span className="text-primary font-bold">{passProb}</span> success rate on today's blueprint.
                        </p>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-primary/10 transition-all duration-500" />
                </div>

                {/* Exam Protocol Card */}
                <div className="p-8 rounded-3xl glass-panel border border-border flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <Timer className="h-5 w-5 text-amber-400" />
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Certified Protocol</span>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5" />
                                <p className="text-sm text-foreground">90-Minute Continuous Timer</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5" />
                                <p className="text-sm text-foreground">100 PSI-Standard Questions</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5" />
                                <p className="text-sm text-foreground">No Answer Feedback (Proctor Mode)</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                        <p className="text-xs text-amber-500 uppercase font-black leading-normal">
                            Once started, the session cannot be paused. Closing the browser will result in a zero score.
                        </p>
                    </div>
                </div>
            </div>

            {/* Commitment Gate */}
            <div className="w-full mt-12 p-8 rounded-3xl border border-dashed border-border bg-muted/5 flex flex-col items-center">
                <h3 className="text-lg font-bold text-foreground mb-6">Ready to enter the Simulation?</h3>
                
                <div className="flex flex-col md:flex-row items-center gap-6 mb-10">
                    <button 
                        onClick={() => setHardwareChecked(!hardwareChecked)}
                        className="flex items-center gap-3 group transition-all"
                    >
                        <div className={cn(
                            "h-6 w-6 rounded-md border flex items-center justify-center transition-all",
                            hardwareChecked ? "bg-emerald-500 border-emerald-400 text-white" : "border-border bg-white/5"
                        )}>
                            {hardwareChecked && <CheckCircle2 className="h-4 w-4" />}
                        </div>
                        <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Stable Connection Verified</span>
                    </button>

                    <button 
                        onClick={() => setIsConfirmed(!isConfirmed)}
                        className="flex items-center gap-3 group transition-all"
                    >
                        <div className={cn(
                            "h-6 w-6 rounded-md border flex items-center justify-center transition-all",
                            isConfirmed ? "bg-emerald-500 border-emerald-400 text-white" : "border-border bg-white/5"
                        )}>
                            {isConfirmed && <CheckCircle2 className="h-4 w-4" />}
                        </div>
                        <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">I accept the 90-minute protocol</span>
                    </button>
                </div>

                <Button 
                    disabled={!isConfirmed || !hardwareChecked || isInitializing}
                    onClick={handleStartExam}
                    className="w-full max-w-md h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/20 group transition-all active:scale-95"
                >
                    <div className="flex items-center gap-3">
                        {isInitializing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5 fill-current" />}
                        <span className="text-sm font-black uppercase tracking-widest italic">
                            {isInitializing ? "Assembling Blueprint..." : "Initialize Mock Exam Simulation"}
                        </span>
                    </div>
                    {!isInitializing && <ChevronRight className="h-5 w-5 ml-4 group-hover:translate-x-1 transition-transform" />}
                </Button>
            </div>
        </div>
    )
}
