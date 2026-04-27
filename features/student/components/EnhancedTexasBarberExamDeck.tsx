"use client"

import { useState } from "react"
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
  ArrowLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const practiceQuestions = [
  {
    id: 1,
    category: "Sanitation & Safety",
    question: "According to TDLR Chapter 82, how must a barber handle a porous item that has come into contact with blood or body fluids?",
    options: [
      { id: "a", text: "Disinfect with 10% bleach solution for 10 minutes", isCorrect: false },
      { id: "b", text: "Double-bag and discard immediately in a closed trash container", isCorrect: true },
      { id: "c", text: "Wash with hot soapy water and reuse", isCorrect: false },
      { id: "d", text: "Sterilize in an autoclave for 24 hours", isCorrect: false }
    ],
    metadata: {
      source: "TDLR Chapter 82.71(h)",
      reasoning: "Porous items cannot be disinfected once contaminated. Standard safety protocol requires immediate disposal to prevent cross-contamination."
    }
  },
  {
    id: 2,
    category: "Anatomy & Physiology",
    question: "The 'Tri-Geminal' nerve is also known as which cranial nerve?",
    options: [
      { id: "a", text: "Third Cranial Nerve", isCorrect: false },
      { id: "b", text: "Fifth Cranial Nerve", isCorrect: true },
      { id: "c", text: "Seventh Cranial Nerve", isCorrect: false },
      { id: "d", text: "Tenth Cranial Nerve", isCorrect: false }
    ],
    metadata: {
      source: "Milady Standard Barbering, Ch. 5",
      reasoning: "The Fifth Cranial Nerve is the largest cranial nerve and serves as the primary sensory nerve of the face."
    }
  },
  {
    id: 3,
    category: "Chemical Services",
    question: "A solution with a pH of 3.5 is considered to be:",
    options: [
      { id: "a", text: "Highly Alkaline", isCorrect: false },
      { id: "b", text: "Acidic", isCorrect: true },
      { id: "c", text: "Neutral", isCorrect: false },
      { id: "d", text: "Slightly Alkaline", isCorrect: false }
    ],
    metadata: {
      source: "Pivot Point Fundamentals",
      reasoning: "The pH scale ranges from 0 to 14. Anything below 7 is acidic. 3.5 is significantly on the acidic side of the scale."
    }
  },
  {
    id: 4,
    category: "Hair Coloring",
    question: "What is the primary factor that determines the processing time for a permanent hair color application?",
    options: [
      { id: "a", text: "The length of the hair", isCorrect: false },
      { id: "b", text: "The client's age", isCorrect: false },
      { id: "c", text: "The texture and porosity of the hair", isCorrect: true },
      { id: "d", text: "The type of shampoo used previously", isCorrect: false }
    ],
    metadata: {
      source: "Milady Standard Barbering, Ch. 11",
      reasoning: "Porosity (the hair's ability to absorb moisture) and texture (the diameter of the hair strand) directly affect how quickly color phentrates and processes."
    }
  },
  {
    id: 5,
    category: "State Laws & Licensing",
    question: "In Texas, how often must a Barber Shop license be renewed?",
    options: [
      { id: "a", text: "Every year", isCorrect: false },
      { id: "b", text: "Every 2 years", isCorrect: true },
      { id: "c", text: "Every 4 years", isCorrect: false },
      { id: "d", text: "Only upon ownership change", isCorrect: false }
    ],
    metadata: {
      source: "TDLR Occupations Code 1601.401",
      reasoning: "TDLR requires a biennial renewal (every 2 years) for shop licenses to ensure consistent compliance with state safety and operational standards."
    }
  },
  {
    id: 6,
    category: "Shaving Procedures",
    question: "Which of the following is the first step in a professional facial shave?",
    options: [
        { id: "a", text: "Lathering the face", isCorrect: false },
        { id: "b", text: "Applying a warm towel", isCorrect: true },
        { id: "c", text: "Testing the blade sharpness", isCorrect: false },
        { id: "d", text: "Applying aftershave lotion", isCorrect: false }
    ],
    metadata: {
        source: "Milady Standard Barbering, Ch. 14",
        reasoning: "Steam/Warm towels soften the hair and open the pores, preparing the skin for a smooth, irritation-free shaving surface."
    }
  },
  {
      id: 7,
      category: "Skin Care & Facials",
      question: "Which skin type is characterized by an overproduction of sebum/oil?",
      options: [
          { id: "a", text: "Dry", isCorrect: false },
          { id: "b", text: "Sensitive", isCorrect: false },
          { id: "c", text: "Oily", isCorrect: true },
          { id: "d", text: "Normal", isCorrect: false }
      ],
      metadata: {
          source: "Pivot Point Fundamentals, Skin 1",
          reasoning: "Sebum is the natural oil produced by sebaceous glands. Excessive production leads to what is professionally termed 'Oily' skin."
      }
  },
  {
      id: 8,
      category: "Tool Safety & Maintenance",
      question: "What is the proper method for cleaning the blades of electric clippers between clients?",
      options: [
          { id: "a", text: "Dip the entire clipper in water", isCorrect: false },
          { id: "b", text: "Wipe with a dry cloth only", isCorrect: false },
          { id: "c", text: "Remove hair with a brush and apply EPA-registered disinfectant spray", isCorrect: true },
          { id: "d", text: "Apply oil without cleaning hair", isCorrect: false }
      ],
      metadata: {
          source: "Texas Administrative Code 82.72",
          reasoning: "Barbers must use EPA-registered disinfectants on non-porous tools like clipper blades to prevent the transmission of bloodborne pathogens."
      }
  },
  {
      id: 9,
      category: "Nail Care",
      question: "The whitish, half-moon shape at the base of the nail is called the:",
      options: [
          { id: "a", text: "Eponychium", isCorrect: false },
          { id: "b", text: "Lunula", isCorrect: true },
          { id: "c", text: "Matrix", isCorrect: false },
          { id: "d", text: "Hyponychium", isCorrect: false }
      ],
      metadata: {
          source: "Milady Standard Barbering, Ch. 6",
          reasoning: "The lunula is the visible part of the matrix where the nail bed and matrix meet, often appearing as a white crescent."
      }
  },
  {
      id: 10,
      category: "Hair Treatment",
      question: "In a permanent wave service, which bond is broken and rearranged to create the new curl pattern?",
      options: [
          { id: "a", text: "Hydrogen Bonds", isCorrect: false },
          { id: "b", text: "Salt Bonds", isCorrect: false },
          { id: "c", text: "Disulfide Bonds", isCorrect: true },
          { id: "d", text: "Peptide Bonds", isCorrect: false }
      ],
      metadata: {
          source: "Pivot Point Science, Ch. 3",
          reasoning: "Chemical waving solutions (reducers) specifically target the strong disulfide bonds, allowing the hair to be reshaped on the rod."
      }
  }
]

interface EnhancedTexasBarberExamDeckProps {
    projectSlug: string;
}

export function EnhancedTexasBarberExamDeck({ projectSlug }: EnhancedTexasBarberExamDeckProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [gameState, setGameState] = useState<"active" | "feedback" | "finished">("active")
  const [score, setScore] = useState(0)

  const currentQuestion = practiceQuestions[currentIndex]
  const isCorrect = currentQuestion?.options.find(o => o.id === selectedOptionId)?.isCorrect

  const handleOptionSelect = (optionId: string) => {
    if (gameState === "feedback") return
    setSelectedOptionId(optionId)
  }

  const handleSubmit = () => {
    if (!selectedOptionId) return
    if (isCorrect) setScore(prev => prev + 1)
    setGameState("feedback")
  }

  const handleNext = () => {
    if (currentIndex < practiceQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedOptionId(null)
      setGameState("active")
    } else {
      setGameState("finished")
    }
  }

  const handleReset = () => {
    setCurrentIndex(0)
    setSelectedOptionId(null)
    setGameState("active")
    setScore(0)
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
                <div className="flex items-center gap-3 lg:gap-6 w-full sm:w-auto">
                    <div className="glass-panel px-4 lg:px-6 py-2 lg:py-3 rounded-2xl flex-1 sm:flex-none text-center">
                        <span className="text-[10px] block font-black uppercase text-muted-foreground mb-1">Progress</span>
                        <span className="text-sm lg:text-lg font-black text-foreground">{currentIndex + 1} / {practiceQuestions.length}</span>
                    </div>
                    <div className="bg-primary text-white px-4 lg:px-6 py-2 lg:py-3 rounded-2xl shadow-lg shadow-primary/20 flex-1 sm:flex-none text-center">
                        <span className="text-[10px] block font-black uppercase text-white/60 mb-1">Score</span>
                        <span className="text-sm lg:text-lg font-black">{score}</span>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {gameState === "finished" ? (
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
                            Performance identified at <span className="text-primary font-black text-2xl md:text-3xl lg:text-4xl px-2">{Math.round((score / practiceQuestions.length) * 100)}%</span> strategy compliance.
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
