"use client"

import { useState, useEffect, useCallback } from "react"
import { 
    ShieldCheck, 
    Timer, 
    Flag, 
    ChevronLeft, 
    ChevronRight, 
    CheckCircle2,
    AlertCircle,
    Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createBrowserClient } from "@/lib/supabase/browser"

interface Question {
    id: string
    question: string
    options: string[]
    correct_answer: number
    domain: string
}

interface MockExamSimulationProps {
    examId: string
    initialQuestions: Question[]
    startedAt: string
    onComplete: (results: any) => void
    onAbandon: () => void
}

export function MockExamSimulation({ examId, initialQuestions, startedAt, onComplete, onAbandon }: MockExamSimulationProps) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, any>>({})
    const [flagged, setFlagged] = useState<Set<string>>(new Set())
    const [timeLeft, setTimeLeft] = useState(90 * 60) // 90 minutes in seconds
    const [isSubmitting, setIsSubmitting] = useState(false)

    // 1. Timer Logic (Synced to Server Start Time)
    useEffect(() => {
        const start = new Date(startedAt).getTime()
        const end = start + (90 * 60 * 1000)

        const interval = setInterval(() => {
            const now = new Date().getTime()
            const remaining = Math.max(0, Math.floor((end - now) / 1000))
            setTimeLeft(remaining)

            if (remaining <= 0) {
                clearInterval(interval)
                handleFinalSubmit()
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [startedAt])

    // 2. Persistent Sync (Save answers to Supabase)
    const syncAnswer = async (questionId: string, answerIndex: number, isFlagged: boolean) => {
        const supabase = createBrowserClient()
        const currentAnswers = { ...answers }
        currentAnswers[questionId] = { answer_index: answerIndex, flagged: isFlagged, updated_at: new Date().toISOString() }
        
        await (supabase
            .from('mock_exams' as any) as any)
            .update({
                answers: currentAnswers
            })
            .eq('id', examId)
    }

    const handleAnswerSelect = (index: number) => {
        const questionId = initialQuestions[currentIndex].id
        const isFlagged = flagged.has(questionId)
        const newAnswerObj = { answer_index: index, flagged: isFlagged, updated_at: new Date().toISOString() }
        
        const newAnswers = { ...answers, [questionId]: newAnswerObj }
        setAnswers(newAnswers)
        syncAnswer(questionId, index, isFlagged)
    }

    const toggleFlag = () => {
        const questionId = initialQuestions[currentIndex].id
        const newFlagged = new Set(flagged)
        if (newFlagged.has(questionId)) newFlagged.delete(questionId)
        else newFlagged.add(questionId)
        setFlagged(newFlagged)
        syncAnswer(questionId, answers[questionId]?.answer_index, newFlagged.has(questionId))
    }

    const handleFinalSubmit = async () => {
        setIsSubmitting(true)
        try {
            const supabase = createBrowserClient()
            
            // Calculate final score server-side or locally
            let score = 0
            initialQuestions.forEach(q => {
                if (answers[q.id]?.answer_index === q.correct_answer) score++
            })

            const { error } = await (supabase
                .from('mock_exams' as any) as any)
                .update({
                    status: 'completed',
                    ended_at: new Date().toISOString(),
                    final_score: score
                })
                .eq('id', examId)

            if (error) throw error
            onComplete({ score, total: initialQuestions.length })
        } catch (err: any) {
            console.error("❌ [CRITICAL] Submission failed:", {
                error: err,
                message: err.message,
                details: err.details,
                hint: err.hint,
                examId: examId
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleAbandon = async () => {
        if (confirm("Terminate Simulation? This attempt will be marked as ABANDONED and your current progress will not be scored.")) {
            try {
                const supabase = createBrowserClient()
                await (supabase
                    .from('mock_exams' as any) as any)
                    .update({ status: 'abandoned', ended_at: new Date().toISOString() })
                    .eq('id', examId)
                
                onAbandon()
            } catch (err) {
                console.error("Failed to abandon exam", err)
            }
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const currentQuestion = initialQuestions[currentIndex]
    const progress = (Object.keys(answers).length / initialQuestions.length) * 100

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            {/* Left Sidebar: Question Navigator */}
            <aside className="w-80 border-r border-border bg-muted/5 flex flex-col hidden md:flex">
                <div className="p-6 border-b border-border bg-background">
                    <div className="flex items-center gap-3 mb-6">
                        <Timer className={cn("h-5 w-5", timeLeft < 300 ? "text-rose-500 animate-pulse" : "text-primary")} />
                        <span className={cn("text-2xl font-black tracking-tighter", timeLeft < 300 && "text-rose-500")}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                            <span>Completion</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-primary transition-all duration-500" 
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="grid grid-cols-5 gap-2">
                        {initialQuestions.map((q, i) => (
                            <button
                                key={q.id}
                                onClick={() => setCurrentIndex(i)}
                                className={cn(
                                    "h-10 w-10 rounded-lg text-xs font-bold transition-all border",
                                    currentIndex === i ? "border-primary ring-2 ring-primary/20 bg-primary/10 text-primary" : 
                                    flagged.has(q.id) ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400" :
                                    answers[q.id] !== undefined ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" :
                                    "border-border hover:border-muted-foreground/30 text-muted-foreground"
                                )}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-border bg-background space-y-3">
                    <Button 
                        onClick={handleFinalSubmit}
                        className="w-full bg-primary hover:bg-primary/90 text-white h-12 rounded-xl font-black uppercase tracking-widest italic"
                    >
                        Submit Examination
                    </Button>
                    <Button 
                        variant="ghost"
                        onClick={handleAbandon}
                        className="w-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/5 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all"
                    >
                        Terminate Simulation
                    </Button>
                </div>
            </aside>

            {/* Main Question Area */}
            <main className="flex-1 flex flex-col h-full relative">
                <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 max-w-3xl mx-auto w-full">
                    <div className="w-full mb-8 flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground italic">
                            Domain: {currentQuestion.domain.replace(/_/g, ' ')}
                        </span>
                        <button 
                            onClick={toggleFlag}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-xs font-bold uppercase tracking-widest",
                                flagged.has(currentQuestion.id) 
                                    ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400" 
                                    : "bg-muted/10 border-border text-muted-foreground hover:bg-muted/20"
                            )}
                        >
                            <Flag className={cn("h-4 w-4", flagged.has(currentQuestion.id) && "fill-current")} />
                            {flagged.has(currentQuestion.id) ? "Flagged for Review" : "Flag for Review"}
                        </button>
                    </div>

                    <div className="w-full space-y-10">
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                            {currentQuestion.question}
                        </h2>

                        <div className="grid grid-cols-1 gap-4">
                            {currentQuestion.options.map((option, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswerSelect(idx)}
                                    className={cn(
                                        "p-6 rounded-2xl border text-left transition-all duration-300 group relative overflow-hidden",
                                        answers[currentQuestion.id] === idx 
                                            ? "bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" 
                                            : "glass-panel border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className={cn(
                                            "h-8 w-8 rounded-full border flex items-center justify-center text-xs font-bold transition-all",
                                            answers[currentQuestion.id] === idx 
                                                ? "bg-white text-primary border-white" 
                                                : "border-border bg-white/5 group-hover:border-primary/40 group-hover:bg-primary/5"
                                        )}>
                                            {String.fromCharCode(65 + idx)}
                                        </div>
                                        <span className="text-lg font-medium">{option}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="w-full mt-12 flex items-center justify-between gap-6">
                        <Button
                            variant="ghost"
                            disabled={currentIndex === 0}
                            onClick={() => setCurrentIndex(prev => prev - 1)}
                            className="h-14 px-8 rounded-2xl border border-border text-muted-foreground hover:bg-muted/10 transition-all"
                        >
                            <ChevronLeft className="mr-2 h-5 w-5" />
                            Previous
                        </Button>
                        <span className="text-xs font-black text-muted-foreground tracking-widest uppercase italic">
                            Question {currentIndex + 1} of {initialQuestions.length}
                        </span>
                        <Button
                            onClick={() => {
                                if (currentIndex < initialQuestions.length - 1) {
                                    setCurrentIndex(prev => prev + 1)
                                } else {
                                    handleFinalSubmit()
                                }
                            }}
                            className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-white transition-all shadow-xl shadow-primary/10"
                        >
                            {currentIndex === initialQuestions.length - 1 ? "Submit Exam" : "Next Question"}
                            <ChevronRight className="ml-2 h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    )
}
