"use client"

import React from "react"
import { 
  ShieldCheck, 
  Users, 
  Activity, 
  BarChart3, 
  Zap, 
  HeartPulse, 
  UserPlus, 
  ArrowUpRight,
  Target,
  FileSpreadsheet,
  AlertCircle,
  Brain,
  CheckCircle2
} from "lucide-react"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"

const instructorBenchmarks = [
  { name: "Instructor A", class: "AM Session", fidelity: 94, velocity: "+12 days" },
  { name: "Instructor B", class: "PM Session", fidelity: 72, velocity: "-2 days" },
  { name: "Instructor C", class: "Full-Time", fidelity: 88, velocity: "+8 days" },
]

export default function AccreditationAuditor() {
  const [activeTab, setActiveTab] = React.useState("overview")

  const tabs = [
    { id: "overview", label: "Executive Overview", icon: ShieldCheck },
    { id: "fidelity", label: "Instructional Fidelity", icon: Activity },
    { id: "alignment", label: "Cognitive Alignment", icon: Brain },
    { id: "sentiment", label: "Sentiment Pulse", icon: HeartPulse },
    { id: "variance", label: "Cohort Variance", icon: BarChart3 },
  ]

  return (
    <main className="min-h-screen bg-white light text-slate-950 flex flex-col pt-20 selection:bg-primary/20">
      <Navbar />

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-12 lg:py-16">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 lg:mb-16 gap-6 lg:gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.4em] text-[10px]">
              <Target className="h-4 w-4" />
              Institutional Relationship Auditor
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black italic uppercase tracking-tighter text-slate-950 leading-tight">
              Accreditation <br className="hidden sm:block" />Relationship Auditor™
            </h1>
          </div>
          <div className="flex gap-4 w-full lg:w-auto">
            <div className="flex-1 lg:flex-none bg-slate-950 text-white p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] flex flex-col items-center justify-center min-w-[140px]">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Title IV Risk Level</span>
              <span className="text-2xl sm:text-3xl font-black text-primary italic">0.08%</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 mb-10 lg:mb-12 p-2 bg-slate-50 border border-slate-100 rounded-[2.5rem]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 sm:px-8 py-4 sm:py-5 rounded-[1.5rem] sm:rounded-[2rem] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${
                activeTab === tab.id 
                ? "bg-slate-950 text-white shadow-xl lg:shadow-2xl shadow-slate-300 scale-105" 
                : "text-slate-400 hover:text-slate-600 hover:bg-white"
              }`}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="min-h-[500px] relative">
          
          {activeTab === "overview" && (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                  <div className="bg-slate-50 border border-slate-100 p-8 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] space-y-6">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Relationship Health ecosystem</p>
                      <h3 className="text-3xl sm:text-4xl font-black italic text-slate-950">92/100</h3>
                    </div>
                    <p className="text-sm font-bold text-slate-600 leading-relaxed">
                      The current Student-Instructor relay is operating at optimal fidelity. No systemic misinformation clusters detected across the core Texas Chapter 82 curriculum.
                    </p>
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 w-fit px-4 py-2 rounded-full">
                      <ShieldCheck className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest italic">Accreditation Protected</span>
                    </div>
                  </div>

                  <div className="bg-primary text-white p-8 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-48 w-48 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    <div className="relative z-10 space-y-4">
                      <p className="text-[10px] font-black uppercase text-white/60 tracking-widest">Predictive Attrition velocity</p>
                      <h3 className="text-3xl sm:text-4xl font-black italic">Low Risk</h3>
                      <p className="text-sm font-bold leading-relaxed opacity-90">
                        Based on current Swipe Deck accuracy trends, cohort 'Pilot Alpha' is on track for an 88% licensure pass rate, 50 points above the Texas state average.
                      </p>
                    </div>
                    <div className="mt-8 border-t border-white/20 pt-6 flex justify-between items-center relative z-10">
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest italic">Est. Workforce Yield: +$1.2M</span>
                      <ArrowUpRight className="h-5 w-5" />
                    </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === "fidelity" && (
            <div className="bg-slate-950 text-white rounded-[2.5rem] sm:rounded-[3.5rem] p-8 sm:p-12 lg:p-16 border border-white/5 relative overflow-hidden">
              <div className="absolute bottom-0 right-0 h-96 w-96 bg-primary/20 rounded-full blur-[120px] -mb-32 -mr-32" />
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-12 sm:mb-16">
                   <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                      <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                   </div>
                   <div>
                    <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter">Instructional Fidelity</h2>
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-1 italic">Correlating Training Hours to Mastering Logic</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
                  <div className="space-y-10 sm:space-y-12">
                     <div className="space-y-4">
                        <div className="flex justify-between items-end">
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sanitation Fidelity</span>
                           <span className="text-xl sm:text-2xl font-black text-emerald-500">High</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 w-[92%] shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
                        </div>
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 leading-relaxed uppercase">10 Hours Taught | 94% Class Mastery</p>
                     </div>
                     <div className="space-y-4">
                        <div className="flex justify-between items-end">
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Coloring Theory Fidelity</span>
                           <span className="text-xl sm:text-2xl font-black text-amber-500">Moderate</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 w-[42%] shadow-[0_0_20px_rgba(245,158,11,0.3)]" />
                        </div>
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 leading-relaxed uppercase">6 Hours Taught | 38% Class Mastery (Fidelity Gap)</p>
                     </div>
                  </div>

                  <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 flex flex-col justify-center">
                     <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 italic">Diagnostic Result:</p>
                     <p className="text-base sm:text-lg font-bold leading-relaxed mb-6 italic">
                        Pedagogical Dissonance detected in "Coloring Theory." The current teaching method is not translating to student cognitive retention for PSI syntax.
                     </p>
                     <button className="w-full sm:w-fit bg-primary text-slate-950 px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white transition-all">
                        Auditor Review Session
                     </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "alignment" && (
            <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] sm:rounded-[3.5rem] p-8 sm:p-12 lg:p-16 relative overflow-hidden group">
               <div className="relative z-10 flex flex-col lg:flex-row gap-12 lg:gap-16">
                  <div className="flex-1 space-y-10">
                     <div className="flex items-center gap-4 sm:gap-6">
                        <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm">
                           <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter">Alignment Heatmap</h2>
                          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-1">Instructor vs Student Gap Analysis</p>
                        </div>
                     </div>
                     <div className="space-y-4 sm:space-y-6">
                        <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 sm:mb-1">Topic: Chemical Safety</p>
                                <p className="text-base sm:text-lg font-black text-slate-900 leading-tight">Instructor perceived: 95% <br className="hidden sm:block" />Student actual: 42%</p>
                            </div>
                            <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-full border-4 border-red-200 border-t-red-500 animate-spin flex items-center justify-center duration-[3000ms]">
                               <span className="text-[8px] sm:text-[9px] font-black text-red-600">CRITICAL</span>
                            </div>
                        </div>
                        <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 sm:mb-1">Topic: Texas Law Ch 82</p>
                                <p className="text-base sm:text-lg font-black text-slate-900 leading-tight">Instructor perceived: 80% <br className="hidden sm:block" />Student actual: 88%</p>
                            </div>
                            <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200">
                               <CheckCircle2 className="h-6 w-6 text-white" />
                            </div>
                        </div>
                     </div>
                  </div>
                  <div className="lg:w-80 bg-slate-950 text-white rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-10 flex flex-col justify-center text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-6">Alignment Insight</p>
                      <p className="text-sm font-bold leading-relaxed italic opacity-80 mb-10">
                        Instructors are consistently overestimating class readiness in 'Chemical Safety' by 53%. Recommend mandatory blind assessments.
                      </p>
                      <button className="w-full bg-white text-slate-950 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all">
                        Sync Calibration
                      </button>
                  </div>
               </div>
            </div>
          )}

          {activeTab === "sentiment" && (
            <div className="bg-slate-50/50 border border-slate-100 rounded-[2.5rem] sm:rounded-[3.5rem] p-8 sm:p-12 lg:p-16">
              <div className="flex items-center gap-4 sm:gap-6 mb-10 sm:mb-12">
                <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl bg-white shadow-xl flex items-center justify-center">
                  <HeartPulse className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter">Sentiment Pulse</h2>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-1">Detecting Systemic Misinformation</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                 <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-4 right-4 h-2 w-2 bg-red-500 rounded-full animate-ping" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-4">Urgent Detection</p>
                    <p className="text-lg sm:text-xl font-bold leading-relaxed text-slate-900 italic mb-8">
                      "Students are reporting contradictory information between Traditional Lecture and 2025 ADI Logic Updates."
                    </p>
                    <div className="space-y-4">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Affected Cluster:</p>
                       <div className="flex flex-wrap gap-2">
                          <span className="text-[9px] px-3 py-1 bg-slate-100 rounded-full font-black uppercase">Houston Hub</span>
                          <span className="text-[9px] px-3 py-1 bg-slate-100 rounded-full font-black uppercase">Ch. 82.71</span>
                       </div>
                    </div>
                 </div>
                 <div className="flex flex-col justify-center space-y-6 sm:space-y-8">
                    <div className="flex items-start gap-4">
                       <div className="mt-1 h-3 w-3 bg-primary rounded-full shrink-0" />
                       <p className="text-sm font-bold text-slate-600 leading-relaxed italic">
                         98% of students trust instructor practical knowledge, but 42% expressed doubt in theoretical exam readiness.
                       </p>
                    </div>
                    <div className="flex items-start gap-4">
                       <div className="mt-1 h-3 w-3 bg-primary rounded-full shrink-0" />
                       <p className="text-sm font-bold text-slate-600 leading-relaxed italic">
                         Relationship Trend: Positive. Students appreciate ADI as a 'Bridge Tool' for their faculty.
                       </p>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === "variance" && (
            <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] sm:rounded-[3.5rem] p-6 sm:p-12 lg:p-16">
              <div className="flex items-center gap-4 sm:gap-6 mb-12 sm:mb-16">
                <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter">Cohort Variance</h2>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-1 italic">Institutional Performance Audit</p>
                </div>
              </div>

              <div className="overflow-x-auto no-scrollbar -mx-6 px-6">
                <table className="w-full text-left border-separate border-spacing-y-4 min-w-[600px]">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      <th className="px-6 pb-2">Instructor Entity</th>
                      <th className="px-6 pb-2 text-center">Instructional Fidelity</th>
                      <th className="px-6 pb-2 text-center">Velocity Delta</th>
                      <th className="px-6 pb-2 text-right">Audit Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {instructorBenchmarks.map((inst) => (
                      <tr key={inst.name} className="group transition-all hover:scale-[1.01]">
                        <td className="bg-slate-50 px-6 sm:px-8 py-5 sm:py-6 rounded-l-[2rem] border-y border-l border-slate-100">
                           <p className="text-xs font-black uppercase tracking-widest text-slate-900 mb-1">{inst.name}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase italic leading-none">{inst.class}</p>
                        </td>
                        <td className="bg-slate-50 px-6 sm:px-8 py-5 sm:py-6 border-y border-slate-100 text-center">
                           <div className="flex items-center justify-center gap-3">
                              <div className="h-1.5 w-12 sm:w-16 bg-slate-200 rounded-full">
                                 <div className={`h-full ${inst.fidelity > 80 ? 'bg-emerald-500' : 'bg-amber-500'} rounded-full`} style={{ width: `${inst.fidelity}%` }} />
                              </div>
                              <span className="text-xs sm:text-sm font-black text-slate-700 italic">{inst.fidelity}%</span>
                           </div>
                        </td>
                        <td className="bg-slate-50 px-6 sm:px-8 py-5 sm:py-6 border-y border-slate-100 text-center">
                           <span className={`text-xs sm:text-sm font-black italic ${inst.velocity.startsWith('+') ? 'text-emerald-600' : 'text-red-600'}`}>
                             {inst.velocity}
                           </span>
                        </td>
                        <td className="bg-slate-50 px-6 sm:px-8 py-5 sm:py-6 rounded-r-[2rem] border-y border-r border-slate-100 text-right">
                           {inst.fidelity > 80 ? (
                             <span className="text-[8px] sm:text-[9px] px-3 sm:px-4 py-1 sm:py-1.5 bg-emerald-500 text-white rounded-full font-black uppercase">Optimal</span>
                           ) : (
                             <span className="text-[8px] sm:text-[9px] px-3 sm:px-4 py-1 sm:py-1.5 bg-amber-500 text-white rounded-full font-black uppercase">Aligning</span>
                           )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-12 p-6 sm:p-8 rounded-[2rem] bg-emerald-50 flex flex-col sm:flex-row items-center gap-6 border border-emerald-100">
                <ShieldCheck className="h-10 w-10 text-emerald-600 shrink-0" />
                <div className="text-center sm:text-left">
                   <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1">Opportunity Detection</p>
                   <p className="text-xs sm:text-sm font-bold text-emerald-950 leading-relaxed italic">
                    Instructor A's methodology in 'Pilot Alpha' is yielding 12 additional days of workforce velocity. Recommend global calibration.
                   </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Auditor Footer Strategy */}
        <div className="mt-16 sm:mt-20 border-t border-slate-100 pt-12 sm:pt-16 flex flex-col items-center text-center space-y-6">
            <div className="flex items-center gap-4 text-primary">
                <FileSpreadsheet className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.5em]">Authorized Sovereign Auditor Protocol</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 leading-relaxed max-w-sm px-4">
                Designed to protect Title IV funding by ensuring educational delivery matches the licensure exam reality. 
            </p>
        </div>
      </div>

      <Footer />
    </main>
  )
}
