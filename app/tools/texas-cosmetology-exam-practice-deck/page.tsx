"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
import Link from "next/link"
import { toast } from "sonner"
import { joinCosmetologyPrepWaitlist } from "./actions"
import { Navbar } from "@/components/layout/navbar"
import {
  trackExamSessionStart,
  trackExamAnswerSubmitted,
  trackExamSessionComplete,
  trackExamRetake
} from "@/lib/analytics"

// First-attempt written pass rate (58.9%) pulled from get_statewide_exam_stats
// against real 2026 TDLR test-taker records — not an estimate.
const PRACTICE_DECK_FAQS = [
  {
    q: "What exam vendor administers the Texas cosmetology written exam?",
    a: "PSI Services, on behalf of TDLR. These practice questions are aligned to the same Milady Standard Cosmetology textbook citations and question style PSI uses on the actual Cosmetology Operator written exam.",
  },
  {
    q: "What score do I need to pass the Texas cosmetology written exam?",
    a: "70%. Roughly 59% of first-time takers pass it statewide, based on 2026 TDLR test-taker data — meaningfully higher than the barber written exam's first-attempt rate, but still the harder of the two cosmetology exams (the practical exam's first-attempt pass rate is over 91%).",
  },
  {
    q: "Is this practice deck based on real exam content?",
    a: "The questions are sourced from Milady Standard Cosmetology textbook citations aligned to PSI's published exam content outline, not scraped from leaked exam questions. It's built to test the same knowledge areas, not to reproduce specific exam questions.",
  },
  {
    q: "What should I do after I pass the written exam?",
    a: "Schedule your practical exam and review the exact kit list and station order — see our Texas Cosmetology Practical Exam Kit List for the official PSI/TDLR requirements.",
  },
]

const practiceQuestions = [
  {
    id: 1,
    category: "Infection Control",
    question: "What is the minimum recommended immersion time for multi-use tools in an EPA-registered disinfectant solution to achieve proper disinfection?",
    options: [
      { id: "a", text: "30 seconds", isCorrect: false },
      { id: "b", text: "2 minutes", isCorrect: false },
      { id: "c", text: "10 minutes", isCorrect: true },
      { id: "d", text: "1 hour", isCorrect: false }
    ],
    metadata: {
      source: "Milady Standard Cosmetology, Infection Control chapter",
      reasoning: "Most EPA-registered disinfectants used in cosmetology require a minimum 10-minute immersion time to properly disinfect multi-use implements."
    }
  },
  {
    id: 2,
    category: "Nail Care",
    question: "What is the technical term for the whitish, half-moon shaped area at the base of the nail plate?",
    options: [
      { id: "a", text: "Cuticle", isCorrect: false },
      { id: "b", text: "Eponychium", isCorrect: false },
      { id: "c", text: "Lunula", isCorrect: true },
      { id: "d", text: "Matrix", isCorrect: false }
    ],
    metadata: {
      source: "Milady Standard Cosmetology, Nail Structure chapter",
      reasoning: "The lunula is the visible, whitish part of the nail matrix at the base of the nail plate."
    }
  },
  {
    id: 3,
    category: "Skin Care",
    question: "Which skin type is characterized by underactive sebaceous glands, often appearing thin, dry, and prone to flaking or fine lines?",
    options: [
      { id: "a", text: "Oily skin", isCorrect: false },
      { id: "b", text: "Dry (alipidic) skin", isCorrect: true },
      { id: "c", text: "Combination skin", isCorrect: false },
      { id: "d", text: "Sensitive skin", isCorrect: false }
    ],
    metadata: {
      source: "Milady Standard Cosmetology, Skin Analysis chapter",
      reasoning: "Alipidic (dry) skin lacks sufficient sebum production, which leads to a thin texture, flaking, and a tendency to show fine lines."
    }
  },
  {
    id: 4,
    category: "Haircoloring",
    question: "What is the primary purpose of a strand test before applying permanent haircolor?",
    options: [
      { id: "a", text: "To screen the client for a skin allergy", isCorrect: false },
      { id: "b", text: "To determine processing time and predict the final color result", isCorrect: true },
      { id: "c", text: "To measure the rate of hair growth", isCorrect: false },
      { id: "d", text: "To check for split ends", isCorrect: false }
    ],
    metadata: {
      source: "Milady Standard Cosmetology, Haircoloring chapter",
      reasoning: "A strand test previews the color result and confirms processing time on a small section before committing to a full application — distinct from a patch test, which screens for allergic reaction."
    }
  },
  {
    id: 5,
    category: "Chemical Texture Services",
    question: "During a permanent wave service, what does \"processing\" refer to?",
    options: [
      { id: "a", text: "Rinsing the waving lotion from the hair", isCorrect: false },
      { id: "b", text: "The time needed for the waving lotion to break and reform the hair's bonds around the rod", isCorrect: true },
      { id: "c", text: "Sectioning the hair before wrapping", isCorrect: false },
      { id: "d", text: "Applying the neutralizer", isCorrect: false }
    ],
    metadata: {
      source: "Milady Standard Cosmetology, Chemical Texture Services chapter",
      reasoning: "Processing is the period during which the waving lotion softens and breaks the hair's disulfide bonds so they can reform around the rod's shape."
    }
  },
  {
    id: 6,
    category: "Skin Care",
    question: "What is the primary purpose of a toner (astringent) in a basic facial treatment?",
    options: [
      { id: "a", text: "To exfoliate dead skin cells", isCorrect: false },
      { id: "b", text: "To remove remaining traces of cleanser and tighten the appearance of pores", isCorrect: true },
      { id: "c", text: "To deeply moisturize dry skin", isCorrect: false },
      { id: "d", text: "To increase blood circulation", isCorrect: false }
    ],
    metadata: {
      source: "Milady Standard Cosmetology, Facials chapter",
      reasoning: "Toner removes leftover cleanser residue and temporarily tightens the appearance of pores, prepping the skin for the next step in a facial."
    }
  },
  {
    id: 7,
    category: "Nail Care",
    question: "What term describes a nail disorder in which the nail plate separates from the nail bed, often due to infection or trauma?",
    options: [
      { id: "a", text: "Onychomycosis", isCorrect: false },
      { id: "b", text: "Onycholysis", isCorrect: true },
      { id: "c", text: "Paronychia", isCorrect: false },
      { id: "d", text: "Onychauxis", isCorrect: false }
    ],
    metadata: {
      source: "Milady Standard Cosmetology, Nail Disorders chapter",
      reasoning: "Onycholysis is the separation of the nail plate from the nail bed, without shedding — distinct from onychomycosis (a fungal infection of the nail itself) and paronychia (inflammation of the skin around the nail)."
    }
  },
  {
    id: 8,
    category: "Hair and Scalp Care",
    question: "What is the medical term for hair loss, as opposed to normal, cyclical shedding?",
    options: [
      { id: "a", text: "Alopecia", isCorrect: true },
      { id: "b", text: "Trichoptilosis", isCorrect: false },
      { id: "c", text: "Hypertrichosis", isCorrect: false },
      { id: "d", text: "Canities", isCorrect: false }
    ],
    metadata: {
      source: "Milady Standard Cosmetology, Hair and Scalp Disorders chapter",
      reasoning: "Alopecia refers to hair loss. Trichoptilosis is split ends, hypertrichosis is excessive hair growth, and canities is the technical term for gray hair."
    }
  },
  {
    id: 9,
    category: "State Law & Safety",
    question: "Sharp implements such as razors and cuticle nippers must be disinfected using which minimum standard?",
    options: [
      { id: "a", text: "UV light exposure only", isCorrect: false },
      { id: "b", text: "Soap and water only", isCorrect: false },
      { id: "c", text: "An EPA-registered, hospital-level disinfectant", isCorrect: true },
      { id: "d", text: "A single alcohol wipe", isCorrect: false }
    ],
    metadata: {
      source: "Milady Standard Cosmetology, Infection Control chapter",
      reasoning: "Sharp, multi-use implements require an EPA-registered, hospital-level (or higher) disinfectant — UV cabinets, soap and water, or a quick wipe alone don't meet the standard."
    }
  },
  {
    id: 10,
    category: "State Law & Safety",
    question: "What is the primary purpose of a Safety Data Sheet (SDS) for a chemical product used in a salon?",
    options: [
      { id: "a", text: "To list which clients are allergic to the product", isCorrect: false },
      { id: "b", text: "To provide information on the product's safe handling, storage, and hazards", isCorrect: true },
      { id: "c", text: "To track employee hours logged using the product", isCorrect: false },
      { id: "d", text: "To record the retail price of the product", isCorrect: false }
    ],
    metadata: {
      source: "Milady Standard Cosmetology, Chemistry and Safety chapter",
      reasoning: "An SDS documents a chemical product's composition, hazards, and safe handling/storage/disposal procedures, required to be on file for every chemical product used in the salon."
    }
  }
]

export default function CosmetologyPracticeDeckPage() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [gameState, setGameState] = useState<"active" | "feedback" | "finished">("active")
  const [score, setScore] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState(0)
  const [waitlistEmail, setWaitlistEmail] = useState("")
  const [waitlistName, setWaitlistName] = useState("")
  const [isJoiningWaitlist, setIsJoiningWaitlist] = useState(false)
  const [hasJoinedWaitlist, setHasJoinedWaitlist] = useState(false)

  useEffect(() => {
    trackExamSessionStart({ deck_type: 'public', question_count: practiceQuestions.length, program: 'cosmetology' })
    setSessionStartTime(Date.now())
  }, [])

  const currentQuestion = practiceQuestions[currentIndex]
  const isCorrect = currentQuestion?.options.find(o => o.id === selectedOptionId)?.isCorrect

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsJoiningWaitlist(true)
    const result = await joinCosmetologyPrepWaitlist(waitlistEmail, waitlistName)
    setIsJoiningWaitlist(false)
    if (result.success) {
      setHasJoinedWaitlist(true)
      toast.success("You're on the list — we'll email you when Cosmetology AI Enhanced Prep is ready.")
    } else {
      toast.error(result.error || "Something went wrong.")
    }
  };

  const handleOptionSelect = (optionId: string) => {
    if (gameState === "feedback") return
    setSelectedOptionId(optionId)
  }

  const handleSubmit = () => {
    if (!selectedOptionId) return
    const isAnsCorrect = !!isCorrect
    if (isAnsCorrect) setScore(prev => prev + 1)
    setGameState("feedback")

    trackExamAnswerSubmitted({
      question_index: currentIndex,
      domain: currentQuestion.category,
      is_correct: isAnsCorrect,
      time_spent_ms: Date.now() - sessionStartTime,
      changed_answer: false,
      program: 'cosmetology'
    })
  }

  const handleNext = () => {
    // Early Onboarding Triggers after Question 3 (index 2) and Question 6 (index 5)
    if (currentIndex === 2 || currentIndex === 5) {
      setIsModalOpen(true)
    }

    if (currentIndex < practiceQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedOptionId(null)
      setGameState("active")
      setSessionStartTime(Date.now())
    } else {
      setGameState("finished")
      setIsModalOpen(true) // Auto-open modal upon completion
      const finalScore = isCorrect ? score + 1 : score
      trackExamSessionComplete({
        deck_type: 'public',
        score: finalScore,
        total: practiceQuestions.length,
        pass_rate: finalScore / practiceQuestions.length,
        program: 'cosmetology'
      })
    }
  }

  const handleReset = () => {
    setCurrentIndex(0)
    setSelectedOptionId(null)
    setGameState("active")
    setScore(0)
    setSessionStartTime(Date.now())
    trackExamRetake('public', 'cosmetology')
  }

  return (
    <main className="min-h-screen bg-white light text-slate-950 flex flex-col selection:bg-primary/20">
      <Navbar />
      <div className="flex-1 flex flex-col p-4 lg:p-8 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white pointer-events-none" />
        <div className="max-w-2xl mx-auto w-full h-full flex flex-col pt-24 lg:pt-24 relative z-10">

          {/* Header Stats */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 px-2 gap-4">
              <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                      <Link href="/texas-cosmetology-practical-exam-kit-list" className="text-primary hover:underline text-[10px] font-black tracking-widest uppercase flex items-center gap-1">
                        <ArrowLeft className="h-3 w-3" />
                        Back to Kit List
                      </Link>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-slate-950 leading-tight">
                    Texas Cosmetology Exam <br className="sm:hidden" />Intelligence Deck™
                  </h1>
                  <p className="text-[11px] font-bold text-slate-500 mt-1">
                    Practice questions aligned to the PSI written exam — the vendor TDLR contracts to administer the actual Cosmetology Operator license test.
                  </p>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="bg-white border border-slate-200 px-4 py-2 rounded-2xl shadow-sm flex-1 sm:flex-none text-center">
                    <span className="text-[10px] block font-black uppercase text-slate-400 mb-0.5">Progress</span>
                    <span className="text-sm font-black text-slate-950">{currentIndex + 1} / {practiceQuestions.length}</span>
                </div>
                <div className="bg-primary text-white px-4 py-2 rounded-2xl shadow-lg shadow-primary/20 flex-1 sm:flex-none text-center">
                    <span className="text-[10px] block font-black uppercase text-white/60 mb-0.5">Score</span>
                    <span className="text-sm font-black">{score}</span>
                </div>
              </div>
          </div>

          <AnimatePresence mode="wait">
            {gameState === "finished" ? (
              <motion.div
                key="finished"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="bg-white rounded-[3rem] p-8 lg:p-16 border-2 border-slate-100 shadow-2xl flex flex-col items-center justify-center text-center space-y-8"
              >
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center shadow-inner relative">
                  <ShieldCheck className="h-12 w-12 text-primary" />
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                </div>
                <div className="space-y-4">
                    <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-950 leading-none">Baseline Audit Complete</h2>
                    <p className="text-slate-600 font-bold leading-relaxed px-4 max-w-sm mx-auto">
                      You scored <span className="text-primary text-2xl px-1">{score} / {practiceQuestions.length}</span>.
                      Get notified the moment our <strong>Aesthetic Intelligence</strong> enhanced prep launches for cosmetology candidates.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    <Button onClick={handleReset} variant="outline" className="border-2 border-slate-200 py-8 text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all">
                        Retake Practice
                    </Button>
                    <Button onClick={() => setIsModalOpen(true)} className="bg-primary text-white hover:bg-slate-950 py-8 text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-primary/10 gap-2">
                        <Sparkles className="h-4 w-4" />
                        Join AI Enhanced Prep Waitlist
                    </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 100, rotate: 5 }}
                animate={{ opacity: 1, x: 0, rotate: 0 }}
                exit={{ opacity: 0, x: -100, rotate: -5 }}
                transition={{ type: "spring", damping: 25, stiffness: 120 }}
                className="flex-1 flex flex-col"
              >
                <div className="flex-1 bg-white rounded-[2.5rem] lg:rounded-[4rem] p-6 lg:p-12 shadow-2xl border-2 border-slate-100 flex flex-col relative overflow-hidden group">
                   {/* Background Glow */}
                   <div className="absolute top-0 right-0 h-48 w-48 bg-primary/5 rounded-bl-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-all duration-700" />

                   <div className="relative z-10 flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-6">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Sparkles className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-[10px] lg:text-xs font-black uppercase tracking-[0.3em] text-primary">{currentQuestion.category}</span>
                      </div>

                      <h3 className="text-xl lg:text-3xl font-black text-slate-950 leading-[1.1] mb-8 lg:mb-12">
                         {currentQuestion.question}
                      </h3>

                      <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar pb-6">
                         {currentQuestion.options.map((option) => {
                           const isSelected = selectedOptionId === option.id
                           const isShownFeedback = gameState === "feedback"

                           let stateStyles = "border-slate-200 hover:border-primary/50 bg-white hover:translate-x-2"
                           if (isSelected) stateStyles = "border-primary bg-primary/5 ring-2 ring-primary/10 translate-x-3"

                           if (isShownFeedback) {
                             if (option.isCorrect) stateStyles = "border-green-500 bg-green-50/50 ring-2 ring-green-200 translate-x-4"
                             else if (isSelected && !option.isCorrect) stateStyles = "border-red-500 bg-red-50/50 ring-2 ring-red-200"
                             else stateStyles = "border-slate-100 opacity-40 grayscale bg-slate-50 translate-x-0"
                           }

                           return (
                             <button
                                key={option.id}
                                onClick={() => handleOptionSelect(option.id)}
                                disabled={gameState === "feedback"}
                                className={`w-full text-left p-5 lg:p-6 rounded-2xl lg:rounded-3xl border-2 transition-all duration-500 flex items-start gap-4 lg:gap-6 ${stateStyles}`}
                             >
                                <div className={`mt-1.5 h-6 w-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${isSelected ? "border-primary bg-primary rotate-90" : "border-slate-200"}`}>
                                   {isSelected && <div className="h-2 w-2 bg-white rounded-full animate-ping" />}
                                </div>
                                <span className="text-base lg:text-lg font-bold text-slate-900 leading-tight">
                                  {option.text}
                                </span>
                             </button>
                           )
                         })}
                      </div>

                      <div className="pt-8 border-t border-slate-100">
                        {gameState === "active" ? (
                          <Button
                            onClick={handleSubmit}
                            disabled={!selectedOptionId}
                            className="w-full bg-slate-950 text-white hover:bg-primary py-8 lg:py-10 text-base font-black uppercase tracking-[0.3em] rounded-2xl lg:rounded-3xl transition-all shadow-xl disabled:opacity-30 disabled:grayscale"
                          >
                            Lock Selection
                            <ChevronRight className="ml-2 h-6 w-6" />
                          </Button>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`rounded-3xl p-6 lg:p-8 mb-6 ${isCorrect ? "bg-green-50 border-2 border-green-200" : "bg-red-50 border-2 border-red-200"}`}
                          >
                             <div className="flex items-center gap-4 mb-4">
                                {isCorrect ? (
                                  <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-200">
                                    <CheckCircle2 className="h-6 w-6 text-white" />
                                  </div>
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-200">
                                    <XCircle className="h-6 w-6 text-white" />
                                  </div>
                                )}
                                <div className="flex flex-col">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isCorrect ? "text-green-600" : "text-red-600"}`}>Analysis Result</span>
                                    <span className={`text-xl font-black uppercase italic tracking-tighter ${isCorrect ? "text-green-950" : "text-red-950"}`}>
                                    {isCorrect ? "Strategic Match" : "Syntax Dissonance"}
                                    </span>
                                </div>
                             </div>
                             <p className="text-sm lg:text-base text-slate-800 font-bold leading-relaxed mb-6">
                                {currentQuestion.metadata.reasoning}
                             </p>
                             <div className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-400 bg-white/50 w-fit px-4 py-2 rounded-full border border-slate-100">
                                <BookOpen className="h-3 w-3 text-primary" />
                                Reference: {currentQuestion.metadata.source}
                             </div>
                          </motion.div>
                        )}

                        {gameState === "feedback" && (
                           <Button
                             onClick={handleNext}
                             className="w-full bg-primary text-white hover:bg-slate-950 py-8 lg:py-10 text-base font-black uppercase tracking-[0.3em] rounded-2xl lg:rounded-3xl transition-all shadow-xl shadow-primary/20"
                           >
                             Swipe to Next
                             <ArrowRight className="ml-2 h-6 w-6 animate-bounce-x" />
                           </Button>
                        )}
                      </div>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Waitlist Modal — a genuine interest-capture, not a full
              registration. No cosmetology-aware dashboard/deployment
              blueprint exists yet, so this doesn't pretend one does. */}
          <AnimatePresence>
            {isModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsModalOpen(false)}
                  className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative w-full max-w-xl max-h-[95vh] overflow-y-auto overflow-x-hidden no-scrollbar bg-white rounded-[2rem] lg:rounded-[2.5rem] p-6 sm:p-8 lg:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-slate-100"
                >
                  <div className="absolute top-0 right-0 h-32 w-32 bg-primary/5 rounded-bl-full pointer-events-none" />

                  <div className="flex flex-col items-center text-center space-y-4 lg:space-y-6 mb-6 lg:mb-10">
                    <div className="h-12 w-12 lg:h-16 lg:w-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                       <Sparkles className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl lg:text-3xl font-black uppercase italic tracking-tighter text-slate-950 leading-tight mb-2">
                        {hasJoinedWaitlist ? "You're On The List" : "AI Enhanced Prep — Coming Soon"}
                      </h2>
                      <p className="text-slate-500 font-bold text-xs lg:text-sm tracking-tight px-2 lg:px-4 mx-auto max-w-xs">
                        {hasJoinedWaitlist
                          ? "We'll email you the moment cosmetology AI Enhanced Prep is ready."
                          : "Our AI Enhanced Prep dashboard is live for barber candidates today, and coming soon for cosmetology. Join the waitlist to be first in line."}
                      </p>
                    </div>
                  </div>

                  {!hasJoinedWaitlist && (
                    <form className="space-y-4" onSubmit={handleJoinWaitlist}>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">First Name</label>
                        <input
                          type="text"
                          placeholder="Jane"
                          value={waitlistName}
                          onChange={(e) => setWaitlistName(e.target.value)}
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-4 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none text-slate-900"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                        <input
                          type="email"
                          required
                          placeholder="cosmetologist@example.com"
                          value={waitlistEmail}
                          onChange={(e) => setWaitlistEmail(e.target.value)}
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-4 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none text-slate-900"
                        />
                      </div>
                      <div className="pt-4">
                        <Button disabled={isJoiningWaitlist} className="w-full bg-slate-950 text-white hover:bg-primary py-7 lg:py-8 text-sm font-black uppercase tracking-[0.3em] rounded-xl lg:rounded-2xl transition-all shadow-xl">
                          {isJoiningWaitlist ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Joining...
                            </>
                          ) : (
                            <>
                              Join the Waitlist
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  )}

                  <div className="flex flex-col items-center gap-4 mt-6">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Maybe Later
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <style jsx global>{`
            @keyframes bounce-x {
              0%, 100% { transform: translateX(0); }
              50% { transform: translateX(10px); }
            }
            .animate-bounce-x {
              animation: bounce-x 1s infinite;
            }
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .no-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>

          {/* Footer Guidance */}
          <div className="mt-12 mb-20 text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em]">Accreditation-First Intelligent Prep™</span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-relaxed max-w-sm mx-auto italic">
                  Disclaimer: This tool is for institutional alignment pilot purposes. Permanent state cosmetology exam success requires full theoretical immersion.
              </p>
              <div className="pt-4">
                  <Button
                    onClick={() => setIsModalOpen(true)}
                    variant="link"
                    className="text-primary font-black uppercase tracking-widest text-[10px] gap-2 hover:no-underline hover:scale-105 transition-all"
                  >
                    Join AI Enhanced Prep Waitlist
                    <ArrowRight className="h-3 w-3" />
                  </Button>
              </div>
          </div>

          <div className="text-center mt-4 mb-8">
            <Link href="/tools/barbershop-search" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Search
            </Link>
          </div>

          <div className="max-w-xl mx-auto border-t border-slate-200 pt-10 mb-16 text-left">
            <h2 className="text-xl font-black text-slate-900 mb-6 text-center">Common Questions</h2>
            <div className="space-y-6">
              {PRACTICE_DECK_FAQS.map((faq) => (
                <div key={faq.q}>
                  <h3 className="text-sm font-black text-slate-900 mb-1.5">{faq.q}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: PRACTICE_DECK_FAQS.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: { "@type": "Answer", text: faq.a },
            })),
          }),
        }}
      />
    </main>
  )
}
