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
import { toast } from "sonner"

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

export default function PublicSwipeDeckPage() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [gameState, setGameState] = useState<"active" | "feedback" | "finished">("active")
  const [score, setScore] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoginView, setIsLoginView] = useState(false)
  const [hasTriggeredMidway, setHasTriggeredMidway] = useState(false)
  const [userRole, setUserRole] = useState<"student" | "instructor" | "owner" | null>("student")
  const [schoolData, setSchoolData] = useState({ name: "", city: "", state: "TX", isOther: false })
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "" })
  const [isRegistering, setIsRegistering] = useState(false)

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
    // Early Onboarding Trigger at Question 5
    if (currentIndex === 4 && !hasTriggeredMidway) {
      setIsModalOpen(true)
      setHasTriggeredMidway(true)
    }

    if (currentIndex < practiceQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedOptionId(null)
      setGameState("active")
    } else {
      setGameState("finished")
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoginView) {
      // Mock login for now
      toast.success("Login simulated");
      setIsModalOpen(false);
      return;
    }

    if (!schoolData.name || !userRole) {
      toast.error("Please select a school and professional role.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsRegistering(true);
    try {
      const response = await fetch("/api/barber/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          schoolData,
          role: userRole
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Architecture deployed! Redirecting...");
        window.location.href = data.redirect;
      } else {
        throw new Error(data.error || "Deployment failed");
      }
    } catch (err: any) {
      console.error("[Register] Error:", err);
      toast.error(err.message || "Failed to initialize architecture.");
    } finally {
      setIsRegistering(false);
    }
  }

  const handleReset = () => {
    setCurrentIndex(0)
    setSelectedOptionId(null)
    setGameState("active")
    setScore(0)
    setHasTriggeredMidway(false)
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
// ... existing swipe logic ...
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

                  <form className="space-y-4" onSubmit={handleRegister}>
                    <AnimatePresence mode="wait">
                      {!isLoginView ? (
                        <motion.div 
                          key="register"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="space-y-4"
                        >
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">First Name</label>
                              <input type="text" required minLength={2} placeholder="Lamont" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Last Name</label>
                              <input type="text" required minLength={2} placeholder="Evans" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none" />
                            </div>
                          </div>

                          <BarberSchoolSelector 
                            onSelect={(data) => setSchoolData(data)} 
                          />

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                            <input type="email" required placeholder="lamont@example.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none" />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Professional Role</label>
                            <div className="grid grid-cols-1 gap-2">
                                {[
                                    { id: "student", label: "Barber Student", sub: "I'm training for licensure" },
                                    { id: "instructor", label: "Barber Instructor", sub: "I manage a training cohort" },
                                    { id: "owner", label: "Barber School Owner", sub: "I manage institutional nodes" }
                                ].map((role) => (
                                    <button
                                        key={role.id}
                                        type="button"
                                        onClick={() => setUserRole(role.id as any)}
                                        className={cn(
                                            "flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left",
                                            userRole === role.id 
                                                ? "border-primary bg-primary/5 ring-2 ring-primary/5" 
                                                : "border-slate-100 bg-slate-50 hover:border-slate-200"
                                        )}
                                    >
                                        <span className="text-xs font-black uppercase tracking-tight text-slate-950">{role.label}</span>
                                        <span className="text-[10px] font-bold text-slate-400">{role.sub}</span>
                                    </button>
                                ))}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
                            <input 
                              type="tel" 
                              required 
                              placeholder="(555) 000-0000" 
                              value={formData.phone}
                              onChange={(e) => setFormData({...formData, phone: e.target.value})}
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none" 
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Create Password</label>
                            <input 
                              type="password" 
                              required 
                              minLength={6}
                              placeholder="••••••••" 
                              value={formData.password}
                              onChange={(e) => setFormData({...formData, password: e.target.value})}
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none" 
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirm Password</label>
                            <input 
                              type="password" 
                              required 
                              minLength={6}
                              placeholder="••••••••" 
                              value={formData.confirmPassword}
                              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none" 
                            />
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="login"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="space-y-4"
                        >
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                            <input type="email" required placeholder="lamont@example.com" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-4 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
                            <input type="password" required placeholder="••••••••" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-4 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="pt-4 space-y-4">
                      {!isLoginView && (
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-200 text-primary focus:ring-primary" required />
                          <span className="text-[10px] text-slate-500 font-bold leading-relaxed group-hover:text-slate-900 transition-colors cursor-pointer">
                            I agree to the <Link href="/terms-of-service" className="text-primary underline">Terms of Service</Link> and <Link href="/privacy-policy" className="text-primary underline">Privacy Policy</Link>. I consent to receive SMS updates regarding my test prep performance.
                          </span>
                        </label>
                      )}

                      <Button 
                        disabled={isRegistering}
                        className="w-full bg-slate-950 text-white hover:bg-primary py-7 lg:py-8 text-sm font-black uppercase tracking-[0.3em] rounded-xl lg:rounded-2xl transition-all shadow-xl"
                      >
                        {isRegistering ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Initializing Architecture...
                          </>
                        ) : (
                          <>
                            {isLoginView ? "Login to Dashboard" : "Unlock AI Enhanced Prep"}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                      
                      <div className="flex flex-col items-center gap-4">
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
                  </form>
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
