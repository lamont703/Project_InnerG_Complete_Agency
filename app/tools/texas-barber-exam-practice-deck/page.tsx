"use client"

import { useState, useEffect } from "react"
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
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { cn } from "@/lib/utils"
import { BarberSchoolSelector } from "@/components/forms/BarberSchoolSelector"
import { BarberRegisterForm } from "@/components/forms/BarberRegisterForm"
import { toast } from "sonner"
import {
  trackExamSessionStart,
  trackExamAnswerSubmitted,
  trackExamSessionComplete,
  trackExamRetake
} from "@/lib/analytics"

const practiceQuestions = [
  {
    id: 1,
    category: "Sanitation & Safety",
    question: "Which of the following is a type of pathogenic bacteria that grows in clusters like bunches of grapes and causes abscesses, pustules, and boils?",
    options: [
      { id: "a", text: "Bacilli", isCorrect: false },
      { id: "b", text: "Spirilla", isCorrect: false },
      { id: "c", text: "Staphylococci", isCorrect: true },
      { id: "d", text: "Diplococci", isCorrect: false }
    ],
    metadata: {
      source: "Milady 6th Ed, Chapter 5, Page 74",
      reasoning: "Staphylococci are pus-forming bacteria that grow in clusters like bunches of grapes. They cause abscesses, pustules, and boils."
    }
  },
  {
    id: 2,
    category: "Sanitation & Safety",
    question: "Which type of bacteria are round-shaped and appear singly or in groups?",
    options: [
      { id: "a", text: "Cocci", isCorrect: true },
      { id: "b", text: "Bacilli", isCorrect: false },
      { id: "c", text: "Spirilla", isCorrect: false },
      { id: "d", text: "Flagella", isCorrect: false }
    ],
    metadata: {
      source: "Milady 6th Ed, Chapter 5, Page 74",
      reasoning: "Cocci are spherical bacteria. Subtypes include Staphylococci (clusters), Streptococci (chains), and Diplococci (pairs)."
    }
  },
  {
    id: 3,
    category: "Sanitation & Safety",
    question: "Which bacteria are short, rod-shaped and produce diseases such as tetanus and tuberculosis?",
    options: [
      { id: "a", text: "Cocci", isCorrect: false },
      { id: "b", text: "Bacilli", isCorrect: true },
      { id: "c", text: "Spirilla", isCorrect: false },
      { id: "d", text: "Cilia", isCorrect: false }
    ],
    metadata: {
      source: "Milady 6th Ed, Chapter 5, Page 75",
      reasoning: "Bacilli are the most common type of bacteria and are rod-shaped. They produce diseases such as tetanus, typhoid fever, and tuberculosis."
    }
  },
  {
    id: 4,
    category: "Sanitation & Safety",
    question: "The process that destroys all microbial life, including spores, is called:",
    options: [
      { id: "a", text: "Sanitation", isCorrect: false },
      { id: "b", text: "Disinfection", isCorrect: false },
      { id: "c", text: "Sterilization", isCorrect: true },
      { id: "d", text: "Decontamination", isCorrect: false }
    ],
    metadata: {
      source: "Milady 6th Ed, Chapter 5, Page 82",
      reasoning: "Sterilization is the process that destroys all microbial life, including spores. Disinfection does not destroy spores."
    }
  },
  {
    id: 5,
    category: "Sanitation & Safety",
    question: "What is the term for the ability of a disinfectant to produce the intended effect as listed on the label?",
    options: [
      { id: "a", text: "Porosity", isCorrect: false },
      { id: "b", text: "Efficacy", isCorrect: true },
      { id: "c", text: "Solubility", isCorrect: false },
      { id: "d", text: "Toxicity", isCorrect: false }
    ],
    metadata: {
      source: "Milady 6th Ed, Chapter 5, Page 84",
      reasoning: "Efficacy claims on a label indicate the specific pathogens a disinfectant is proven to destroy when used according to instructions."
    }
  },
  {
    id: 6,
    category: "Sanitation & Safety",
    question: "Cleaning is defined as the mechanical method of using soap and water to remove:",
    options: [
      { id: "a", text: "Spores", isCorrect: false },
      { id: "b", text: "Visible dirt, debris, and many germs", isCorrect: true },
      { id: "c", text: "All bacteria", isCorrect: false },
      { id: "d", text: "Viruses only", isCorrect: false }
    ],
    metadata: {
      source: "Milady 6th Ed, Chapter 5, Page 82",
      reasoning: "Cleaning is the mechanical removal of visible debris and is the required first step in infection control."
    }
  },
  {
    id: 7,
    category: "Sanitation & Safety",
    question: "The chemical process for reducing the number of disease-causing germs on cleaned surfaces to a safe level is:",
    options: [
      { id: "a", text: "Sanitizing", isCorrect: true },
      { id: "b", text: "Disinfecting", isCorrect: false },
      { id: "c", text: "Sterilizing", isCorrect: false },
      { id: "d", text: "Decontaminating", isCorrect: false }
    ],
    metadata: {
      source: "Milady 6th Ed, Chapter 5, Page 82",
      reasoning: "Sanitizing reduces germs to a level deemed safe by public health standards."
    }
  },
  {
    id: 8,
    category: "Sanitation & Safety",
    question: "Before disinfecting or sterilizing any tool, what must be done first?",
    options: [
      { id: "a", text: "Soak in alcohol", isCorrect: false },
      { id: "b", text: "Rinse with cold water", isCorrect: false },
      { id: "c", text: "Clean with soap and warm water to remove all visible debris", isCorrect: true },
      { id: "d", text: "Spray with quats", isCorrect: false }
    ],
    metadata: {
      source: "Milady 6th Ed, Chapter 5, Page 83",
      reasoning: "Cleaning (removing all visible debris) is the required first step before disinfection can be effective."
    }
  },
  {
    id: 9,
    category: "Sanitation & Safety",
    question: "Quaternary ammonium compounds, also known as 'quats', are:",
    options: [
      { id: "a", text: "Always dangerous to humans", isCorrect: false },
      { id: "b", text: "Infectious pathogens", isCorrect: false },
      { id: "c", text: "Standard hospital disinfectants", isCorrect: true },
      { id: "d", text: "Type of antiseptic", isCorrect: false }
    ],
    metadata: {
      source: "Milady 6th Ed, Chapter 5, Page 85",
      reasoning: "Quats are very effective disinfectants when used properly in a barber shop setting."
    }
  },
  {
    id: 10,
    category: "Sanitation & Safety",
    question: "Items that are nonporous and can be used on more than one person are called:",
    options: [
      { id: "a", text: "Single-use items", isCorrect: false },
      { id: "b", text: "Multi-use items", isCorrect: true },
      { id: "c", text: "Porous items", isCorrect: false },
      { id: "d", text: "Disposable items", isCorrect: false }
    ],
    metadata: {
      source: "Milady 6th Ed, Chapter 5, Page 86",
      reasoning: "Multi-use items must be cleaned and disinfected between each client use."
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
  const [hasTriggeredMidway, setHasTriggeredMidway] = useState(false)
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
    // Early Onboarding Trigger at Question 5
    if (currentIndex === 4 && !hasTriggeredMidway) {
      setIsModalOpen(true)
      setHasTriggeredMidway(true)
    }

    if (currentIndex < practiceQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedOptionId(null)
      setGameState("active")
      setSessionStartTime(Date.now())
    } else {
      setGameState("finished")
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
    setHasTriggeredMidway(false)
    setSessionStartTime(Date.now())
    trackExamRetake('public')
  }

  return (
    <main className="min-h-screen bg-white light text-slate-950 flex flex-col pt-20 selection:bg-primary/20">
      <Navbar />

      <div className="flex-1 flex flex-col p-4 lg:p-8 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white pointer-events-none" />
        <div className="max-w-2xl mx-auto w-full h-full flex flex-col pt-8 lg:pt-12 relative z-10">
          
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
                    Texas Barber Exam <br className="sm:hidden" />Intelligence Deck™
                  </h1>
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
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                  className="relative w-full max-w-xl bg-white rounded-[2.5rem] p-8 lg:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-slate-100 overflow-hidden"
                >
                  <div className="absolute top-0 right-0 h-32 w-32 bg-primary/5 rounded-bl-full pointer-events-none" />
                  
                  <div className="flex flex-col items-center text-center space-y-6 mb-8 lg:mb-10">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                       <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-950 leading-none mb-2">
                        {isLoginView ? "Welcome Back" : "AI Enhanced Access"}
                      </h2>
                      <p className="text-slate-500 font-bold text-sm tracking-tight px-4 mx-auto max-w-xs">
                        {isLoginView 
                          ? "Login to resume your personalized Aesthetic Intelligence training." 
                          : "Complete your profile to unlock Aesthetic Intelligence training loops."}
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
                                placeholder="lamont@example.com" 
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
        </div>
      </div>

      <Footer />
    </main>
  )
}
