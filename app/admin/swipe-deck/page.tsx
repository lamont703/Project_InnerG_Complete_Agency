"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Info, 
  ShieldCheck,
  ChevronRight,
  BookOpen,
  Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"

const mockQuestions = [
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
      reasoning: "Porous items (like neck strips or cotton) cannot be effectively disinfected once contaminated. Standard safety protocol requires immediate disposal to prevent cross-contamination."
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
      reasoning: "The Fifth Cranial Nerve (Trigeminal) is the largest cranial nerve and serves as the primary sensory nerve of the face and the motor nerve of the muscles that control chewing."
    }
  },
  {
    id: 3,
    category: "Chemical Services",
    question: "A solution with a pH of 7.0 is considered to be:",
    options: [
      { id: "a", text: "Highly Alkaline", isCorrect: false },
      { id: "b", text: "Acidic", isCorrect: false },
      { id: "c", text: "Neutral", isCorrect: true },
      { id: "d", text: "Corrosive", isCorrect: false }
    ],
    metadata: {
      source: "Pivot Point Fundamentals, Science 101",
      reasoning: "The pH scale ranges from 0 to 14. A value of 7 is the midpoint, representing a perfectly balanced or neutral solution, such as pure water."
    }
  }
]

export default function SwipeDeckPage() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [gameState, setGameState] = useState<"active" | "feedback" | "finished">("active")

  const currentQuestion = mockQuestions[currentIndex]
  const isCorrect = currentQuestion?.options.find(o => o.id === selectedOptionId)?.isCorrect

  const handleOptionSelect = (optionId: string) => {
    if (gameState === "feedback") return
    setSelectedOptionId(optionId)
  }

  const handleSubmit = () => {
    if (!selectedOptionId) return
    setGameState("feedback")
  }

  const handleNext = () => {
    if (currentIndex < mockQuestions.length - 1) {
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
  }

  return (
    <div className="flex-1 bg-slate-50 flex flex-col p-4 lg:p-8 overflow-hidden relative">
      <div className="max-w-md mx-auto w-full h-full flex flex-col pt-8 lg:pt-12">
        
        {/* Header Stats */}
        <div className="flex justify-between items-center mb-8 px-2">
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pilot Cohort Alpha</span>
                <h1 className="text-xl font-black italic uppercase tracking-tighter text-slate-950">Texas Barber Swipe Deck™</h1>
            </div>
            <div className="bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
                <span className="text-xs font-black text-primary">{currentIndex + 1} / {mockQuestions.length}</span>
            </div>
        </div>

        <AnimatePresence mode="wait">
          {gameState === "finished" ? (
            <motion.div
              key="finished"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="flex-1 flex flex-col items-center justify-center text-center space-y-6"
            >
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center shadow-inner">
                <ShieldCheck className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-950">Research Phase Complete</h2>
              <p className="text-slate-600 font-bold leading-relaxed px-4">
                You have successfully navigated the syntax alignment pilot. Your results have been integrated into the institutional ROI engine.
              </p>
              <Button onClick={handleReset} className="bg-primary text-white hover:bg-slate-950 px-12 py-6 text-base font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl">
                Restart Session
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 100, rotate: 5 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              exit={{ opacity: 0, x: -100, rotate: -5 }}
              transition={{ type: "spring", damping: 20, stiffness: 100 }}
              className="flex-1 flex flex-col"
            >
              <div className="flex-1 bg-white rounded-[2.5rem] p-6 lg:p-8 shadow-2xl border-2 border-slate-100 flex flex-col relative overflow-hidden group">
                 {/* Decorative Accent */}
                 <div className="absolute top-0 right-0 h-32 w-32 bg-primary/5 rounded-bl-full -mr-10 -mt-10 group-hover:bg-primary/10 transition-colors" />
                 
                 <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">{currentQuestion.category}</span>
                    </div>

                    <h3 className="text-xl lg:text-2xl font-bold text-slate-950 leading-[1.2] mb-8">
                       {currentQuestion.question}
                    </h3>

                    <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar pb-4">
                       {currentQuestion.options.map((option) => {
                         const isSelected = selectedOptionId === option.id
                         const isShownFeedback = gameState === "feedback"
                         
                         let stateStyles = "border-slate-200 hover:border-primary/50 bg-white"
                         if (isSelected) stateStyles = "border-primary bg-primary/5 ring-2 ring-primary/20"
                         
                         if (isShownFeedback) {
                           if (option.isCorrect) stateStyles = "border-green-500 bg-green-50 ring-2 ring-green-200"
                           else if (isSelected && !option.isCorrect) stateStyles = "border-red-500 bg-red-50 ring-2 ring-red-200"
                           else stateStyles = "border-slate-100 opacity-50 grayscale bg-slate-50"
                         }

                         return (
                           <button
                             key={option.id}
                             onClick={() => handleOptionSelect(option.id)}
                             disabled={gameState === "feedback"}
                             className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-300 flex items-start gap-4 ${stateStyles}`}
                           >
                              <div className={`mt-1 h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? "border-primary bg-primary" : "border-slate-200"}`}>
                                 {isSelected && <div className="h-2 w-2 bg-white rounded-full" />}
                              </div>
                              <span className="text-sm lg:text-base font-bold text-slate-900 leading-snug">
                                {option.text}
                              </span>
                           </button>
                         )
                       })}
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                      {gameState === "active" ? (
                        <Button
                          onClick={handleSubmit}
                          disabled={!selectedOptionId}
                          className="w-full bg-slate-950 text-white hover:bg-primary py-7 text-sm font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg disabled:opacity-30 disabled:grayscale"
                        >
                          Confirm Selection
                          <ChevronRight className="ml-2 h-5 w-5" />
                        </Button>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`rounded-2xl p-4 lg:p-6 mb-4 ${isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
                        >
                           <div className="flex items-center gap-3 mb-3">
                              {isCorrect ? (
                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                              ) : (
                                <XCircle className="h-6 w-6 text-red-600" />
                              )}
                              <span className={`text-sm font-black uppercase italic tracking-tighter ${isCorrect ? "text-green-700" : "text-red-700"}`}>
                                {isCorrect ? "Strategic Match" : "Syntax Dissonance"}
                              </span>
                           </div>
                           <p className="text-xs lg:text-sm text-slate-800 font-bold leading-relaxed mb-4 italic">
                              {currentQuestion.metadata.reasoning}
                           </p>
                           <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-400">
                              <BookOpen className="h-3 w-3" />
                              Source: {currentQuestion.metadata.source}
                           </div>
                        </motion.div>
                      )}

                      {gameState === "feedback" && (
                         <Button
                           onClick={handleNext}
                           className="w-full bg-primary text-white hover:bg-slate-950 py-7 text-sm font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg"
                         >
                           Swipe to Next
                           <ArrowRight className="ml-2 h-5 w-5" />
                         </Button>
                      )}
                    </div>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Guidance */}
        <div className="mt-8 mb-12 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                Authorized Intelligence Alignment Module <br /> High-Signal Strategic Data
            </p>
        </div>
      </div>
    </div>
  )
}
