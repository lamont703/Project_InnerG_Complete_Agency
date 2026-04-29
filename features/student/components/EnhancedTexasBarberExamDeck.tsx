"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  BookOpen, 
  ShieldCheck,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createBrowserClient } from "@/lib/supabase/browser"

type QuestionOption = {
  id: string
  text: string
  isCorrect: boolean
}

type Question = {
  id: string
  category: string
  rawDomain: string
  question: string
  options: QuestionOption[]
  metadata: {
    source: string
    reasoning: string
  }
}




interface EnhancedTexasBarberExamDeckProps {
    projectSlug: string;
}

export function EnhancedTexasBarberExamDeck({ projectSlug }: EnhancedTexasBarberExamDeckProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [gameState, setGameState] = useState<"intro" | "active" | "feedback" | "finished">("intro")
  const [score, setScore] = useState(0)

  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [userId, setUserId] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string>("")
  const [questionStartTime, setQuestionStartTime] = useState<number>(0)
  const [hasChangedAnswer, setHasChangedAnswer] = useState(false)

  useEffect(() => {
     setSessionId(crypto.randomUUID())
  }, [])

  const fetchQuestions = async () => {
    setIsLoading(true)
    try {
      const supabase = createBrowserClient()
      
      // 1. Fetch Questions
      const { data, error } = await supabase
        .from("question_bank")
        .select("*")
        .eq("is_active", true)

      // 2. Fetch User & School Association
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
         setUserId(session.user.id)
         
         // Fetch the school_id associated with this project architecture
         const { data: projectData } = await (supabase.from("projects") as any)
            .select("school_id")
            .eq("slug", projectSlug)
            .single()
         
         if (projectData?.school_id) {
            setSchoolId(projectData.school_id)
         }
      }

      if (error || !data) {
        console.error("Error fetching questions:", error)
        setQuestions([])
        return
      }

      // Shuffle logic
      const shuffledData = [...data].sort(() => 0.5 - Math.random())
      const selected = shuffledData.slice(0, 10) // exactly 10

      const mapped: Question[] = selected.map((q: any) => {
        let opts = q.options
        if (typeof opts === 'string') {
           try { opts = JSON.parse(opts) } catch(e){}
        }
        if (typeof opts === 'string') {
           try { opts = JSON.parse(opts) } catch(e){}
        }
        
        const mappedOptions = (Array.isArray(opts) ? opts : []).map((optText: string, idx: number) => ({
          id: String.fromCharCode(97 + idx),
          text: optText,
          isCorrect: idx === q.correct_index
        }))

        const cat = q.domain.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')

        return {
          id: q.id,
          category: cat,
          rawDomain: q.domain,
          question: q.question,
          options: mappedOptions,
          metadata: {
            source: q.source_ref,
            reasoning: q.explanation
          }
        }
      })

      setQuestions(mapped)
    } catch (err) {
      console.error("Unexpected error fetching questions", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchQuestions()
  }, [])

  const currentQuestion = questions[currentIndex]
  const isCorrect = currentQuestion?.options.find(o => o.id === selectedOptionId)?.isCorrect

  const handleOptionSelect = (optionId: string) => {
    if (gameState === "feedback") return
    if (selectedOptionId && selectedOptionId !== optionId) {
        setHasChangedAnswer(true)
    }
    setSelectedOptionId(optionId)
  }

  const handleSubmit = async () => {
    if (!selectedOptionId) return
    const timeSpentMs = Date.now() - questionStartTime
    const correct = isCorrect || false

    if (correct) setScore(prev => prev + 1)
    setGameState("feedback")

    if (!userId) {
        console.warn("TELEMETRY BLOCKED: No authenticated user session found. Cannot track anonymous data.");
    } else if (!currentQuestion?.rawDomain) {
        console.warn("TELEMETRY BLOCKED: Question is missing a rawDomain mapping.");
    } else if (!projectSlug) {
        console.warn("TELEMETRY BLOCKED: Missing projectSlug in portal instance.");
    }

    if (userId && currentQuestion?.rawDomain && projectSlug) {
        console.log(`Firing telemetry signal for User: ${userId} | Domain: ${currentQuestion.rawDomain}`);
        const supabase = createBrowserClient();
        (supabase.from("barber_exam_telemetry") as any).insert({
            student_id: userId,
            school_id: schoolId,
            portal_slug: projectSlug,
            question_id: currentQuestion.id,
            domain: currentQuestion.rawDomain,
            is_correct: correct,
            time_spent_ms: timeSpentMs,
            changed_answer: hasChangedAnswer,
            session_id: sessionId
        }).then(({error}: any) => {
            if (error) {
                console.error("Supabase RLS or Insert Error:", error);
            } else {
                console.log("Telemetry securely recorded.");
            }
        }).catch((err: any) => console.error("Telemetry Exception:", err));
    }
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedOptionId(null)
      setHasChangedAnswer(false)
      setQuestionStartTime(Date.now())
      setGameState("active")
    } else {
      setGameState("finished")
    }
  }

  const handleReset = () => {
    setCurrentIndex(0)
    setSelectedOptionId(null)
    setGameState("intro")
    setScore(0)
    setHasChangedAnswer(false)
    setSessionId(crypto.randomUUID())
    fetchQuestions()
  }

  const handleStart = () => {
    setGameState("active")
    setQuestionStartTime(Date.now())
    setHasChangedAnswer(false)
  }

  if (isLoading || questions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-background/50 space-y-4 relative overflow-hidden">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Synthesizing Exam Intelligence...</p>
      </div>
    )
  }


  return (
    <div className="flex-1 flex flex-col h-full bg-background/50 relative overflow-hidden">
        {/* Background ambient depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.02] via-transparent to-primary/[0.02] pointer-events-none" />
        
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4 lg:p-12 relative z-10 overflow-y-auto no-scrollbar">
            
            {/* Header Stats */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 px-2 gap-6">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Sovereign Intelligence Deck™</span>
                    </div>
                    <h1 className="text-2xl lg:text-4xl font-black italic uppercase tracking-tighter text-foreground leading-none">
                        Barber Prep Hub
                    </h1>
                </div>
                {gameState !== "intro" && (
                <div className="flex items-center gap-3 lg:gap-6 w-full sm:w-auto">
                    <div className="glass-panel px-4 lg:px-6 py-2 lg:py-3 rounded-2xl flex-1 sm:flex-none text-center">
                        <span className="text-[10px] block font-black uppercase text-muted-foreground mb-1">Progress</span>
                        <span className="text-sm lg:text-lg font-black text-foreground">{currentIndex + 1} / {questions.length}</span>
                    </div>
                    <div className="bg-primary text-white px-4 lg:px-6 py-2 lg:py-3 rounded-2xl shadow-lg shadow-primary/20 flex-1 sm:flex-none text-center">
                        <span className="text-[10px] block font-black uppercase text-white/60 mb-1">Score</span>
                        <span className="text-sm lg:text-lg font-black">{score}</span>
                    </div>
                </div>
                )}
            </div>

            <AnimatePresence mode="wait">
                {gameState === "intro" ? (
                  <motion.div
                      key="intro"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex-1 glass-panel rounded-[2rem] md:rounded-[2.5rem] lg:rounded-[3rem] p-6 md:p-14 lg:p-20 flex flex-col items-center justify-center text-center space-y-8 border border-primary/10 relative overflow-hidden"
                  >
                      <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
                      <div className="h-20 w-20 md:h-24 md:w-24 rounded-full bg-primary/10 flex items-center justify-center shadow-inner relative">
                        <Sparkles className="h-10 w-10 md:h-12 md:w-12 text-primary" />
                      </div>
                      <div className="space-y-4 md:space-y-6 max-w-2xl mx-auto">
                         <h2 className="text-3xl md:text-5xl lg:text-6xl font-black uppercase italic tracking-tighter leading-none text-foreground">
                             Intelligence <span className="text-primary">Audit</span>
                         </h2>
                         <p className="text-muted-foreground font-medium text-sm md:text-base lg:text-lg leading-relaxed">
                            This 10-cycle audit analyzes your domain mastery and decision latency across the Texas Board framework. 
                            Your response time and behavioral pivots are recorded securely to build your predictive mastery profile.
                         </p>
                      </div>
                      <Button 
                          onClick={handleStart}
                          className="mt-8 h-16 md:h-20 px-8 md:px-12 bg-primary text-white hover:bg-primary/90 text-sm md:text-lg font-black uppercase tracking-[0.2em] md:tracking-[0.4em] rounded-[1.5rem] md:rounded-[2rem] transition-all shadow-2xl shadow-primary/30 flex items-center"
                      >
                          Begin Knowledge Audit
                          <ArrowRight className="ml-3 h-5 w-5 md:h-6 md:w-6" />
                      </Button>
                  </motion.div>
                ) : gameState === "finished" ? (
                <motion.div
                    key="finished"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    className="flex-1 glass-panel rounded-[2rem] md:rounded-[2.5rem] lg:rounded-[3rem] xl:rounded-[4rem] p-6 md:p-14 lg:p-20 xl:p-32 flex flex-col items-center justify-center text-center space-y-8 md:space-y-12 lg:space-y-10 xl:space-y-16 border border-primary/10"
                >
                    <div className="h-16 w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 xl:h-32 xl:w-32 rounded-full bg-primary/10 flex items-center justify-center shadow-inner relative">
                    <ShieldCheck className="h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 xl:h-16 xl:w-16 text-primary" />
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                    </div>
                     <div className="space-y-4 md:space-y-6 lg:space-y-8">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black uppercase italic tracking-tighter text-foreground leading-none">
                            Audit Cycle Complete
                        </h2>
                        <p className="text-muted-foreground font-medium text-sm md:text-base lg:text-lg xl:text-xl leading-relaxed max-w-sm md:max-w-md lg:max-w-lg mx-auto">
                            Performance identified at <span className="text-primary font-black text-2xl md:text-3xl lg:text-4xl px-2">{Math.round((score / questions.length) * 100)}%</span> strategy compliance.
                        </p>
                    </div>
                    
                    <div className="flex flex-col gap-4 md:gap-5 w-full max-w-[280px] sm:max-w-xs md:max-w-sm lg:max-w-md px-4 md:px-0">
                        <Button 
                            onClick={handleReset} 
                            variant="outline" 
                            className="h-14 md:h-16 lg:h-18 w-full text-[10px] sm:text-xs md:text-sm lg:text-base font-black uppercase tracking-wider md:tracking-widest rounded-2xl border-2 hover:bg-muted/50 transition-all px-4 md:px-8 whitespace-normal leading-tight flex items-center justify-center text-center"
                        >
                            Synthesize Next Cycle
                        </Button>
                        <Button 
                            onClick={() => router.push(`/dashboard/${projectSlug}/metrics`)}
                            className="h-14 md:h-16 lg:h-18 w-full bg-primary text-white hover:bg-primary/90 text-[10px] sm:text-xs md:text-sm lg:text-base font-black uppercase tracking-wider md:tracking-widest rounded-2xl transition-all shadow-xl shadow-primary/20 px-4 md:px-8 whitespace-normal leading-tight flex items-center justify-center text-center"
                        >
                            Analyze Learning Gaps
                        </Button>
                    </div>
                </motion.div>
                ) : (
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ type: "spring", damping: 30, stiffness: 200 }}
                    className="flex-1 flex flex-col"
                >
                    <div className="flex-1 glass-panel rounded-[2rem] lg:rounded-[4rem] p-5 lg:p-14 border border-primary/5 flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 right-0 h-32 lg:h-64 w-32 lg:w-64 bg-primary/5 rounded-bl-[5rem] lg:rounded-bl-[10rem] -mr-10 lg:-mr-20 -mt-10 lg:-mt-20 group-hover:bg-primary/10 transition-all duration-700" />
                    
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-6 lg:mb-10">
                            <div className="h-8 lg:h-10 w-8 lg:w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <BookOpen className="h-4 lg:h-5 w-4 lg:w-5 text-primary" />
                            </div>
                            <span className="text-[10px] lg:text-xs font-black uppercase tracking-[0.4em] text-primary">{currentQuestion.category}</span>
                        </div>

                        <h3 className="text-xl lg:text-4xl font-black text-foreground leading-[1.1] lg:leading-[1.05] tracking-tight mb-8 lg:mb-12">
                            {currentQuestion.question}
                        </h3>

                        <div className="space-y-3 lg:space-y-4 flex-1">
                            {currentQuestion.options.map((option) => {
                            const isSelected = selectedOptionId === option.id
                            const isShownFeedback = gameState === "feedback"
                            
                            return (
                                <button
                                key={option.id}
                                onClick={() => handleOptionSelect(option.id)}
                                disabled={gameState === "feedback"}
                                className={cn(
                                    "w-full text-left p-4 lg:p-8 rounded-[1.5rem] lg:rounded-[2rem] border-2 transition-all duration-500 flex items-start gap-4 lg:gap-6",
                                    isSelected && !isShownFeedback ? "border-primary bg-primary/5 translate-x-1 ring-2 ring-primary/5" : "border-border hover:border-primary/50 bg-background/50 hover:translate-x-1",
                                    isShownFeedback && option.isCorrect && "border-emerald-500 bg-emerald-500/10 translate-x-2 shadow-lg shadow-emerald-500/10",
                                    isShownFeedback && isSelected && !option.isCorrect && "border-rose-500 bg-rose-500/10 opacity-100",
                                    isShownFeedback && !option.isCorrect && !isSelected && "opacity-40 grayscale scale-[0.98]"
                                )}
                                >
                                    <div className={cn(
                                        "mt-1 h-5 lg:h-7 w-5 lg:w-7 rounded-lg lg:rounded-xl border-2 flex items-center justify-center shrink-0 transition-all duration-300",
                                        isSelected ? "border-primary bg-primary scale-110 shadow-lg shadow-primary/50" : "border-border"
                                    )}>
                                        {isSelected && <div className="h-1.5 lg:h-2 w-1.5 lg:w-2 bg-white rounded-full" />}
                                    </div>
                                    <span className="text-sm lg:text-xl font-bold text-foreground leading-tight">
                                    {option.text}
                                    </span>
                                </button>
                            )
                            })}
                        </div>

                        <div className="mt-12">
                            {gameState === "active" ? (
                            <Button
                                onClick={handleSubmit}
                                disabled={!selectedOptionId}
                                className="w-full bg-foreground text-background hover:bg-primary hover:text-white h-16 lg:h-24 text-sm lg:text-lg font-black uppercase tracking-[0.4em] rounded-[1.5rem] lg:rounded-[2rem] transition-all shadow-2xl disabled:opacity-30"
                            >
                                Submit Signal
                                <ChevronRight className="ml-2 h-5 lg:h-6 w-5 lg:w-6" />
                            </Button>
                            ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-8"
                            >
                                <div className={cn(
                                    "rounded-[2rem] lg:rounded-[2.5rem] p-6 lg:p-10 border-2",
                                    isCorrect ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20"
                                )}>
                                    <div className="flex items-center gap-4 lg:gap-5 mb-4 lg:mb-6">
                                        <div className={cn(
                                            "h-10 lg:h-14 w-10 lg:w-14 rounded-full flex items-center justify-center shadow-2xl",
                                            isCorrect ? "bg-emerald-500 shadow-emerald-500/30" : "bg-rose-500 shadow-rose-500/30"
                                        )}>
                                            {isCorrect ? <CheckCircle2 className="h-6 lg:h-8 w-6 lg:w-8 text-white" /> : <XCircle className="h-6 lg:h-8 w-6 lg:w-8 text-white" />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={cn("text-[10px] lg:text-xs font-black uppercase tracking-[0.3em]", isCorrect ? "text-emerald-500" : "text-rose-500")}>Signal Audit</span>
                                            <span className="text-lg lg:text-2xl font-black uppercase italic tracking-tighter text-foreground">
                                                {isCorrect ? "Strategic Alignment" : "Technical Divergence"}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-sm lg:text-lg text-muted-foreground font-medium leading-relaxed mb-6 lg:mb-8">
                                        {currentQuestion.metadata.reasoning}
                                    </p>
                                    <div className="flex items-center gap-3 text-[10px] font-black uppercase text-muted-foreground glass-panel w-fit px-4 lg:px-6 py-2 lg:py-2.5 rounded-full border border-primary/10">
                                        <BookOpen className="h-3 w-3 text-primary" />
                                        Protocol: {currentQuestion.metadata.source}
                                    </div>
                                </div>

                                <Button
                                    onClick={handleNext}
                                    className="w-full bg-primary text-white hover:bg-primary/90 h-16 lg:h-24 text-sm lg:text-lg font-black uppercase tracking-[0.4em] rounded-[1.5rem] lg:rounded-[2rem] transition-all shadow-2xl shadow-primary/20"
                                >
                                    Next Signal
                                    <ArrowRight className="ml-2 h-5 lg:h-6 w-5 lg:w-6" />
                                </Button>
                            </motion.div>
                            )}
                        </div>
                    </div>
                    </div>
                </motion.div>
                )}
            </AnimatePresence>

            {/* Footer Guidance */}
            <div className="mt-16 text-center space-y-4 pb-12">
                <div className="flex items-center justify-center gap-3 text-primary/60">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.5em]">Institutional Accreditation Guardrails</span>
                </div>
            </div>
        </div>

        <style jsx global>{`
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .no-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
        `}</style>
    </div>
  )
}
