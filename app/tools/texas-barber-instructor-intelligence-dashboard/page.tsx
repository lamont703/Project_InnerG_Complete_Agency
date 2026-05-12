"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  BarChart3, 
  Brain, 
  ShieldAlert, 
  TrendingDown, 
  Lightbulb, 
  Users, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Target,
  Zap,
  XCircle,
  X,
  Smartphone,
  Sparkles,
  Loader2,
  ShieldCheck
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { cn } from "@/lib/utils"
import { BarberSchoolSelector } from "@/components/forms/BarberSchoolSelector"

const topicMastery = [
  { name: "Health and Safety (Sanitation & Disinfection)", score: 42, color: "bg-red-500", items: 25 },
  { name: "Shaving & Preparation", score: 88, color: "bg-emerald-500", items: 15 },
  { name: "Licensing and Regulation", score: 65, color: "bg-amber-500", items: 13 },
  { name: "Haircutting and Hairstyling", score: 92, color: "bg-emerald-500", items: 12 },
  { name: "Haircoloring Procedures", score: 71, color: "bg-emerald-500", items: 6 },
  { name: "Chemical Texture Services", score: 58, color: "bg-amber-500", items: 6 },
  { name: "Hair and Scalp Care", score: 84, color: "bg-emerald-500", items: 4 },
  { name: "Nail and Skin Care", score: 77, color: "bg-emerald-500", items: 4 },
]

const redFlagStudents = [
  { 
    name: "Student A. Jackson", 
    risk: "High", 
    score: "54%", 
    reason: "Syntax Deficit",
    details: {
      examPrep: "54/100",
      preparedness: "42%",
      struggleSubjects: ["Health and Safety", "Chemical Texture Services"],
      lastActive: "2 hours ago"
    }
  },
  { 
    name: "Student M. Rodriguez", 
    risk: "Medium", 
    score: "68%", 
    reason: "Knowledge Gap",
    details: {
      examPrep: "68/100",
      preparedness: "71%",
      struggleSubjects: ["Licensing and Regulation", "Haircoloring Procedures"],
      lastActive: "1 day ago"
    }
  },
  { 
    name: "Student L. Chen", 
    risk: "High", 
    score: "49%", 
    reason: "Linguistic Barrier",
    details: {
      examPrep: "49/100",
      preparedness: "35%",
      struggleSubjects: ["Health and Safety", "Shaving & Preparation"],
      lastActive: "15 mins ago"
    }
  },
]

export default function InstructorDashboard() {
  const [activeTab, setActiveTab] = React.useState("overview")
  const [selectedStudent, setSelectedStudent] = React.useState<typeof redFlagStudents[0] | null>(null)
  
  // Registration Bridge States
  const [isRegisterModalOpen, setIsRegisterModalOpen] = React.useState(false)
  const [isLoginView, setIsLoginView] = React.useState(false)
  const [regUserRole, setRegUserRole] = React.useState<'student' | 'instructor' | 'owner'>('instructor')
  const [isAIResponseOpen, setIsAIResponseOpen] = React.useState(false)
  const [schoolData, setSchoolData] = React.useState({ name: "", city: "", state: "TX", isOther: false })
  const [formData, setFormData] = React.useState({ firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "" })
  const [isRegistering, setIsRegistering] = React.useState(false)

  const tabs = [
    { id: "overview", label: "Overview", icon: Target },
    { id: "mastery", label: "Subject Mastery", icon: BarChart3 },
    { id: "syntax", label: "Syntax Logic", icon: Brain },
    { id: "risk", label: "Attrition Risk", icon: Users },
    { id: "tactical", label: "Tactical Brief", icon: Zap },
  ]

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoginView) {
      toast.success("Login simulated");
      setIsRegisterModalOpen(false);
      return;
    }

    if (!schoolData.name || !regUserRole) {
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
          role: regUserRole
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

  return (
    <main className="min-h-screen bg-white light text-slate-950 flex flex-col pt-20 selection:bg-primary/20">
      <Navbar />

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12 lg:py-16">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 lg:mb-12 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.3em] text-[10px]">
              <ShieldAlert className="h-4 w-4" />
              Institutional Accreditation Shield
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black italic uppercase tracking-tighter text-slate-950 leading-tight">
              Instructor Intelligence <br />Dashboard™
            </h1>
          </div>
          <div className="flex gap-4 w-full lg:w-auto">
            <div className="flex-1 lg:flex-none bg-emerald-50 border border-emerald-100 p-4 sm:p-6 rounded-[2rem] flex flex-col items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">NACCAS Status</span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-700">Protected</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 mb-8 lg:mb-10 p-1.5 bg-slate-50 border border-slate-100 rounded-[2rem]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 rounded-[1.5rem] text-[9px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab.id 
                ? "bg-slate-950 text-white shadow-xl shadow-slate-200" 
                : "text-slate-400 hover:text-slate-600 hover:bg-white"
              }`}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="min-h-[500px]">
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                  <div className="bg-slate-50 border border-slate-100 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem]">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Class prediction</p>
                    <p className="text-3xl sm:text-4xl font-black italic text-slate-950">72.4%</p>
                    <div className="mt-4 flex items-center gap-2 text-emerald-600">
                      <ArrowUpRight className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">+4.2% week</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem]">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">student confidence</p>
                    <p className="text-3xl sm:text-4xl font-black italic text-slate-950">High</p>
                    <div className="mt-4 flex items-center gap-2 text-primary">
                      <Zap className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Velocity Peak</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] sm:col-span-2 md:col-span-1">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">at-risk pupils</p>
                    <p className="text-3xl sm:text-4xl font-black italic text-slate-950">03</p>
                    <div className="mt-4 flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Intervention</span>
                    </div>
                  </div>
               </div>

               <div className="bg-primary text-white rounded-[2rem] sm:rounded-[2.5rem] p-8 sm:p-10 flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-10">
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <Brain className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter leading-tight">Aesthetic Intelligence Briefing</h3>
                    <p className="text-xs sm:text-sm font-bold leading-relaxed opacity-90">
                      "Cognitive mapping reveals a systemic <span className="text-white underline decoration-white/30 underline-offset-4">Syntax-Knowledge Decoupling</span> in Chemical Services. Clinical intervention is mandatory to bridge the clinical reasoning delta."
                    </p>
                    <button 
                      onClick={() => setIsRegisterModalOpen(true)}
                      className="w-full sm:w-fit bg-slate-950 text-white px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white hover:text-slate-950 transition-all shadow-2xl active:scale-[0.98]"
                    >
                      View Full Briefing
                    </button>
                  </div>
               </div>
            </div>
          )}

          {activeTab === "mastery" && (
            <div className="bg-slate-50/50 border border-slate-100 rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-12 lg:p-16">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 sm:mb-12 gap-8">
                 <div className="flex items-center gap-4">
                   <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                   </div>
                   <div>
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase italic tracking-tighter">Student Performance Heatmap</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Real-Time Feedback Aggregation</p>
                   </div>
                 </div>
                 <div className="max-w-md">
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 leading-relaxed italic border-l-2 border-primary/20 pl-4">
                       "Performance aggregated across all <span className="text-primary font-black">Claimed Students</span>. This heatmap is a live, reactively calibrated pulse of your cohort—synchronizing every student's prep hub interaction into high-fidelity institutional intelligence."
                    </p>
                 </div>
              </div>
              
              <div className="space-y-8 sm:space-y-10">
                {topicMastery.map((topic) => (
                  <div key={topic.name} className="space-y-3">
                    <div className="flex justify-between items-end gap-4">
                      <div className="flex flex-col">
                        <span className="text-base sm:text-lg font-black text-slate-700 leading-tight">{topic.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{topic.items} Exam Items</span>
                      </div>
                      <span className={`text-lg sm:text-xl font-black ${topic.score < 70 ? 'text-red-600' : 'text-emerald-600'}`}>{topic.score}%</span>
                    </div>
                    <div className="h-3 sm:h-4 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${topic.color} transition-all duration-1000 ease-out shadow-lg`} 
                        style={{ width: `${topic.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "syntax" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <div className="bg-slate-950 rounded-[2.5rem] sm:rounded-[3rem] p-10 sm:p-12 text-white relative overflow-hidden flex flex-col justify-center">
                <div className="absolute top-0 right-0 h-48 w-48 sm:h-64 sm:w-64 bg-primary/10 rounded-full -mr-20 -mt-20 blur-[80px] sm:blur-[100px]" />
                <div className="relative z-10 space-y-10 sm:space-y-12">
                    <div className="space-y-6">
                       <div className="flex items-center gap-4">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-white/10 flex items-center justify-center">
                             <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                          </div>
                          <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter">Syntax Reports</h2>
                       </div>
                       <p className="text-[10px] sm:text-xs font-bold text-slate-400 leading-relaxed italic border-l-2 border-primary/40 pl-4 max-w-sm">
                          "Measuring the delta between <span className="text-primary">Fact Recall</span> vs. <span className="text-white">Application Logic</span>. Understand if your cohort can apply raw knowledge when faced with official linguistic traps."
                       </p>
                    </div>

                    <div className="space-y-8 sm:space-y-10">
                      <div className="flex items-start gap-4 sm:gap-6">
                        <div className="h-12 sm:h-16 w-1.5 sm:w-2 bg-emerald-500 rounded-full shrink-0" />
                        <div>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Subject Knowledge</h3>
                          <p className="text-4xl sm:text-5xl font-black italic tracking-tighter leading-none">84%</p>
                          <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase mt-2">Mastery of raw sanitation facts</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 sm:gap-6">
                        <div className="h-12 sm:h-16 w-1.5 sm:w-2 bg-red-500 rounded-full shrink-0" />
                        <div>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2">Linguistic Traps</h3>
                          <p className="text-4xl sm:text-5xl font-black italic tracking-tighter text-red-500 leading-none">42%</p>
                          <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase mt-2">Rate of falling for distractors</p>
                        </div>
                      </div>
                    </div>
                </div>
              </div>

              <div className="bg-slate-50/50 border border-slate-100 rounded-[2.5rem] sm:rounded-[3rem] p-10 sm:p-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 sm:mb-10 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter">Confidence Index</h2>
                  </div>
                  <div className="max-w-xs">
                     <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 leading-tight uppercase tracking-widest text-right">
                        Mapping the <span className="text-red-500">Psychological Hazard Zone</span>
                     </p>
                  </div>
                </div>
                
                <div className="h-48 sm:h-64 w-full border-l-4 border-b-4 border-slate-200 relative mt-8 sm:mt-12 mb-8 sm:mb-12">
                   <div className="absolute bottom-0 left-0 w-full h-full grid grid-cols-2 grid-rows-2 opacity-20">
                      <div className="border border-slate-300 bg-red-100" />
                      <div className="border border-slate-300 bg-emerald-100" />
                      <div className="border border-slate-300 bg-slate-100" />
                      <div className="border border-slate-300 bg-amber-100" />
                   </div>
                   <div className="absolute top-4 sm:top-8 right-6 sm:right-12 h-5 w-5 sm:h-6 sm:w-6 bg-red-500 rounded-full animate-pulse shadow-lg sm:shadow-xl shadow-red-200 flex items-center justify-center">
                      <div className="h-2 w-2 bg-white rounded-full" />
                   </div>
                   <div className="absolute bottom-12 sm:bottom-16 left-16 sm:left-20 h-3 w-3 sm:h-4 sm:w-4 bg-amber-500 rounded-full opacity-60" />
                   <div className="absolute bottom-20 sm:bottom-24 left-24 sm:left-28 h-3 w-3 sm:h-4 sm:w-4 bg-amber-500 rounded-full opacity-60" />
                   <div className="absolute top-12 sm:top-16 right-16 sm:right-20 h-3 w-3 sm:h-4 sm:w-4 bg-emerald-500 rounded-full" />
                   
                   <span className="absolute -left-4 top-1/2 -rotate-90 text-[8px] sm:text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] sm:tracking-[0.4em] origin-left">Accuracy</span>
                   <span className="absolute bottom-[-2.5rem] left-1/2 -translate-x-1/2 text-[8px] sm:text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] sm:tracking-[0.4em]">Confidence</span>
                </div>
                <div className="bg-white p-5 rounded-xl sm:rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 mt-12 lg:mt-0">
                   <p className="text-[10px] font-black uppercase text-red-500 mb-2">Institutional Advisory</p>
                   <p className="text-[10px] sm:text-xs text-slate-600 font-bold leading-relaxed italic border-l-2 border-red-500/20 pl-4">
                      "Students in the <span className="text-red-600 font-black italic underline">Target Hazard Zone</span> exhibit high confidence with low accuracy. These 'Dangerous Guessers' trigger immediate test-day failure."
                   </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "risk" && (
            <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-12 lg:p-16 shadow-sm">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 sm:mb-12 gap-8">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-red-50 flex items-center justify-center">
                      <Users className="h-6 w-6 sm:h-7 sm:w-7 text-red-500" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase italic tracking-tighter">Attrition Risk</h2>
                      <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Individual Sentinel Monitor</p>
                    </div>
                  </div>
                  <button className="w-full sm:w-auto bg-red-500 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-100">
                    Notify Faculty
                  </button>
               </div>
               
               <div className="space-y-4 sm:space-y-6">
                  {redFlagStudents.map((s) => (
                    <div 
                      key={s.name} 
                      className="group p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] bg-slate-50 border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6 hover:border-red-200 transition-all hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50"
                    >
                      <div className="flex items-center gap-5 sm:gap-8 w-full sm:w-auto">
                        <div className="h-14 w-14 sm:h-20 sm:w-20 rounded-[1.5rem] sm:rounded-[2rem] bg-white shadow-xl shadow-slate-200/50 flex items-center justify-center text-xl sm:text-3x font-black text-primary border border-slate-100 group-hover:scale-105 transition-transform">
                          {s.name.split(' ').pop()?.[0]}
                        </div>
                        <div className="space-y-1 sm:space-y-2">
                           <button 
                             onClick={() => setSelectedStudent(s)}
                             className="text-lg sm:text-2xl font-black text-slate-900 leading-tight hover:text-primary transition-colors text-left"
                           >
                              {s.name}
                           </button>
                           <div className="flex items-center gap-3">
                              <span className="text-[9px] sm:text-[10px] px-3 py-1 rounded-full bg-red-100 text-red-700 font-black uppercase tracking-widest">{s.risk} Risk</span>
                              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cause: {s.reason}</span>
                           </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-10 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                         <div className="text-right">
                           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Audit Score</p>
                           <p className="text-2xl sm:text-4xl font-black text-red-600 italic tracking-tighter leading-none">{s.score}</p>
                         </div>
                         <button 
                           onClick={() => setSelectedStudent(s)}
                           className="h-14 sm:h-16 w-14 sm:w-16 rounded-[1.5rem] sm:rounded-[2rem] bg-slate-950 text-white flex items-center justify-center hover:bg-primary transition-all shadow-xl shadow-slate-200 group-hover:translate-x-2"
                         >
                            <ArrowRight className="h-6 w-6" />
                         </button>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {/* Individual Student Intelligence (ISI) Deep-Dive Modal */}
          {selectedStudent && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div 
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" 
                onClick={() => setSelectedStudent(null)}
              />
              <div className="relative w-full max-w-2xl bg-white rounded-[3rem] p-8 sm:p-12 shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="absolute top-0 right-0 h-48 w-48 bg-primary/5 rounded-bl-[5rem] -mr-12 -mt-12" />
                
                <div className="relative z-10 space-y-10">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-6">
                      <div className="h-20 w-20 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-3xl font-black text-primary shadow-xl shadow-slate-200/50">
                        {selectedStudent.name.split(' ').pop()?.[0]}
                      </div>
                      <div>
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-950 leading-none mb-2">{selectedStudent.name}</h2>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-red-100 text-red-700 rounded-full">{selectedStudent.risk} Attrition Risk</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active: {selectedStudent.details.lastActive}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedStudent(null)}
                      className="p-2 hover:bg-slate-50 rounded-full transition-colors"
                    >
                      <XCircle className="h-8 w-8 text-slate-300" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-slate-50 border border-slate-100 p-6 rounded-[2rem] space-y-4 shadow-sm">
                      <div className="flex items-center gap-3 text-primary">
                        <BookOpen className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Exam Prep Performance</span>
                      </div>
                      <p className="text-4xl font-black italic tracking-tighter text-slate-950 leading-none">{selectedStudent.details.examPrep}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mastery of state board pool</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 p-6 rounded-[2rem] space-y-4 shadow-sm">
                      <div className="flex items-center gap-3 text-emerald-600">
                        <ShieldAlert className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Board Preparedness</span>
                      </div>
                      <p className="text-4xl font-black italic tracking-tighter text-emerald-600 leading-none">{selectedStudent.details.preparedness}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Licensure pass probability</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3 text-primary">
                      <Brain className="h-5 w-5" />
                      <h3 className="text-lg font-black uppercase italic tracking-tighter">Strategic Gap Analysis</h3>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-8 rounded-[2rem] shadow-sm">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Critical Struggle Clusters</p>
                      <div className="flex flex-wrap gap-3">
                        {selectedStudent.details.struggleSubjects.map(subject => (
                          <div key={subject} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm transition-transform hover:scale-105 cursor-default">
                            {subject}
                          </div>
                        ))}
                      </div>
                      <div className="mt-8 pt-6 border-t border-slate-200">
                        <p className="text-xs font-bold text-slate-500 leading-relaxed italic">
                          "Student consistently triggers syntax errors in <span className="text-primary font-black">{selectedStudent.details.struggleSubjects[0]}</span>. Identified as a high-priority institutional intervention node."
                        </p>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setIsRegisterModalOpen(true)}
                    className="w-full bg-slate-950 text-white hover:bg-primary py-8 rounded-[1.5rem] text-sm font-black uppercase tracking-[0.3em] transition-all shadow-2xl shadow-slate-200 hover:shadow-primary/20 flex items-center justify-center gap-3 active:scale-[0.98]"
                  >
                    Claim Student & Activate Portal
                    <Zap className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tactical" && (
            <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="bg-primary text-white rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-12 lg:p-16 shadow-2xl shadow-primary/20 relative overflow-hidden">
                  <div className="absolute bottom-0 right-0 h-64 w-64 sm:h-96 sm:w-96 bg-white/5 rounded-full -mb-24 -mr-24 blur-[80px] sm:blur-[100px]" />
                  <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-10">
                        <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl bg-white/20 flex items-center justify-center translate-y-[-2px]">
                          <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-white animate-pulse" />
                        </div>
                        <div>
                          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase italic tracking-tighter leading-none">Tactical Briefing</h2>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 mt-2">Neural Algorithm Output v2.4</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4 sm:space-y-6">
                         {[
                           { label: "High-Priority Morning/Afternoon Lab", content: "Porosity vs. Texture Logic", meta: "AI Model: Strategic Correction Node" },
                           { label: "Strategic Subject Material", content: "Milady Ch. 12, Page 412", meta: "Derived from PSI Section 4 Failure Cluster" },
                           { label: "Neural Drill Strategy", content: "Force 10-Question Sprint", meta: "Syntax Trap Focus: Chemical Services" }
                         ].map((item) => (
                           <div key={item.label} className="bg-white/10 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 group hover:bg-white/20 transition-all cursor-default">
                              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-white/50 mb-2">{item.label}</p>
                              <p className="text-lg sm:text-xl font-bold leading-tight mb-2 tracking-tight">{item.content}</p>
                              <p className="text-[9px] sm:text-[10px] uppercase font-bold text-white/80 italic leading-none flex items-center gap-2">
                                <Zap className="h-3 w-3 text-white" />
                                {item.meta}
                              </p>
                           </div>
                         ))}
                      </div>

                      <div className="mt-10 sm:mt-12 flex justify-center">
                         <button 
                           onClick={() => setIsAIResponseOpen(true)}
                           className="group w-full sm:w-auto bg-white text-slate-950 px-10 py-6 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-slate-900 hover:text-white transition-all shadow-2xl relative overflow-hidden active:scale-[0.98]"
                         >
                            <span className="relative z-10 flex items-center gap-3">
                              ASK AI for strategic course of action
                              <Sparkles className="h-4 w-4 text-primary group-hover:text-white transition-colors" />
                            </span>
                         </button>
                      </div>
                      
                      <div className="mt-8 text-center">
                        <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest leading-relaxed">
                          Note: Tactical recommendations are reactively generated based on real-time <br /> student intelligence portal telemetry.
                        </p>
                      </div>
                  </div>
               </div>
            </div>
          )}

        </div>

        {/* Closing Disclaimer */}
        <div className="mt-16 sm:mt-20 text-center px-4">
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-vario-[0.4em] sm:tracking-[0.5em] text-slate-400 leading-relaxed">
                Sovereign Intelligence Alignment Engine © 2026 <br /> Inner G Complete Agency
            </p>
        </div>
      </div>

      {/* AI Strategic fulfillment Modal */}
      <AnimatePresence>
        {isAIResponseOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl" 
              onClick={() => setIsAIResponseOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] outline-none"
            >
              <div className="p-8 sm:p-12 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter">Strategic Intelligence Response</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Autonomous Course of Action Alignment</p>
                  </div>
                </div>
                <button onClick={() => setIsAIResponseOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-100">
                  <X className="h-6 w-6 text-slate-300" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 sm:p-12 space-y-10 no-scrollbar">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-primary">
                    <Brain className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Neural Diagnosis Summary</span>
                  </div>
                  <p className="text-sm sm:text-base font-bold text-slate-600 leading-relaxed italic">
                    "Your cohort is currently exhibiting a <span className="text-red-500">Syntax-Knowledge Decoupling</span> within the Chemical Services domain. While raw fact recall is at 84%, the application resilience is failing against distractors involving processing times and pH balance indicators."
                  </p>
                </div>

                <div className="space-y-8">
                  <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b border-slate-200 pb-4">Tier-1 Strategic Correction</h4>
                    <div className="space-y-4">
                      <p className="text-xs sm:text-sm font-bold text-slate-700 leading-relaxed">
                        <span className="text-primary mr-2">Step 01:</span> Implement a 'Reverse-Logic' lab session. Instead of asking for the correct pH, have students identify the three most common 'Linguistic Traps' in the PSI pool.
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-slate-700 leading-relaxed">
                        <span className="text-primary mr-2">Step 02:</span> Pivot morning drills to focus exclusively on 'Exposure Incidents'. Tactical data indicates a 15% confidence lag in antiseptic application sequences.
                      </p>
                    </div>
                  </div>

                  <div className="bg-primary/5 p-8 rounded-[2rem] border border-primary/10 space-y-4">
                    <div className="flex items-center gap-3 text-primary">
                      <Target className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Expected Outcome</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-slate-700 leading-relaxed">
                      By isolating the linguistic traps, we project a <span className="text-primary font-black">+12% increase</span> in class confidence indices within 48 hours, effectively moving 2 students out of the 'Dangerous Guesser' hazard zone.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 sm:p-10 bg-slate-50 border-t border-slate-100 flex items-center justify-center">
                <button 
                  onClick={() => {
                    setIsAIResponseOpen(false)
                    setIsRegisterModalOpen(true)
                  }}
                  className="group w-full bg-slate-950 text-white hover:bg-primary py-7 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-2xl flex items-center justify-center gap-3"
                >
                  Download/Copy Strategic Response
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Institutional Registration Bridge Modal */}
      <AnimatePresence>
        {isRegisterModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl" 
              onClick={() => setIsRegisterModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden outline-none"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-primary to-primary/50" />
              
              <div className="p-8 sm:p-12 overflow-y-auto max-h-[90vh] no-scrollbar">
                <div className="flex justify-between items-start mb-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <ShieldAlert className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Sovereign Protocol Engagement</span>
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-950 leading-none">
                        {isLoginView ? "Authorized Login" : "Institutional Setup"}
                      </h2>
                      <p className="text-slate-500 font-bold text-xs tracking-tight">
                        {isLoginView 
                          ? "Access your sovereign instructor telemetry dashboard." 
                          : "Configure your node to claim student intelligence protocols."}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsRegisterModalOpen(false)}
                    className="p-2 hover:bg-slate-50 rounded-full transition-colors"
                  >
                    <X className="h-6 w-6 text-slate-300" />
                  </button>
                </div>

                <form className="space-y-6" onSubmit={handleRegister}>
                  <AnimatePresence mode="wait">
                    {!isLoginView ? (
                      <motion.div 
                        key="register"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">First Name</label>
                            <input type="text" required placeholder="First" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-4 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Last Name</label>
                            <input type="text" required placeholder="Last" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-4 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none" />
                          </div>
                        </div>

                        <BarberSchoolSelector 
                          onSelect={(data) => setSchoolData(data)} 
                        />

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Official Email Address</label>
                          <input type="email" required placeholder="instructor@school.edu" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-4 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none" />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Professional Institutional Role</label>
                          <div className="grid grid-cols-1 gap-3">
                              {[
                                  { id: "instructor", label: "Barber Instructor", sub: "I manage active training cohorts" },
                                  { id: "owner", label: "School Owner", sub: "I manage multi-node institutional assets" }
                              ].map((role) => (
                                  <button
                                      key={role.id}
                                      type="button"
                                      onClick={() => setRegUserRole(role.id as any)}
                                      className={cn(
                                          "flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left",
                                          regUserRole === role.id 
                                              ? "border-primary bg-primary/5 ring-2 ring-primary/5" 
                                              : "border-slate-100 bg-slate-50 hover:border-slate-200"
                                      )}
                                  >
                                      <span className="text-xs font-black uppercase tracking-tight text-slate-950">{role.label}</span>
                                      <span className="text-[10px] font-bold text-slate-400 leading-none mt-1">{role.sub}</span>
                                  </button>
                              ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Secure Contact Number</label>
                          <div className="flex gap-3 px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl">
                            <Smartphone className="h-5 w-5 text-slate-400 shrink-0" />
                            <input 
                              type="tel" 
                              required 
                              placeholder="(555) 000-0000" 
                              value={formData.phone}
                              onChange={(e) => setFormData({...formData, phone: e.target.value})}
                              className="w-full bg-transparent text-sm font-bold focus:ring-0 transition-all outline-none" 
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Create Secure Password</label>
                          <div className="flex gap-3 px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl">
                            <ShieldCheck className="h-5 w-5 text-slate-400 shrink-0" />
                            <input 
                              type="password" 
                              required 
                              minLength={6}
                              placeholder="••••••••" 
                              value={formData.password}
                              onChange={(e) => setFormData({...formData, password: e.target.value})}
                              className="w-full bg-transparent text-sm font-bold focus:ring-0 transition-all outline-none" 
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirm Secure Password</label>
                          <div className="flex gap-3 px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl">
                            <ShieldCheck className="h-5 w-5 text-slate-400 shrink-0" />
                            <input 
                              type="password" 
                              required 
                              minLength={6}
                              placeholder="••••••••" 
                              value={formData.confirmPassword}
                              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                              className="w-full bg-transparent text-sm font-bold focus:ring-0 transition-all outline-none" 
                            />
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="login"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                      >
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Official Email Address</label>
                          <input type="email" required placeholder="instructor@school.edu" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-4 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Authentication Credentials</label>
                          <input type="password" required placeholder="••••••••" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-4 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="pt-6 space-y-6">
                    {!isLoginView && (
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-200 text-primary focus:ring-primary" required />
                        <span className="text-[9px] text-slate-500 font-bold leading-relaxed group-hover:text-slate-900 transition-colors cursor-pointer">
                          I consent to institutional telemetry tracking and agree to the <Link href="/terms-of-service" className="text-primary underline">Terms of Protocol Engagement</Link>. I agree to receive tactical SMS updates regarding cohort performance.
                        </span>
                      </label>
                    )}

                    <Button 
                      disabled={isRegistering}
                      className="w-full bg-slate-950 text-white hover:bg-primary py-8 text-sm font-black uppercase tracking-[0.3em] rounded-2xl transition-all shadow-2xl shadow-slate-200"
                    >
                      {isRegistering ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Initializing Architecture...
                        </>
                      ) : (
                        <>
                          {isLoginView ? "Initialize Dashboard" : "Claim Your Student Portals"}
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
                        {isLoginView ? "Register Institutional Node" : "Existing Node? Login"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </main>
  )
}
