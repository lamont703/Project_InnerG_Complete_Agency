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
  Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"

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

interface Props {
  projectSlug?: string;
}

export default function InstructorIntelligenceDashboard({ projectSlug }: Props) {
  const [activeTab, setActiveTab] = React.useState("overview")
  const [selectedStudent, setSelectedStudent] = React.useState<typeof redFlagStudents[0] | null>(null)
  const [isAIResponseOpen, setIsAIResponseOpen] = React.useState(false)

  const tabs = [
    { id: "overview", label: "Overview", icon: Target },
    { id: "mastery", label: "Student Performance", icon: BarChart3 },
    { id: "syntax", label: "Syntax Logic", icon: Brain },
    { id: "risk", label: "Attrition Risk", icon: Users },
    { id: "tactical", label: "Tactical Brief", icon: Zap },
  ]

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/30 overflow-hidden">
      {/* Tab Navigation - Horizontal Scroll for Mobile */}
      <div className="flex border-b border-slate-100 bg-white sticky top-0 z-20 overflow-x-auto no-scrollbar px-6 lg:px-10">
        <div className="flex gap-4 sm:gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 py-6 px-4 border-b-4 transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "border-primary text-slate-900" 
                  : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              <tab.icon className={cn("h-4 w-4", activeTab === tab.id ? "text-primary" : "text-slate-300")} />
              <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12">
        <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12">
          {activeTab === "overview" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm">
                    <p className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Cohort Prediction</p>
                    <p className="text-3xl sm:text-4xl font-black italic text-slate-950 leading-none">72.4%</p>
                    <div className="mt-4 sm:mt-6 flex items-center gap-2 text-emerald-600">
                      <ArrowUpRight className="h-3 w-3 sm:h-4 w-4" />
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">+4.2% week-over-week</span>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm">
                    <p className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Student Confidence</p>
                    <p className="text-3xl sm:text-4xl font-black italic text-slate-950 leading-none">High</p>
                    <div className="mt-4 sm:mt-6 flex items-center gap-2 text-primary">
                      <Zap className="h-3 w-3 sm:h-4 w-4" />
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Velocity Peak Detected</span>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm sm:col-span-2 lg:col-span-1">
                    <p className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Attrition High-Risk</p>
                    <p className="text-3xl sm:text-4xl font-black italic text-red-600 leading-none">03</p>
                    <div className="mt-4 sm:mt-6 flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-3 w-3 sm:h-4 w-4" />
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Intervention Required</span>
                    </div>
                  </div>
               </div>

                <div className="bg-primary text-white rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-12 shadow-2xl shadow-primary/20 relative overflow-hidden">
                   <div className="absolute top-0 right-0 h-48 w-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-[80px]" />
                   <div className="h-20 w-20 sm:h-28 sm:w-28 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/20">
                     <Brain className="h-10 w-10 sm:h-14 sm:w-14 text-white animate-pulse" />
                   </div>
                   <div className="space-y-6 relative z-10 text-center md:text-left">
                     <h3 className="text-2xl sm:text-4xl font-black uppercase italic tracking-tighter leading-tight">Aesthetic Intelligence Briefing</h3>
                     <p className="text-sm sm:text-lg font-bold leading-relaxed opacity-95 max-w-2xl italic">
                       "Cognitive mapping reveals a systemic <span className="text-white underline decoration-white/30 underline-offset-4">Syntax-Knowledge Decoupling</span> in Chemical Services. Clinical intervention is mandatory to bridge the clinical reasoning delta within the next training block."
                     </p>
                   </div>
                </div>
            </div>
          )}

          {activeTab === "mastery" && (
            <div className="bg-white border border-slate-200 rounded-[3rem] p-8 sm:p-12 lg:p-16 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 sm:mb-12 gap-6 sm:gap-8">
                 <div className="flex items-center gap-4 sm:gap-5">
                   <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                       <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                   </div>
                   <div>
                    <h2 className="text-xl sm:text-3xl lg:text-4xl font-black uppercase italic tracking-tighter leading-tight">Student Performance Heatmap</h2>
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Real-Time Feedback Aggregation</p>
                   </div>
                 </div>
                 <div className="max-w-md">
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 leading-relaxed italic border-l-2 border-primary/20 pl-4 sm:pl-6">
                       "Performance aggregated across all <span className="text-primary font-black uppercase italic">Enrolled Portals</span>. This heatmap synchronizes every student's interaction into high-fidelity institutional intelligence."
                    </p>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                {topicMastery.map((topic) => (
                  <div key={topic.name} className="space-y-4">
                    <div className="flex justify-between items-end gap-4">
                      <div className="flex flex-col">
                        <span className="text-lg font-black text-slate-700 leading-tight">{topic.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{topic.items} Exam Items</span>
                      </div>
                      <span className={`text-2xl font-black ${topic.score < 70 ? 'text-red-600' : 'text-emerald-600'}`}>{topic.score}%</span>
                    </div>
                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
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
            <div className="flex flex-col gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-slate-950 rounded-[3rem] p-10 sm:p-16 text-white relative overflow-hidden flex flex-col justify-center shadow-2xl">
                <div className="absolute top-0 right-0 h-64 w-64 bg-primary/10 rounded-full -mr-24 -mt-24 blur-[100px]" />
                <div className="relative z-10 space-y-12">
                    <div className="space-y-6">
                       <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                             <Brain className="h-6 w-6 text-primary" />
                          </div>
                          <h2 className="text-2xl sm:text-4xl font-black uppercase italic tracking-tighter leading-none">Syntax Reports</h2>
                       </div>
                       <p className="text-xs sm:text-sm font-bold text-slate-400 leading-relaxed italic border-l-2 border-primary/40 pl-6 max-w-sm">
                          "Measuring the delta between <span className="text-primary font-black uppercase">Fact Recall</span> vs. <span className="text-white font-black uppercase">Application Logic</span>. Detect clinical reasoning failures within distilled exam-trap pools."
                       </p>
                    </div>

                    <div className="space-y-8 sm:space-y-12">
                      <div className="flex items-start gap-4 sm:gap-8">
                        <div className="h-16 sm:h-20 w-1.5 sm:w-2.5 bg-emerald-500 rounded-full shrink-0" />
                        <div>
                          <h3 className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-emerald-500 mb-2 sm:mb-3">Subject Knowledge</h3>
                          <p className="text-4xl sm:text-7xl font-black italic tracking-tighter leading-none">84%</p>
                          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase mt-2 sm:mt-4">Mastery of raw facts</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 sm:gap-8">
                        <div className="h-16 sm:h-20 w-1.5 sm:w-2.5 bg-red-500 rounded-full shrink-0" />
                        <div>
                          <h3 className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-red-500 mb-2 sm:mb-3">Linguistic Traps</h3>
                          <p className="text-4xl sm:text-7xl font-black italic tracking-tighter text-red-500 leading-none">42%</p>
                          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase mt-2 sm:mt-4">Resilience vs distillates</p>
                        </div>
                      </div>
                    </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-[3rem] p-10 sm:p-16 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 sm:mb-12 gap-6">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <h2 className="text-xl sm:text-3xl lg:text-4xl font-black uppercase italic tracking-tighter leading-none">Confidence Index</h2>
                  </div>
                  <div className="max-w-xs sm:text-right">
                     <p className="text-[9px] sm:text-[10px] font-black text-slate-400 leading-tight uppercase tracking-[0.2em]">
                        Mapping the <span className="text-red-500">Psychological Hazard Zone</span>
                     </p>
                  </div>
                </div>
                
                <div className="h-64 sm:h-80 w-full border-l-4 border-b-4 border-slate-100 relative mt-12 mb-12">
                   <div className="absolute bottom-0 left-0 w-full h-full grid grid-cols-2 grid-rows-2 opacity-10">
                      <div className="border border-slate-200 bg-red-50" />
                      <div className="border border-slate-200 bg-emerald-50" />
                      <div className="border border-slate-200 bg-slate-50" />
                      <div className="border border-slate-200 bg-amber-50" />
                   </div>
                   {/* Hazard Pulse */}
                   <div className="absolute top-8 right-12 h-8 w-8 bg-red-500 rounded-full animate-pulse shadow-2xl shadow-red-200 flex items-center justify-center">
                      <div className="h-3 w-3 bg-white rounded-full" />
                   </div>
                   {/* Data Nodes */}
                   <div className="absolute bottom-20 left-20 h-4 w-4 bg-amber-500 rounded-full opacity-60" />
                   <div className="absolute bottom-32 left-32 h-4 w-4 bg-amber-500 rounded-full opacity-60" />
                   <div className="absolute top-20 right-28 h-4 w-4 bg-emerald-500 rounded-full" />
                   
                   <span className="absolute -left-5 top-1/2 -rotate-90 text-[10px] font-black uppercase text-slate-300 tracking-[0.5em] origin-left">Accuracy</span>
                   <span className="absolute bottom-[-3rem] left-1/2 -translate-x-1/2 text-[10px] font-black uppercase text-slate-300 tracking-[0.5em]">Confidence</span>
                </div>
                
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                   <p className="text-[10px] font-black uppercase text-red-500 mb-3 tracking-widest">Institutional Advisory</p>
                   <p className="text-xs text-slate-600 font-bold leading-relaxed italic border-l-2 border-red-500/20 pl-5">
                      "Students in the <span className="text-red-600 font-black italic underline underline-offset-4">Target Hazard Zone</span> exhibit high confidence with low accuracy. These 'Dangerous Guessers' trigger immediate test-day failure."
                   </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "risk" && (
            <div className="bg-white border border-slate-200 rounded-[3rem] p-8 sm:p-12 lg:p-16 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 sm:mb-12 gap-6 sm:gap-8">
                  <div className="flex items-center gap-4 sm:gap-5">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
                       <Users className="h-6 w-6 sm:h-7 sm:w-7 text-red-500" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-3xl lg:text-4xl font-black uppercase italic tracking-tighter leading-tight">Attrition High-Risk</h2>
                      <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sovereign Performance Overrides</p>
                    </div>
                  </div>
                  <div className="max-w-md">
                     <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 leading-relaxed italic border-l-2 border-red-500/20 pl-4 sm:pl-6">
                        "Identifying recursive failure logic in the cohort pipeline. Intervention protocols are prioritized by licensure pass probability impact."
                     </p>
                  </div>
               </div>

               <div className="space-y-6">
                  {redFlagStudents.map((s) => (
                    <div 
                      key={s.name} 
                      className="group p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] bg-slate-50 border border-slate-100 flex flex-col sm:flex-row items-center sm:items-center justify-between gap-6 sm:gap-8 hover:border-red-200 transition-all hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50"
                    >
                      <div className="flex items-center gap-4 sm:gap-8 w-full sm:w-auto">
                        <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-[1.5rem] sm:rounded-[2rem] bg-white shadow-lg shadow-slate-200/50 flex items-center justify-center text-2xl sm:text-3xl font-black text-primary border border-slate-100 group-hover:scale-105 transition-transform shrink-0">
                          {s.name.split(' ').pop()?.[0]}
                        </div>
                        <div className="min-w-0">
                           <button 
                             onClick={() => setSelectedStudent(s)}
                             className="text-lg sm:text-2xl font-black text-slate-900 leading-tight hover:text-primary transition-colors text-left block w-full"
                           >
                              {s.name}
                           </button>
                           <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 sm:mt-2">
                              <span className="text-[9px] px-3 py-1 rounded-full bg-red-100 text-red-700 font-black uppercase tracking-widest">{s.risk} Risk</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{s.reason}</span>
                           </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-8 sm:gap-12 w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                         <div className="text-right">
                           <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Audit Score</p>
                           <p className="text-3xl sm:text-4xl font-black text-red-600 italic tracking-tighter leading-none">{s.score}</p>
                         </div>
                         <button 
                           onClick={() => setSelectedStudent(s)}
                           className="h-14 w-14 sm:h-16 sm:w-16 rounded-[1.5rem] sm:rounded-[2rem] bg-slate-950 text-white flex items-center justify-center hover:bg-primary transition-all shadow-xl shadow-slate-200 group-hover:translate-x-2 shrink-0"
                         >
                            <ArrowRight className="h-6 w-6 sm:h-7 sm:w-7" />
                         </button>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === "tactical" && (
            <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="bg-primary text-white rounded-[3rem] p-10 sm:p-16 lg:p-20 shadow-2xl shadow-primary/20 relative overflow-hidden">
                  <div className="absolute bottom-0 right-0 h-96 w-96 bg-white/5 rounded-full -mb-32 -mr-32 blur-[120px]" />
                  <div className="relative z-10">
                      <div className="flex items-center gap-4 sm:gap-6 mb-10 sm:mb-12">
                        <div className="h-14 w-14 sm:h-20 sm:w-20 rounded-2xl bg-white/20 flex items-center justify-center translate-y-[-2px] shrink-0">
                          <Sparkles className="h-7 w-7 sm:h-10 sm:w-10 text-white animate-pulse" />
                        </div>
                        <div>
                          <h2 className="text-2xl sm:text-5xl font-black uppercase italic tracking-tighter leading-none">Tactical Briefing</h2>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-white/60 mt-2 sm:mt-3">Neural Algorithm Output v2.4</p>
                        </div>
                      </div>
                      
                      <div className="space-y-6 sm:space-y-8">
                         {[
                           { label: "High-Priority Morning/Afternoon Lab", content: "Porosity vs. Texture Logic", meta: "AI Model: Strategic Correction Node" },
                           { label: "Strategic Subject Material", content: "Milady Ch. 12, Page 412", meta: "Derived from PSI Section 4 Failure Cluster" },
                           { label: "Neural Drill Strategy", content: "Force 10-Question Sprint", meta: "Syntax Trap Focus: Chemical Services" }
                         ].map((item) => (
                           <div key={item.label} className="bg-white/10 p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 group hover:bg-white/20 transition-all cursor-default">
                              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-white/50 mb-2 sm:mb-3">
                                {item.label}
                              </p>
                              <p className="text-lg sm:text-2xl font-bold leading-tight mb-3 tracking-tight">{item.content}</p>
                              <p className="text-[9px] sm:text-[10px] uppercase font-bold text-white/80 italic leading-none flex items-center gap-2 sm:gap-3">
                                <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                                {item.meta}
                              </p>
                           </div>
                         ))}
                      </div>

                      <div className="mt-12 sm:mt-16 flex justify-center">
                         <button 
                           onClick={() => setIsAIResponseOpen(true)}
                           className="group w-full sm:w-auto bg-white text-slate-950 px-12 py-8 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.4em] hover:bg-slate-900 hover:text-white transition-all shadow-2xl relative overflow-hidden active:scale-[0.98]"
                         >
                            <span className="relative z-10 flex items-center gap-4">
                              ASK AI for strategic course of action
                              <Sparkles className="h-5 w-5 text-primary group-hover:text-white transition-colors" />
                            </span>
                         </button>
                      </div>
                      
                      <div className="mt-10 text-center">
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-relaxed opacity-60">
                          Tactical recommendations are reactively generated based on real-time <br /> cohort intelligence portal telemetry within your institution.
                        </p>
                      </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Individual Student Intelligence (ISI) Deep-Dive Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" 
              onClick={() => setSelectedStudent(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-16 shadow-2xl border border-slate-100 overflow-hidden outline-none max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="absolute top-0 right-0 h-48 w-48 sm:h-64 sm:w-64 bg-primary/5 rounded-bl-[6rem] sm:rounded-bl-[8rem] -mr-12 -mt-12 sm:-mr-16 sm:-mt-16" />
              
              <div className="relative z-10 space-y-10 sm:space-y-12">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 text-center sm:text-left">
                    <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-[1.5rem] sm:rounded-[2.5rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-3xl sm:text-4xl font-black text-primary shadow-xl shadow-slate-200/50 shrink-0">
                      {selectedStudent.name.split(' ').pop()?.[0]}
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-4xl font-black uppercase italic tracking-tighter text-slate-950 leading-none mb-3">{selectedStudent.name}</h2>
                      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                        <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest px-3 py-1 bg-red-100 text-red-700 rounded-full">{selectedStudent.risk} Risk</span>
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Active: {selectedStudent.details.lastActive}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedStudent(null)} className="p-1 hover:bg-slate-50 rounded-full transition-colors shrink-0">
                    <XCircle className="h-8 w-8 sm:h-10 sm:w-10 text-slate-200" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                  <div className="bg-slate-50 border border-slate-100 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-4 sm:space-y-5 shadow-sm">
                    <div className="flex items-center gap-3 sm:gap-4 text-primary">
                      <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest">Exam Perf.</span>
                    </div>
                    <p className="text-4xl sm:text-5xl font-black italic tracking-tighter text-slate-950 leading-none">{selectedStudent.details.examPrep}</p>
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none opacity-60">Board pool mastery</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-4 sm:space-y-5 shadow-sm">
                    <div className="flex items-center gap-3 sm:gap-4 text-emerald-600">
                      <ShieldAlert className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest">Ready Status</span>
                    </div>
                    <p className="text-4xl sm:text-5xl font-black italic tracking-tighter text-emerald-600 leading-none">{selectedStudent.details.preparedness}</p>
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none opacity-60">Licensure probability</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex items-center gap-4 text-primary">
                    <Brain className="h-6 w-6" />
                    <h3 className="text-xl font-black uppercase italic tracking-tighter">Strategic Gap Analysis</h3>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-10 rounded-[3rem] shadow-sm">
                    <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-6">Critical Struggle Clusters</p>
                    <div className="flex flex-wrap gap-4">
                      {selectedStudent.details.struggleSubjects.map(subject => (
                        <div key={subject} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 shadow-sm transition-transform hover:scale-105 cursor-default">
                          {subject}
                        </div>
                      ))}
                    </div>
                    <div className="mt-10 pt-8 border-t border-slate-200">
                      <p className="text-xs sm:text-sm font-bold text-slate-500 leading-relaxed italic border-l-2 border-primary/20 pl-6">
                        "Student exhibiting recurring cognitive blocks in <span className="text-primary font-black uppercase italic">{selectedStudent.details.struggleSubjects[0]}</span>. Identified as a high-priority institutional intervention node."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              className="relative w-full max-w-2xl bg-white rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] outline-none"
            >
              <div className="p-10 sm:p-16 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-6">
                  <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/30">
                    <Sparkles className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">Strategic AI Insight</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Autonomous Course of Action Alignment</p>
                  </div>
                </div>
                <button onClick={() => setIsAIResponseOpen(false)} className="p-3 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-100">
                  <X className="h-8 w-8 text-slate-200" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 sm:p-16 space-y-12 no-scrollbar">
                <div className="space-y-8">
                  <div className="flex items-center gap-4 text-primary">
                    <Brain className="h-6 w-6" />
                    <span className="text-[11px] font-black uppercase tracking-[0.3em]">Neural Diagnosis Summary</span>
                  </div>
                  <p className="text-sm sm:text-lg font-bold text-slate-600 leading-relaxed italic border-l-2 border-primary/20 pl-6">
                    "Your cohort is currently exhibiting a <span className="text-red-500 font-black italic">Syntax-Knowledge Decoupling</span> within the Chemical Services domain. While fact recall is at 84%, the application resilience is failing against distractors involving processing times and pH balance indicators."
                  </p>
                </div>

                <div className="space-y-10">
                  <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 space-y-8 shadow-sm">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 border-b border-slate-200 pb-6">Tier-1 Strategic Correction</h4>
                    <div className="space-y-6">
                      <p className="text-sm sm:text-base font-bold text-slate-700 leading-relaxed">
                        <span className="text-primary mr-3 italic font-black">01 //</span> Implement a 'Reverse-Logic' lab session. Instead of asking for the correct pH, have students identify the three most common 'Linguistic Traps' in the PSI pool.
                      </p>
                      <p className="text-sm sm:text-base font-bold text-slate-700 leading-relaxed">
                        <span className="text-primary mr-3 italic font-black">02 //</span> Pivot morning drills to focus exclusively on 'Exposure Incidents'. Tactical data indicates a 15% confidence lag in antiseptic application sequences.
                      </p>
                    </div>
                  </div>

                  <div className="bg-primary/5 p-10 rounded-[3rem] border border-primary/10 space-y-6">
                    <div className="flex items-center gap-4 text-primary">
                      <Target className="h-5 w-5" />
                      <span className="text-[11px] font-black uppercase tracking-[0.3em]">Expected Outcome</span>
                    </div>
                    <p className="text-sm sm:text-base font-bold text-slate-700 leading-relaxed">
                      By isolating the linguistic traps, we project a <span className="text-primary font-black uppercase italic">+12% delta</span> in class confidence indices within 72 hours, effectively moving high-risk nodes out of the hazard zone.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-10 sm:p-12 bg-slate-50 border-t border-slate-100 flex items-center justify-center">
                <button 
                  onClick={() => setIsAIResponseOpen(false)}
                  className="group w-full bg-slate-950 text-white hover:bg-primary py-8 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.5em] transition-all shadow-2xl flex items-center justify-center gap-4 active:scale-[0.98]"
                >
                  Download Analysis PDF
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-2" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
