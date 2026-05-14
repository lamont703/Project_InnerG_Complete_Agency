"use client"

import { useState, useEffect, useRef } from "react"
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
  Loader2,
  Lock,
  Unlock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createBrowserClient } from "@/lib/supabase/browser"
import {
  trackExamSessionStart,
  trackExamAnswerSubmitted,
  trackExamSessionComplete,
  trackExamRetake
} from "@/lib/analytics"

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
  psiQuestion?: string
  aiGenerated?: boolean
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
  const [isPsiMode, setIsPsiMode] = useState(false)

  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessingAI, setIsProcessingAI] = useState(false)

  const [userId, setUserId] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string>("")
  const [questionStartTime, setQuestionStartTime] = useState<number>(0)
  const [hasChangedAnswer, setHasChangedAnswer] = useState(false)
  const [cognitiveInsight, setCognitiveInsight] = useState<string | null>(null)
  const activeRequestRef = useRef<boolean>(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
     setSessionId(crypto.randomUUID())
  }, [])

  const fetchQuestions = async () => {
    setIsLoading(true)
    try {
      const supabase = createBrowserClient()
      
      // 1. Fetch Questions (Now including psi_syntax_text)
      const { data, error } = await supabase
        .from("question_bank")
        .select("*")
        .eq("is_active", true)

      // 2. Fetch User & School Association
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
         setUserId(session.user.id)
         
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

      // Shuffle and select exactly 10
      const shuffledData = [...data].sort(() => 0.5 - Math.random())
      const selected = shuffledData.slice(0, 10)

      const mapped: Question[] = selected.map((q: any) => {
        let opts = q.options
        if (typeof opts === 'string') {
           try { opts = JSON.parse(opts) } catch(e){}
        }
        
        const correctIdx = q.correct_answer_index !== undefined ? q.correct_answer_index : q.correct_index;
        const mappedOptions = (Array.isArray(opts) ? opts : []).map((optText: string, idx: number) => ({
          id: String.fromCharCode(97 + idx),
          text: optText,
          isCorrect: idx === correctIdx
        }))

        const cat = q.domain.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')

        return {
          id: q.id,
          category: cat,
          rawDomain: q.domain,
          question: q.question,
          psiQuestion: q.psi_syntax_text,
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

    trackExamAnswerSubmitted({
      question_index: currentIndex,
      domain: currentQuestion?.rawDomain || "Unknown",
      is_correct: correct,
      time_spent_ms: timeSpentMs,
      changed_answer: hasChangedAnswer,
      exam_mode: isPsiMode ? 'psi_simulation' : 'standard'
    })

    if (userId && currentQuestion?.rawDomain && projectSlug) {
        console.log(`📊 [BRAIN SIGNAL] Attempting to log Telemetry for Domain: ${currentQuestion.rawDomain} (Question ID: ${currentQuestion.id})`);
        const supabase = createBrowserClient();
        
        // Execute the insert and wait for result/error
        // Note: question_id is omitted for AI-generated questions since they 
        // don't have a corresponding row in the question_bank table (foreign key constraint)
        const insertPayload: any = {
            student_id: userId,
            school_id: schoolId,
            portal_slug: projectSlug,
            domain: currentQuestion.rawDomain,
            is_correct: correct,
            time_spent_ms: timeSpentMs,
            changed_answer: hasChangedAnswer,
            session_id: sessionId
        };

        // Only include question_id for static question_bank questions.
        // AI-generated questions are explicitly flagged and must skip this FK-constrained field.
        const isFromQuestionBank = !currentQuestion.aiGenerated;
        
        if (isFromQuestionBank) {
            insertPayload.question_id = currentQuestion.id;
        }

        const { error } = await (supabase.from("barber_exam_telemetry") as any).insert(insertPayload);

        if (error) {
            console.error("❌ [BRAIN SIGNAL] Telemetry Sync Failed:", error.message);
        } else {
            console.log("✅ [BRAIN SIGNAL] Telemetry Persisted Successfully.");
        }
    } else {
        console.warn("⚠️ [BRAIN SIGNAL] Telemetry skipped: Missing User Identity or Domain Data.");
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
      const finalScore = isCorrect ? score + 1 : score
      trackExamSessionComplete({
        deck_type: 'enhanced',
        score: finalScore,
        total: questions.length,
        pass_rate: finalScore / questions.length,
        mode: isPsiMode ? 'psi_simulation' : 'standard'
      })
    }
  }

  const handleReset = () => {
    setCurrentIndex(0)
    setSelectedOptionId(null)
    setGameState("intro")
    setScore(0)
    setHasChangedAnswer(false)
    setCognitiveInsight(null)
    setSessionId(crypto.randomUUID())
    trackExamRetake('enhanced')
    fetchQuestions()
  }

  const handleStart = async () => {
    if (activeRequestRef.current) {
      console.warn("⚠️ [BRAIN SIGNAL] Synthesis already in progress. Ignoring redundant request.");
      return;
    }

    console.log("📡 [BRAIN SIGNAL] Initializing Mastery Loop for:", projectSlug);
    activeRequestRef.current = true;
    setIsProcessingAI(true);
    setQuestionStartTime(Date.now());
    setHasChangedAnswer(false);

    // Cancel any previous hung requests
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      // STEP 1: Fetch telemetry
      console.log("📊 [BRAIN SIGNAL] Fetching real student telemetry from database...");
      let richTelemetry = null;
      try {
        const telemetryRes = await fetch('/api/barber/telemetry-context', { 
          signal: abortControllerRef.current.signal 
        });
        if (telemetryRes.ok) {
          richTelemetry = await telemetryRes.json();
          console.log("✅ [BRAIN SIGNAL] Real telemetry loaded:", {
            username: richTelemetry?.user_context?.username,
            passProbability: richTelemetry?.performance_telemetry_snapshot?.estimated_pass_probability,
            domainBreakdown: richTelemetry?.performance_telemetry_snapshot?.domain_breakdown
          });
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn("⚠️ [BRAIN SIGNAL] Telemetry unavailable:", err);
      }

      // STEP 2: Adaptive Deck Handshake
      console.log("🧠 [BRAIN SIGNAL] Requesting Adaptive Deck from Gemini 3...");
      const response = await fetch('/api/diagnostic', {
        method: "POST",
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({ 
            query: "USER_CHOICE: \"keep_answering\"",
            telemetry: richTelemetry,
            psiMode: isPsiMode
        }),
        headers: { "Content-Type": "application/json" }
      });
      
      if (!response.ok) throw new Error(`Diagnostic API failed: ${response.status}`);
      
      const data = await response.json();
      const report = data.diagnostic_report || data;

      // Surface Internal AI Monologue
      if (report.debug_signals && Array.isArray(report.debug_signals)) {
        report.debug_signals.forEach((signal: string) => {
           console.log(`🧠 [BRAIN TRACE] ${signal}`);
        });
      }

      console.log("🔬 [BRAIN SIGNAL] Raw API Response:", data);
      
      if (report && report.question_deck && report.question_deck.length > 0) {
        console.log(`✅ [BRAIN SIGNAL] Received ${report.question_deck.length} Adaptive Questions.`);
        const mapped: Question[] = report.question_deck.map((q: any) => ({
          id: q.id,
          category: q.domain,
          rawDomain: q.domain,
          question: q.question,
          psiQuestion: q.psi_question || q.psi_syntax_text || undefined,
          aiGenerated: q.ai_generated === true,
          options: Array.isArray(q.options) 
            ? q.options.map((opt: any, idx: number) => ({
                id: idx.toString(),
                text: typeof opt === 'string' ? opt : (opt.text || ""),
                isCorrect: idx === q.correct_index
              }))
            : Object.entries(q.options).map(([id, text]) => ({
                id,
                text: text as string,
                isCorrect: id === q.correct_answer
              })),
          metadata: {
            source: "Milady 6th Ed / TDLR",
            reasoning: q.explanation || q.rationale
          }
        }));
        setQuestions(mapped);
        setCognitiveInsight(report.cognitive_insight || "Diagnostic loop synchronized.");
        setCurrentIndex(0);
      } else {
        throw new Error("No deck returned from AI");
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("🛑 [BRAIN SIGNAL] Request cancelled by user or hot-reload.");
        return;
      }
      console.error("❌ [BRAIN SIGNAL] Mastery Loop Error:", err);
      setCognitiveInsight("System operating in High-Fidelity Diagnostic Baseline (AI Handshake Refined).");
    } finally {
      setIsProcessingAI(false);
      activeRequestRef.current = false;
      console.log("🏁 [BRAIN SIGNAL] Mastery Loop Complete. Ready for Simulation.");
      trackExamSessionStart({ 
          deck_type: 'enhanced', 
          question_count: questions.length,
          mode: isPsiMode ? 'psi_simulation' : 'standard'
      });
    }
  }

  const handleProceedToExam = () => {
    setGameState("active")
    setQuestionStartTime(Date.now())
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-background/50 space-y-4 relative overflow-hidden">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Synthesizing Exam Intelligence...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.02] via-transparent to-primary/[0.02] pointer-events-none" />
        
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4 lg:p-12 relative z-10 overflow-y-auto no-scrollbar">
            
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
                    <div className={cn(
                        "px-4 lg:px-6 py-2 lg:py-3 rounded-2xl shadow-lg flex-1 sm:flex-none text-center transition-colors duration-500",
                        isPsiMode ? "bg-rose-600 shadow-rose-600/20" : "bg-primary shadow-primary/20"
                    )}>
                        <span className="text-[10px] block font-black uppercase text-white/60 mb-1">Score</span>
                        <span className="text-sm lg:text-lg font-black text-white">{score}</span>
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
                            Analyze your domain mastery across the Texas Board framework. 
                            Your response time and behavioral pivots are recorded securely to build your predictive mastery profile.
                         </p>
                      </div>

                      {/* PSI Mode Toggle */}
                      <div className="w-full max-w-sm glass-panel p-4 rounded-3xl border border-primary/10 flex items-center justify-between group cursor-pointer hover:border-primary/30 transition-all" onClick={() => setIsPsiMode(!isPsiMode)}>
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "h-10 w-10 rounded-2xl flex items-center justify-center transition-colors",
                                isPsiMode ? "bg-rose-500/10 text-rose-500" : "bg-primary/10 text-primary"
                            )}>
                                {isPsiMode ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Simulation Mode</span>
                                <span className={cn("text-xs font-black uppercase tracking-tighter", isPsiMode ? "text-rose-500" : "text-primary")}>
                                    {isPsiMode ? "Linguistic Stress Test Active" : "Standard Learning Mode"}
                                </span>
                            </div>
                        </div>
                        <div className={cn(
                            "w-12 h-6 rounded-full p-1 transition-colors duration-300",
                            isPsiMode ? "bg-rose-500" : "bg-muted"
                        )}>
                            <div className={cn(
                                "h-4 w-4 bg-white rounded-full transition-transform duration-300",
                                isPsiMode ? "translate-x-6" : "translate-x-0"
                            )} />
                        </div>
                      </div>

                      <Button 
                          onClick={handleStart}
                          disabled={isProcessingAI}
                          className={cn(
                            "mt-8 h-16 md:h-20 px-8 md:px-12 text-white text-sm md:text-lg font-black uppercase tracking-[0.2em] md:tracking-[0.4em] rounded-[1.5rem] md:rounded-[2rem] transition-all shadow-2xl flex items-center",
                            isPsiMode ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30" : "bg-primary hover:bg-primary/90 shadow-primary/30",
                            isProcessingAI && "opacity-50 cursor-not-allowed"
                          )}
                      >
                          {isProcessingAI ? (
                            <div className="flex items-center gap-3">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Synthesizing...</span>
                            </div>
                          ) : (
                            <>
                                {isPsiMode ? "Initiate PSI Stress Test" : "Begin Knowledge Audit"}
                                <ArrowRight className="ml-3 h-5 w-5 md:h-6 md:w-6" />
                            </>
                          )}
                      </Button>

                      {/* AI INSIGHT REVEAL & PROCEED GATE */}
                      <AnimatePresence>
                          {cognitiveInsight && (
                              <motion.div
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="w-full max-w-2xl space-y-6 mt-12"
                              >
                                  <div className="glass-panel p-6 lg:p-8 rounded-[2rem] border-l-8 border-l-primary bg-primary/[0.03] text-left relative overflow-hidden">
                                      <div className="absolute top-0 right-0 p-4 opacity-10">
                                          <Sparkles className="h-12 w-12 text-primary" />
                                      </div>
                                      <div className="flex items-center gap-3 mb-4">
                                          <Sparkles className="h-5 w-5 text-primary" />
                                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Mastery Loop Insight</span>
                                      </div>
                                      <p className="text-sm lg:text-lg font-bold text-foreground leading-relaxed italic">
                                          "{cognitiveInsight}"
                                      </p>
                                  </div>

                                  <Button 
                                      onClick={handleProceedToExam}
                                      className="w-full h-16 lg:h-20 bg-foreground text-background hover:bg-primary hover:text-white text-sm lg:text-lg font-black uppercase tracking-[0.3em] rounded-3xl transition-all shadow-2xl group"
                                  >
                                      Enter Simulation Environment
                                      <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                  </Button>
                              </motion.div>
                          )}
                      </AnimatePresence>
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
                >
                    {cognitiveInsight && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 glass-panel p-4 rounded-2xl border-l-4 border-l-primary bg-primary/5 flex items-start gap-4"
                        >
                            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">AI Cognitive Insight</span>
                                <p className="text-sm font-bold text-foreground/80 leading-relaxed italic">
                                    "{cognitiveInsight}"
                                </p>
                            </div>
                        </motion.div>
                    )}

                    <div className="flex-1 glass-panel rounded-[2rem] lg:rounded-[4rem] p-5 lg:p-14 border border-primary/5 flex flex-col relative overflow-hidden group">
                    <div className={cn(
                        "absolute top-0 right-0 h-32 lg:h-64 w-32 lg:w-64 rounded-bl-[5rem] lg:rounded-bl-[10rem] -mr-10 lg:-mr-20 -mt-10 lg:-mt-20 transition-all duration-700",
                        isPsiMode ? "bg-rose-500/10" : "bg-primary/5 group-hover:bg-primary/10"
                    )} />
                    
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-6 lg:mb-10">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "h-8 lg:h-10 w-8 lg:w-10 rounded-xl flex items-center justify-center",
                                    isPsiMode ? "bg-rose-500/10" : "bg-primary/10"
                                )}>
                                    <BookOpen className={cn("h-4 lg:h-5 w-4 lg:w-5", isPsiMode ? "text-rose-500" : "text-primary")} />
                                </div>
                                <span className={cn("text-[10px] lg:text-xs font-black uppercase tracking-[0.4em]", isPsiMode ? "text-rose-500" : "text-primary")}>
                                    {currentQuestion.category}
                                </span>
                            </div>
                            {isPsiMode && (
                                <div className="bg-rose-600 text-white px-3 py-1 rounded-lg flex items-center gap-2 shadow-lg shadow-rose-600/20">
                                    <Lock className="h-3 w-3" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">PSI Stress Test</span>
                                </div>
                            )}
                        </div>

                        <h3 className="text-xl lg:text-4xl font-black text-foreground leading-[1.1] lg:leading-[1.05] tracking-tight mb-8 lg:mb-12">
                            {isPsiMode && currentQuestion.psiQuestion ? currentQuestion.psiQuestion : currentQuestion.question}
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
                                    isSelected && !isShownFeedback ? (isPsiMode ? "border-rose-500 bg-rose-500/5 translate-x-1 ring-2 ring-rose-500/5" : "border-primary bg-primary/5 translate-x-1 ring-2 ring-primary/5") : "border-border hover:border-primary/50 bg-background/50 hover:translate-x-1",
                                    isShownFeedback && option.isCorrect && "border-emerald-500 bg-emerald-500/10 translate-x-2 shadow-lg shadow-emerald-500/10",
                                    isShownFeedback && isSelected && !option.isCorrect && "border-rose-500 bg-rose-500/10 opacity-100",
                                    isShownFeedback && !option.isCorrect && !isSelected && "opacity-40 grayscale scale-[0.98]"
                                )}
                                >
                                    <div className={cn(
                                        "mt-1 h-5 lg:h-7 w-5 lg:w-7 rounded-lg lg:rounded-xl border-2 flex items-center justify-center shrink-0 transition-all duration-300",
                                        isSelected ? (isPsiMode ? "border-rose-500 bg-rose-500 scale-110 shadow-lg shadow-rose-500/50" : "border-primary bg-primary scale-110 shadow-lg shadow-primary/50") : "border-border"
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
                                className={cn(
                                    "w-full h-16 lg:h-24 text-sm lg:text-lg font-black uppercase tracking-[0.4em] rounded-[1.5rem] lg:rounded-[2rem] transition-all shadow-2xl disabled:opacity-30",
                                    isPsiMode ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-foreground text-background hover:bg-primary hover:text-white"
                                )}
                            >
                                {isPsiMode ? "Verify Simulation Signal" : "Submit Signal"}
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
                                    className={cn(
                                        "w-full h-16 lg:h-24 text-sm lg:text-lg font-black uppercase tracking-[0.4em] rounded-[1.5rem] lg:rounded-[2rem] transition-all shadow-2xl",
                                        isPsiMode ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30" : "bg-primary hover:bg-primary/90 shadow-primary/30"
                                    )}
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
