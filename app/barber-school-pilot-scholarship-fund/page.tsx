"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  ShieldCheck, 
  GraduationCap, 
  Users, 
  BarChart3, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2, 
  Globe,
  Sparkles,
  Building2,
  FileText
} from "lucide-react"
import { BarberRegisterForm } from "@/components/forms/BarberRegisterForm"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import Link from "next/link"

export default function ScholarshipFundPage() {
  const [spotsRemaining, setSpotsRemaining] = useState(500)

  useEffect(() => {
    // Animate counter down to 412 over ~1.5s on mount for urgency
    const target = 412
    const start = 500
    const duration = 1500
    const startTime = performance.now()
    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setSpotsRemaining(Math.round(start - (start - target) * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [])

  return (
    <div className="min-h-screen bg-white light text-slate-950 selection:bg-primary/20 relative overflow-hidden flex flex-col">
      <Navbar />

      {/* Main Content Area with Header Offset */}
      <div className="flex-1 flex flex-col pt-16 md:pt-20">
        
        {/* Announcement Banner (Now below Header) */}
        <div className="relative z-40 bg-slate-950 text-white py-2 md:py-3 px-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 md:gap-3">
            <div className="hidden sm:flex h-5 w-5 rounded-full bg-primary/20 items-center justify-center shrink-0">
              <Sparkles className="h-3 w-3 text-primary animate-pulse" />
            </div>
            <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-center leading-tight">
              Phase 01 Pilot Enrollment Active — <span className="text-primary">500 Student Scholarship Fund</span> <span className="hidden sm:inline">Allocated Nationwide</span>
            </p>
          </div>
        </div>

        {/* Background Aesthetic Matching Prep Page */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white pointer-events-none" />
        <div className="absolute top-1/4 -left-32 h-64 w-64 md:h-96 md:w-96 bg-primary/10 rounded-full blur-3xl animate-float pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 md:h-80 md:w-80 bg-accent/5 rounded-full blur-3xl animate-float-delayed pointer-events-none" />

        <main className="relative z-10 pt-8 md:pt-20 lg:pt-32 pb-16 md:pb-32 flex-1">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-32 items-start">
              
              {/* Left Column: Mission */}
              <div className="space-y-6 md:space-y-12">
                <div className="space-y-4">
                  <Link href="/texas-barber-exam-intelligence-prep" className="inline-flex items-center gap-2 text-primary hover:underline text-[9px] md:text-[10px] font-black tracking-widest uppercase transition-all hover:-translate-x-1">
                    <ArrowLeft className="h-3 w-3" />
                    Back to Solution
                  </Link>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 shadow-sm w-fit">
                      <Sparkles className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                      <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-primary whitespace-nowrap">Scholarship Initiative</span>
                    </div>
                    <span className="hidden sm:inline text-slate-300">|</span>
                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pilot Phase 01</span>
                  </div>
                </div>
                
                <h1 className="text-3xl md:text-6xl lg:text-7xl font-black italic uppercase tracking-tighter leading-[0.95] md:leading-[0.9] text-slate-950">
                  Your Students <span className="text-primary">Deserve</span> To Pass Their Board Exam
                </h1>
                
                <p className="text-base md:text-xl text-slate-700 font-bold leading-relaxed max-w-xl text-balance">
                  Texas barber schools are losing students to the written board exam — not because they can't cut hair, but because the PSI test requires a different kind of preparation. <span className="text-primary font-black">At zero cost to your school.</span>
                </p>

                {/* Pain Points */}
                <div className="p-5 md:p-8 rounded-2xl md:rounded-3xl bg-red-50 border-2 border-red-100 space-y-4">
                  <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-red-600">The Problem Schools Are Facing Right Now</p>
                  <div className="space-y-3">
                    {[
                      "Students finishing 1,000 - 1,500 hours but failing the written exam",
                      "High re-test fees ($74+) draining student resources",
                      "NACCAS accreditation at risk (Pass rates below 70%)",
                      "Students dropping out between failure attempts"
                    ].map((pain, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="h-5 w-5 rounded-full bg-red-200 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-red-700 text-[8px] md:text-[9px] font-black">{i+1}</span>
                        </div>
                        <p className="text-xs md:text-sm text-red-900 font-bold leading-snug">{pain}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 md:space-y-5">
                  <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">What Your School Gets — Free During Pilot</p>
                  {[
                    { icon: GraduationCap, text: "AI-Enhanced practice questions (2026 PSI Board)" },
                    { icon: BarChart3, text: "AI Analysis of student knowledge gaps" },
                    { icon: Users, text: "AI-Personalized study plans for each student" },
                    { icon: ShieldCheck, text: "AI-Verified Board-ready confidence" }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 group">
                      <div className="h-9 w-9 md:h-12 md:w-12 rounded-lg md:rounded-xl bg-slate-50 flex items-center justify-center border-2 border-slate-100 shadow-sm group-hover:border-primary/30 transition-all duration-300 shrink-0">
                        <item.icon className="h-4 w-4 md:h-6 md:w-6 text-primary" />
                      </div>
                      <span className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-wider leading-tight">{item.text}</span>
                    </div>
                  ))}
                </div>

                {/* Urgency Meter */}
                <div className="p-5 md:p-10 rounded-[1.5rem] md:rounded-[2rem] bg-white border-2 border-slate-100 shadow-2xl shadow-slate-200/50 space-y-4 md:space-y-5 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4 md:p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                      <Globe className="h-20 w-20 md:h-32 md:w-32 text-slate-950" />
                   </div>
                   <div className="flex justify-between items-end relative z-10">
                      <div>
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-slate-400 mb-1 block whitespace-nowrap">Free Scholarship Spots Remaining</span>
                        <span className="text-2xl md:text-4xl font-black text-primary tracking-tighter italic">{spotsRemaining} / 500</span>
                      </div>
                      <span className="text-[8px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1 shrink-0">Nationwide</span>
                   </div>
                   <div className="h-2 md:h-3 w-full bg-slate-100 rounded-full overflow-hidden relative z-10 shadow-inner">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${((500 - spotsRemaining) / 500) * 100}%` }}
                         transition={{ duration: 1.5, ease: "easeOut" }}
                         className="h-full bg-primary"
                       />
                    </div>
                   <div className="flex items-center justify-between relative z-10">
                     <div className="flex items-center gap-2 md:gap-3 text-[7px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest">
                       <span className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-emerald-500 animate-pulse" />
                       High-failure districts receive priority access.
                     </div>
                     <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-red-500">{500 - spotsRemaining} claimed</span>
                   </div>
                </div>

                {/* Data-backed cross-links */}
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">The Data Behind This Scholarship</p>
                  <div className="space-y-2">
                    <Link href="/insights/el-paso-barber-market-rescue-report" className="flex items-center gap-2 text-[9px] md:text-[11px] font-black text-primary hover:underline uppercase tracking-wider group">
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      El Paso Barber Market Rescue Report
                    </Link>
                    <Link href="/insights/texas-barber-licensure-crisis" className="flex items-center gap-2 text-[9px] md:text-[11px] font-black text-primary hover:underline uppercase tracking-wider group">
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      Texas Barber Licensure Crisis: $15M Risk Analysis
                    </Link>
                  </div>
                </div>
              </div>

              {/* Right Column: Application Form */}
              <div className="relative mt-4 lg:mt-0">
                <div className="absolute -inset-4 md:-inset-10 bg-primary/5 blur-[50px] md:blur-[100px] opacity-50" />
                <div className="relative bg-white shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] rounded-[1.5rem] md:rounded-[4rem] p-5 md:p-14 border-2 border-slate-100 space-y-6 md:space-y-12 lg:max-h-[90vh] lg:overflow-y-auto no-scrollbar">
                  <div className="text-center space-y-2 md:space-y-4">
                    <div className="h-10 w-10 md:h-20 md:w-20 bg-primary/5 rounded-xl md:rounded-3xl flex items-center justify-center mx-auto mb-2 md:mb-6 border-2 border-primary/10 shadow-inner">
                      <Building2 className="h-5 w-5 md:h-10 md:w-10 text-primary" />
                    </div>
                    <h2 className="text-xl md:text-4xl font-black uppercase italic tracking-tighter text-slate-950 leading-none">Institutional <br />Enrollment</h2>
                    <p className="text-slate-400 text-[8px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em]">Pilot Program Application (Phase 01)</p>
                  </div>

                  <BarberRegisterForm />

                  <div className="flex items-center gap-4 md:gap-6 justify-center py-4 md:py-6 border-t-2 border-slate-50">
                     <div className="flex -space-x-3 md:-space-x-4 shrink-0">
                        {[1,2,3,4].map(i => (
                          <div key={i} className="h-7 w-7 md:h-10 md:w-10 rounded-full border-2 md:border-4 border-white bg-slate-100 flex items-center justify-center shadow-sm shrink-0">
                             <Users className="h-3 w-3 md:h-4 md:w-4 text-slate-400" />
                          </div>
                        ))}
                     </div>
                     <p className="text-[8px] md:text-[11px] font-black uppercase tracking-widest text-slate-400 leading-tight">
                        12 Schools Enrolled This Week
                     </p>
                  </div>
                </div>
              </div>

            </div>

            {/* What Happens After You Apply */}
            <div className="mt-16 md:mt-32 pt-12 md:pt-20 border-t-2 border-slate-100">
              <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8 md:mb-12">What Happens After You Apply</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                {[
                  { step: "01", title: "We Review", desc: "Confirming your school's license and enrollment size within 48 hours." },
                  { step: "02", title: "Student Access", desc: "Your students receive free access to the full Barber Intelligence prep platform." },
                  { step: "03", title: "See Results", desc: "Track which students are ready to test and which need more prep — in real time." },
                  { step: "04", title: "Pass Rate Rises", desc: "Students go into the board exam prepared. Your school's numbers improve." }
                ].map((s, i) => (
                  <div key={i} className="space-y-3 md:space-y-4 p-5 md:p-6 rounded-xl md:rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-primary/20 transition-all">
                    <span className="text-3xl md:text-5xl font-black text-primary/20 italic tracking-tighter leading-none">{s.step}</span>
                    <h3 className="text-sm md:text-lg font-black uppercase italic tracking-tight text-slate-950">{s.title}</h3>
                    <p className="text-xs md:text-sm text-slate-600 font-bold leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust Signals */}
            <div className="mt-12 md:mt-20 pt-12 md:pt-20 border-t-2 border-slate-100 grid sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
               {[
                 { title: "No Cost. No Risk.", desc: "The pilot is completely free for participating schools and their students during Phase 01.", icon: ShieldCheck },
                 { title: "Board Aligned", desc: "All practice questions map directly to the topics on the State Specific written board exam.", icon: FileText },
                 { title: "Verified Results", desc: "Schools in our pilot cohort report measurable improvements in first-attempt pass rates.", icon: BarChart3 }
               ].map((feature, i) => (
                 <div key={i} className="space-y-4 md:space-y-5 group">
                   <div className="h-10 w-10 md:h-14 md:w-14 rounded-lg md:rounded-2xl bg-slate-50 flex items-center justify-center border-2 border-slate-100 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                      <feature.icon className="h-5 w-5 md:h-7 md:w-7" />
                   </div>
                   <h3 className="text-base md:text-xl font-black uppercase italic tracking-tighter text-slate-950">{feature.title}</h3>
                   <p className="text-xs md:text-base text-slate-600 font-bold leading-relaxed">{feature.desc}</p>
                 </div>
               ))}
            </div>

          </div>
        </main>

        <Footer />
      </div>
    </div>
  )
}
