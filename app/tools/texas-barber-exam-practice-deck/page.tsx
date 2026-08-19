"use client"

import { useState, useEffect } from "react"
import { ORG_ID, WEBSITE_ID, faqId, graph, ref, topics } from "@/lib/schema-graph"
import { createBrowserClient } from "@/lib/supabase/browser"
import { motion, AnimatePresence } from "framer-motion"
import { 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  BookOpen, 
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Clock,
  ArrowLeft,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { BarberSchoolSelector } from "@/components/forms/BarberSchoolSelector"
import { BarberRegisterForm } from "@/components/forms/BarberRegisterForm"
import { toast } from "sonner"
import { Navbar } from "@/components/layout/navbar"
import {
  trackExamSessionStart,
  trackExamAnswerSubmitted,
  trackExamSessionComplete,
  trackExamRetake
} from "@/lib/analytics"

const PRACTICE_DECK_FAQS = [
  {
    q: "What exam vendor administers the Texas barber written exam?",
    a: "PSI Services, on behalf of TDLR. These practice questions are aligned to the same Milady textbook citations and question style PSI uses on the actual Class A Barber written exam.",
  },
  {
    q: "What score do I need to pass the Texas barber written exam?",
    a: "70%. The written exam is the harder of the two exams statewide — roughly 46% of first-time takers pass it, compared to about 84% for the practical exam.",
  },
  {
    q: "Is this practice deck based on real exam content?",
    a: "The questions are sourced from Milady textbook citations aligned to PSI's published exam content outline, not scraped from leaked exam questions. It's built to test the same knowledge areas, not to reproduce specific exam questions.",
  },
  {
    q: "What should I do after I pass the written exam?",
    a: "Schedule your practical exam and review the exact kit list and station order — see our Barber Practical Exam Kit List for the official PSI/TDLR requirements.",
  },
]

const practiceQuestions = [
  {
    id: 1,
    category: "Nail and Skin Care",
    question: "What is the primary benefit of using a steamer or hot towels during a professional facial treatment?",
    options: [
      { id: "a", text: "To tighten the skin and close the pores", isCorrect: false },
      { id: "b", text: "To soften the skin and open pores for easier cleaning", isCorrect: true },
      { id: "c", text: "To apply antiseptic deep into the dermis", isCorrect: false },
      { id: "d", text: "To reduce the appearance of fine lines and wrinkles", isCorrect: false }
    ],
    metadata: {
      source: "Milady 7th Ed, Chapter 15",
      reasoning: "Steamers and hot towels are utilized to soften the skin tissues and open the pores, which facilitates the removal of impurities during cleansing."
    }
  },
  {
    id: 2,
    category: "Hair and Scalp Care",
    question: "During a shampoo service, which type of cape is specifically used, and what is its primary purpose?",
    options: [
      { id: "a", text: "A nylon cape; to allow for maximum breathability", isCorrect: false },
      { id: "b", text: "A cloth cape; to absorb excess water", isCorrect: false },
      { id: "c", text: "A vinyl (waterproof) cape; to protect the client's clothing from water and shampoo/chemical solutions", isCorrect: true },
      { id: "d", text: "A paper cape; for one-time disposable use", isCorrect: false }
    ],
    metadata: {
      source: "Milady 7th Ed, Chapter 11, Page 277",
      reasoning: "A waterproof vinyl cape is essential for wet services like shampooing to keep the client dry and protect their clothing."
    }
  },
  {
    id: 3,
    category: "Hair and Scalp Care",
    question: "According to the FDA, what are the only two treatments that have been scientifically proven to increase hair growth and are used in the treatment of alopecia?",
    options: [
      { id: "a", text: "Shampooing daily and using essential oils", isCorrect: false },
      { id: "b", text: "Scalp massage and regular haircuts", isCorrect: false },
      { id: "c", text: "Vitamin supplements and cold water rinses", isCorrect: false },
      { id: "d", text: "Minoxidil and Finasteride", isCorrect: true }
    ],
    metadata: {
      source: "Milady 7th Ed, Chapter 11, Page 255",
      reasoning: "The FDA only recognizes Minoxidil (topical) and Finasteride (oral) as scientifically proven treatments for hair loss."
    }
  },
  {
    id: 4,
    category: "Hair and Scalp Care",
    question: "Why is it important for a barber to use a \"pH-balanced\" shampoo (typically ranging from 4.5 to 5.5) on a client's hair?",
    options: [
      { id: "a", text: "To open the cuticle layer as wide as possible for cleaning", isCorrect: false },
      { id: "b", text: "To match the natural pH of the hair and skin, which helps to keep the hair cuticle closed and healthy", isCorrect: true },
      { id: "c", text: "To increase the alkalinity of the hair for better shine", isCorrect: false },
      { id: "d", text: "To ensure the shampoo lathers more than a high-pH shampoo", isCorrect: false }
    ],
    metadata: {
      source: "Milady 7th Ed, Chapter 11, Page 192, 200",
      reasoning: "Shampoos with a pH of 4.5 to 5.5 match the hair's natural acidity, preventing excessive swelling of the hair shaft and keeping the cuticle layer smooth and closed."
    }
  },
  {
    id: 5,
    category: "Chemical Texture Services",
    question: "What is the typical pH range of alkaline (cold) waves, which use ammonium thioglycolate (ATG) as the active ingredient?",
    options: [
      { id: "a", text: "4.5 to 7.0", isCorrect: false },
      { id: "b", text: "7.8 to 8.2", isCorrect: false },
      { id: "c", text: "9.0 to 9.6", isCorrect: true },
      { id: "d", text: "12.5 to 13.5", isCorrect: false }
    ],
    metadata: {
      source: "Milady 7th Ed, Chapter 17, Table 17-2",
      reasoning: "Alkaline waves, or cold waves, process at room temperature and typically have a pH between 9.0 and 9.6."
    }
  },
  {
    id: 6,
    category: "Chemical Texture Services",
    question: "What is the primary purpose of applying a base cream during a \"base relaxer\" service?",
    options: [
      { id: "a", text: "To help the relaxer penetrate the cuticle", isCorrect: false },
      { id: "b", text: "To protect the scalp from potential irritation or burns", isCorrect: true },
      { id: "c", text: "To speed up the chemical reaction", isCorrect: false },
      { id: "d", text: "To add moisture to the hair shaft", isCorrect: false }
    ],
    metadata: {
      source: "Milady 7th Ed, Chapter 17, Relaxing section",
      reasoning: "Protective base cream is an oily cream used specifically to protect the client's scalp during a hydroxide relaxer service."
    }
  },
  {
    id: 7,
    category: "Chemical Texture Services",
    question: "Before proceeding with any chemical texture service, the barber must examine the client's scalp and should NOT perform the service if they find:",
    options: [
      { id: "a", text: "Excessive oiliness", isCorrect: false },
      { id: "b", text: "Fine hair texture", isCorrect: false },
      { id: "c", text: "Cuts or abrasions", isCorrect: true },
      { id: "d", text: "Natural cowlicks", isCorrect: false }
    ],
    metadata: {
      source: "Milady 7th Ed, Chapter 17, Page 580",
      reasoning: "A chemical service should never be performed if the scalp shows signs of cuts, abrasions, scratches, or open sores."
    }
  },
  {
    id: 8,
    category: "Haircoloring",
    question: "Colors positioned directly opposite each other on the color wheel that neutralize each other when mixed are known as:",
    options: [
      { id: "a", text: "Primary colors", isCorrect: false },
      { id: "b", text: "Tertiary colors", isCorrect: false },
      { id: "c", text: "Analogous colors", isCorrect: false },
      { id: "d", text: "Complementary colors", isCorrect: true }
    ],
    metadata: {
      source: "Milady 7th Ed, Chapter 18, Page 643",
      reasoning: "Complementary colors neutralize or \"cancel\" each other out when mixed."
    }
  },
  {
    id: 9,
    category: "Haircoloring",
    question: "What type of haircolor contains color molecules small enough to partially penetrate the hair shaft and last through 4–8 shampoos?",
    options: [
      { id: "a", text: "Temporary", isCorrect: false },
      { id: "b", text: "Semi-permanent", isCorrect: true },
      { id: "c", text: "Permanent", isCorrect: false },
      { id: "d", text: "Metallic", isCorrect: false }
    ],
    metadata: {
      source: "Milady 7th Ed, Chapter 18, Page 649",
      reasoning: "Semi-permanent haircolor is a non-oxidation color with smaller pigment molecules that partially penetrate the hair shaft."
    }
  },
  {
    id: 10,
    category: "Haircoloring",
    question: "To identify a possible allergy, the U.S. Food, Drug, and Cosmetic Act requires a patch test be performed how many hours prior to an aniline derivative haircolor?",
    options: [
      { id: "a", text: "1 to 2 hours", isCorrect: false },
      { id: "b", text: "12 to 24 hours", isCorrect: false },
      { id: "c", text: "24 to 48 hours", isCorrect: true },
      { id: "d", text: "72 to 96 hours", isCorrect: false }
    ],
    metadata: {
      source: "Milady 7th Ed, Chapter 18, Page 664",
      reasoning: "A patch test (predisposition test) must be performed 24 to 48 hours before the application of aniline derivative haircolor."
    }
  }
]

export default function PublicSwipeDeckPage() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [gameState, setGameState] = useState<"active" | "feedback" | "finished">("active")
  const [score, setScore] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoginView, setIsLoginView] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState(0)

  useEffect(() => {
    trackExamSessionStart({ deck_type: 'public', question_count: practiceQuestions.length })
    setSessionStartTime(Date.now())
  }, [])

  const currentQuestion = practiceQuestions[currentIndex]
  const isCorrect = currentQuestion?.options.find(o => o.id === selectedOptionId)?.isCorrect

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("Institutional authentication initializing...");
    window.location.href = "/login";
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
      changed_answer: false
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
        pass_rate: finalScore / practiceQuestions.length
      })
    }
  }

  const handleReset = () => {
    setCurrentIndex(0)
    setSelectedOptionId(null)
    setGameState("active")
    setScore(0)
    setSessionStartTime(Date.now())
    trackExamRetake('public')
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
                      <Link href="/texas-barber-exam-intelligence-prep" className="text-primary hover:underline text-[10px] font-black tracking-widest uppercase flex items-center gap-1">
                        <ArrowLeft className="h-3 w-3" />
                        Back to Solution
                      </Link>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-slate-950 leading-tight">
                    Barber Exam <br className="sm:hidden" />Practice Test
                  </h1>
                  <p className="text-[11px] font-bold text-slate-500 mt-1">
                    The Texas Barber Exam Intelligence Deck™ — free practice questions aligned to the PSI written exam, the vendor TDLR contracts to administer the actual Class A Barber license test.
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
                      Our <strong>Aesthetic Intelligence</strong> has identified specific knowledge gaps in your profile. Access the Enhanced Prep to resolve these gaps.
                    </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    <Button onClick={handleReset} variant="outline" className="border-2 border-slate-200 py-8 text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all">
                        Retake Practice
                    </Button>
                    <Button onClick={() => setIsModalOpen(true)} className="bg-primary text-white hover:bg-slate-950 py-8 text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-primary/10 gap-2">
                        <Sparkles className="h-4 w-4" />
                        Login For AI Enhanced Prep
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

          {/* Onboarding Modal */}
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
                        {isLoginView ? "Welcome Back" : "AI Enhanced Access"}
                      </h2>
                      <p className="text-slate-500 font-bold text-xs lg:text-sm tracking-tight px-2 lg:px-4 mx-auto max-w-xs">
                        {isLoginView 
                          ? "Login to resume your personalized Aesthetic Intelligence training." 
                          : "Complete your profile and let AI train you with Aesthetic Intelligence."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <AnimatePresence mode="wait">
                      {!isLoginView ? (
                        <motion.div 
                          key="register"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                        >
                          <BarberRegisterForm onSuccess={(url) => window.location.href = url} />
                        </motion.div>
                      ) : (
                        <form className="space-y-4" onSubmit={handleLogin}>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                            <input 
                                type="email" 
                                required 
                                placeholder="barber@example.com" 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-4 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none text-slate-900" 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
                            <input 
                                type="password" 
                                required 
                                placeholder="••••••••" 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-4 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none text-slate-900" 
                            />
                          </div>
                          <div className="pt-4">
                            <Button className="w-full bg-slate-950 text-white hover:bg-primary py-7 lg:py-8 text-sm font-black uppercase tracking-[0.3em] rounded-xl lg:rounded-2xl transition-all shadow-xl">
                                Login to Dashboard
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                        </form>
                      )}
                    </AnimatePresence>
 
                    <div className="flex flex-col items-center gap-4 mt-6">
                      <button 
                        type="button"
                        onClick={() => setIsLoginView(!isLoginView)}
                        className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:underline transition-colors"
                      >
                        {isLoginView ? "Need an account? Register" : "Already have an account? Login"}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        Maybe Later
                      </button>
                    </div>
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
                  Disclaimer: This tool is for institutional alignment pilot purposes. Permanent state barbers exam success requires full theoretical immersion.
              </p>
              <div className="pt-4">
                  <Button 
                    onClick={() => setIsModalOpen(true)}
                    variant="link" 
                    className="text-primary font-black uppercase tracking-widest text-[10px] gap-2 hover:no-underline hover:scale-105 transition-all"
                  >
                    Register / Login for AI Enhanced Prep
                    <ArrowRight className="h-3 w-3" />
                  </Button>
              </div>
          </div>

          <div className="text-center mt-4 mb-8">
            <Link href="/search" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
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
          __html: JSON.stringify(graph({
            "@type": "FAQPage",
            "@id": faqId("/tools/texas-barber-exam-practice-deck"),
            isPartOf: ref(WEBSITE_ID),
            publisher: ref(ORG_ID),
            about: topics("barbering", "cosmetology"),
            mainEntity: PRACTICE_DECK_FAQS.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: { "@type": "Answer", text: faq.a },
            })),
          })),
        }}
      />
    </main>
  )
}
