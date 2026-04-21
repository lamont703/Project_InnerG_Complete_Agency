"use client"

import React from "react"
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
  ArrowUpRight,
  BookOpen,
  Target,
  Zap
} from "lucide-react"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"

const topicMastery = [
  { name: "Sanitation & Safety", score: 42, color: "bg-red-500" },
  { name: "Anatomy & Physiology", score: 88, color: "bg-emerald-500" },
  { name: "Chemical Services", score: 65, color: "bg-amber-500" },
  { name: "State Laws & Licensing", score: 92, color: "bg-emerald-500" },
  { name: "Tool Safety", score: 71, color: "bg-emerald-500" },
]

const redFlagStudents = [
  { name: "Student A. Jackson", risk: "High", score: "54%", reason: "Syntax Deficit" },
  { name: "Student M. Rodriguez", risk: "Medium", score: "68%", reason: "Knowledge Gap" },
  { name: "Student L. Chen", risk: "High", score: "49%", reason: "Linguistic Barrier" },
]

export default function InstructorDashboard() {
  const [activeTab, setActiveTab] = React.useState("overview")

  const tabs = [
    { id: "overview", label: "Overview", icon: Target },
    { id: "mastery", label: "Subject Mastery", icon: BarChart3 },
    { id: "syntax", label: "Syntax Logic", icon: Brain },
    { id: "risk", label: "Attrition Risk", icon: Users },
    { id: "tactical", label: "Tactical Brief", icon: Zap },
  ]

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
                    <h3 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter leading-tight">ADI Protocol Briefing</h3>
                    <p className="text-xs sm:text-sm font-bold leading-relaxed opacity-90">
                      Cohort mastering content but failing clinical reasoning. 42% failure rate on 'Linguistic Trap' syntax. Switch focus from "What" to "Why" for the next 72 hours.
                    </p>
                    <button className="w-full sm:w-fit bg-white text-primary px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-950 hover:text-white transition-all">
                      Download Guide
                    </button>
                  </div>
               </div>
            </div>
          )}

          {activeTab === "mastery" && (
            <div className="bg-slate-50/50 border border-slate-100 rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-12 lg:p-16">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 sm:mb-12 gap-4">
                 <div className="flex items-center gap-4">
                   <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                   </div>
                   <div>
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase italic tracking-tighter">Mastery Heatmap</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Institutional Macro Analysis</p>
                   </div>
                 </div>
              </div>
              
              <div className="space-y-8 sm:space-y-10">
                {topicMastery.map((topic) => (
                  <div key={topic.name} className="space-y-3">
                    <div className="flex justify-between items-end gap-4">
                      <span className="text-base sm:text-lg font-black text-slate-700 leading-tight">{topic.name}</span>
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
                    <div className="flex items-center gap-4">
                       <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-white/10 flex items-center justify-center">
                          <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                       </div>
                       <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter">Syntax Reports</h2>
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
                <div className="flex items-center gap-4 mb-8 sm:mb-10">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter">Confidence Index</h2>
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
                <div className="bg-white p-4 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm mt-12 lg:mt-0">
                   <p className="text-[10px] font-black uppercase text-primary mb-1">Diagnostic Note</p>
                   <p className="text-[10px] sm:text-xs text-slate-600 font-bold leading-relaxed italic">
                      High volume of 'Confident Guessers'. Leads to immediate test-day failure.
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
               
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                  {redFlagStudents.map((s) => (
                    <div key={s.name} className="p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] bg-slate-50 border border-slate-100 flex flex-col h-full hover:border-red-200 transition-colors">
                      <div className="flex-1 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-lg sm:text-xl font-black text-primary">
                            {s.name.charAt(0)}
                          </div>
                          <span className="text-[8px] sm:text-[9px] px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-black uppercase">{s.risk} Risk</span>
                        </div>
                        <div>
                          <p className="text-base sm:text-lg font-black text-slate-900 leading-tight">{s.name}</p>
                          <p className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">Cause: {s.reason}</p>
                        </div>
                      </div>
                      <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-200 flex justify-between items-center">
                        <p className="text-xl sm:text-2xl font-black text-red-600 italic">{s.score}</p>
                        <button className="p-1.5 h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-white transition-all">
                           <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === "tactical" && (
            <div className="max-w-3xl mx-auto space-y-8">
               <div className="bg-primary text-white rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-12 lg:p-16 shadow-2xl shadow-primary/20 relative overflow-hidden">
                  <div className="absolute bottom-0 right-0 h-64 w-64 sm:h-96 sm:w-96 bg-white/5 rounded-full -mb-24 -mr-24 blur-[80px] sm:blur-[100px]" />
                  <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-10">
                        <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl bg-white/20 flex items-center justify-center">
                          <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase italic tracking-tighter">Tactical Briefing</h2>
                      </div>
                      
                      <div className="space-y-4 sm:space-y-6">
                         {[
                           { label: "High-Priority Morning Lab", content: "Porosity vs. Texture Logic", meta: "Detected failure cluster" },
                           { label: "Strategic Material", content: "Milady Ch. 12, Page 412", meta: "PSI Section 4 Alignment" },
                           { label: "Drill Strategy", content: "Force 10-Question Sprint", meta: "Syntax Trap Focus" }
                         ].map((item) => (
                           <div key={item.label} className="bg-white/10 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-white/10">
                              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-white/50 mb-2">{item.label}</p>
                              <p className="text-lg sm:text-xl font-bold leading-tight mb-2">{item.content}</p>
                              <p className="text-[9px] sm:text-[10px] uppercase font-bold text-primary italic leading-none">{item.meta}</p>
                           </div>
                         ))}
                      </div>

                      <div className="mt-10 sm:mt-12 flex justify-center">
                         <button className="w-full sm:w-auto bg-white text-slate-950 px-10 py-5 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-slate-900 hover:text-white transition-all shadow-xl">
                            Export Brief PDF
                         </button>
                      </div>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Closing Disclaimer */}
        <div className="mt-16 sm:mt-20 text-center px-4">
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] sm:tracking-[0.5em] text-slate-400 leading-relaxed">
                Sovereign Intelligence Alignment Engine © 2026 <br /> Inner G Complete Agency
            </p>
        </div>
      </div>

      <Footer />
    </main>
  )
}
