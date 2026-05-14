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
    const [showMap, setShowMap] = useState(false)

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
        if (!confirm("Submit Examination? You will not be able to change your answers after this point.")) return
        
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
    
    return (
        <div className="min-h-screen bg-background flex flex-col lg:flex-row overflow-hidden relative">
            {/* Mobile Header */}
            <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-background sticky top-0 z-50">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Question</span>
                    <span className="text-xl font-black italic">{currentIndex + 1} / {initialQuestions.length}</span>
                </div>
                <div className={cn(
                    "px-4 py-2 rounded-xl flex items-center gap-2",
                    timeLeft < 300 ? "bg-rose-500/10 text-rose-500 animate-pulse" : "bg-muted text-foreground"
                )}>
                    <Timer className="h-4 w-4" />
                    <span className="text-lg font-black tabular-nums">{formatTime(timeLeft)}</span>
                </div>
            </div>

            {/* Main Question Area */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 pb-32 lg:pb-12">
                <div className="max-w-3xl mx-auto space-y-8">
                    {/* Progress Bar (Desktop only) */}
                    <div className="hidden lg:block w-full h-1 bg-muted rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-primary transition-all duration-300" 
                            style={{ width: `${((currentIndex + 1) / initialQuestions.length) * 100}%` }}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                            <span className="text-xs font-black uppercase tracking-widest text-primary italic">
                                {currentQuestion.domain.replace(/_/g, ' ')}
                            </span>
                        </div>
                        <button 
                            onClick={toggleFlag}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-bold uppercase tracking-widest",
                                flagged.has(currentQuestion.id) 
                                    ? "bg-amber-500/10 border-amber-500/40 text-amber-500" 
                                    : "bg-muted/10 border-border text-muted-foreground hover:bg-muted/20"
                            )}
                        >
                            <Flag className={cn("h-3.5 w-3.5", flagged.has(currentQuestion.id) && "fill-current")} />
                            {flagged.has(currentQuestion.id) ? "Flagged" : "Flag"}
                        </button>
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-xl md:text-3xl font-bold text-foreground leading-tight">
                            {currentQuestion.question}
                        </h2>

                        <div className="grid grid-cols-1 gap-3">
                            {currentQuestion.options.map((option: string, index: number) => (
                                <button
                                    key={index}
                                    onClick={() => handleAnswerSelect(index)}
                                    className={cn(
                                        "p-4 md:p-6 rounded-2xl border-2 text-left transition-all group relative overflow-hidden",
                                        answers[currentQuestion.id]?.answer_index === index
                                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                                            : "border-border hover:border-primary/40 bg-background"
                                    )}
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className={cn(
                                            "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-colors",
                                            answers[currentQuestion.id]?.answer_index === index
                                                ? "bg-primary text-white"
                                                : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                        )}>
                                            {String.fromCharCode(65 + index)}
                                        </div>
                                        <span className={cn(
                                            "text-base md:text-lg font-medium",
                                            answers[currentQuestion.id]?.answer_index === index ? "text-foreground" : "text-muted-foreground"
                                        )}>
                                            {option}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-8 border-t border-border">
                        <Button
                            variant="ghost"
                            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentIndex === 0}
                            className="h-12 px-4 md:px-6 rounded-xl font-black uppercase tracking-widest italic"
                        >
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            <span className="hidden md:inline">Previous</span>
                        </Button>
                        <div className="flex items-center gap-4">
                             <span className="text-[10px] font-black text-muted-foreground tracking-widest uppercase italic hidden md:block">
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
                                className="h-12 px-6 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-black uppercase tracking-widest italic"
                            >
                                {currentIndex === initialQuestions.length - 1 ? "Submit Exam" : "Next"}
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Mobile Question Map Trigger */}
            <button 
                onClick={() => setShowMap(true)}
                className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 h-14 px-8 rounded-full bg-foreground text-background shadow-2xl z-50 flex items-center gap-3 font-black uppercase tracking-widest italic animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
                <ShieldCheck className="h-4 w-4" />
                Question Map
            </button>

            {/* Mobile Map Overlay */}
            {showMap && (
                <div className="lg:hidden fixed inset-0 bg-background/95 backdrop-blur-sm z-[100] p-6 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black uppercase italic tracking-widest">Question Map</h3>
                        <Button variant="ghost" onClick={() => setShowMap(false)} className="rounded-full h-12 w-12 p-0">
                            ✕
                        </Button>
                    </div>
                    <div className="grid grid-cols-6 gap-2 overflow-y-auto max-h-[60vh] pb-8">
                        {initialQuestions.map((q, i) => (
                            <button
                                key={q.id}
                                onClick={() => {
                                    setCurrentIndex(i)
                                    setShowMap(false)
                                }}
                                className={cn(
                                    "aspect-square rounded-xl text-xs font-black flex items-center justify-center transition-all border",
                                    currentIndex === i ? "border-primary bg-primary text-white" :
                                    answers[q.id] ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" :
                                    flagged.has(q.id) ? "bg-amber-500/10 border-amber-500/30 text-amber-600" :
                                    "bg-background border-border text-muted-foreground"
                                )}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                    <div className="pt-8 border-t border-border space-y-4">
                         <Button 
                            onClick={() => { setShowMap(false); handleFinalSubmit(); }}
                            className="w-full bg-primary hover:bg-primary/90 text-white h-14 rounded-2xl font-black uppercase tracking-widest italic"
                        >
                            Submit Examination
                        </Button>
                        <p className="text-[10px] text-center text-muted-foreground font-bold uppercase tracking-widest italic">
                            Select a number to jump to that question
                        </p>
                    </div>
                </div>
            )}

            {/* Desktop Question Navigator */}
            <aside className="hidden lg:flex w-[400px] border-l border-border bg-background flex-col h-screen overflow-hidden">
                <div className="p-8 flex flex-col gap-8">
                    <div className="flex items-center justify-between">
                        <h3 className="font-black uppercase tracking-widest italic text-sm text-muted-foreground">Proctor Console</h3>
                        <div className={cn(
                            "px-4 py-2 rounded-xl flex items-center gap-2",
                            timeLeft < 300 ? "bg-rose-500/10 text-rose-500 animate-pulse" : "bg-muted text-foreground"
                        )}>
                            <Timer className="h-4 w-4" />
                            <span className="text-xl font-black tabular-nums">{formatTime(timeLeft)}</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-muted-foreground">
                            <span>Exam Progress</span>
                            <span>{currentIndex + 1} / {initialQuestions.length}</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-primary transition-all duration-300" 
                                style={{ width: `${((currentIndex + 1) / initialQuestions.length) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-muted/30">
                    <div className="grid grid-cols-5 gap-2">
                        {initialQuestions.map((q, i) => (
                            <button
                                key={q.id}
                                onClick={() => setCurrentIndex(i)}
                                className={cn(
                                    "aspect-square rounded-xl text-xs font-black flex items-center justify-center transition-all border",
                                    currentIndex === i ? "border-primary bg-primary text-white scale-110 z-10 shadow-lg shadow-primary/20" :
                                    answers[q.id] ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" :
                                    flagged.has(q.id) ? "bg-amber-500/10 border-amber-500/30 text-amber-600" :
                                    "bg-background border-border text-muted-foreground hover:border-primary/40"
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
                        disabled={isSubmitting}
                        className="w-full bg-primary hover:bg-primary/90 text-white h-12 rounded-xl font-black uppercase tracking-widest italic"
                    >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
        </div>
    )
}
