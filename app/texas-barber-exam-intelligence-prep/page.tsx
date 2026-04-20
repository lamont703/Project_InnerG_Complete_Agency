import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  ArrowRight, 
  Brain, 
  Sparkles, 
  Shield, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  LayoutDashboard, 
  LineChart, 
  Cpu, 
  Database,
  BarChart3,
  Map,
  Clock,
  ExternalLink,
  BookOpen
} from "lucide-react"
import Image from "next/image"

function GlowOrb({ className }: { className: string }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
      aria-hidden="true"
    />
  )
}

const metrics = [
  { label: "TX Written Pass Rate", value: "37.25%", icon: TrendingUp, color: "text-red-600" },
  { label: "Practical Pass Rate", value: "89.80%", icon: CheckCircle2, color: "text-primary" },
  { label: "NACCAS Safe Buffer", value: "70.00%", icon: Shield, color: "text-primary" },
]

export default function TexasBarberExamPrep() {
  return (
    <main className="min-h-screen bg-white light text-slate-950 flex flex-col pt-20 selection:bg-primary/20">
      <Navbar />

      {/* Hero Section */}
      <section className="relative flex items-center justify-center overflow-hidden pt-16 pb-24 lg:pt-32 lg:pb-40 border-b border-slate-100 bg-white">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white" />
        <GlowOrb className="top-1/4 -left-32 h-96 w-96 bg-primary/10 animate-float" />
        <GlowOrb className="bottom-0 right-1/4 h-80 w-80 bg-accent/5 animate-float-delayed" />

        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-6 py-2 shadow-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-black uppercase tracking-[0.3em] text-primary">Sovereign Texas Pilot Program</span>
          </div>

          <h1 className="text-5xl font-black leading-[0.9] tracking-tighter sm:text-6xl md:text-8xl uppercase italic">
            <span className="block text-slate-950 mb-4">
              Texas Barber Exam
            </span>
            <span className="block text-primary">
              Intelligence Prep™
            </span>
          </h1>

          <p className="mx-auto mt-10 max-w-3xl text-xl leading-relaxed text-slate-800 font-bold sm:text-2xl text-balance">
            Inner G Complete Agency is leading an elite research and  development pilot to resolve the structural fail rates in the Texas barbering market. We architect proprietary Artificial Domain Intelligence (ADI) to secure your NACCAS accreditation.
          </p>

          <div className="mt-14 flex flex-col items-center justify-center gap-6 sm:flex-row">
            <Button
              size="lg"
              className="bg-primary text-white hover:bg-slate-900 gap-3 px-12 py-8 text-sm font-black uppercase tracking-[0.3em] shadow-xl transition-all hover:-translate-y-1"
              asChild
            >
              <Link href="#pilot-application">
                Apply for Pilot Program
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50 gap-3 px-12 py-8 text-sm font-black uppercase tracking-[0.3em] transition-all hover:scale-105 border-2 shadow-sm"
              asChild
            >
              <Link href="/insights/texas-barber-licensure-crisis">View Strategic Audit</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Peer-Reviewed Signal Row */}
      <div className="relative z-20 py-12 -mt-12 bg-white border-2 border-slate-100 shadow-xl max-w-7xl mx-auto w-full rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-8 px-12">
        {metrics.map((m) => (
          <div key={m.label} className="flex items-center gap-6">
            <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center border-2 border-slate-100 shadow-sm">
               <m.icon className={`h-7 w-7 ${m.color}`} />
            </div>
            <div>
              <div className={`text-3xl font-black tracking-tight ${m.color}`}>{m.value}</div>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{m.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* The Crisis: Section 01 */}
      <section className="py-32 relative overflow-hidden bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
             <div>
                <span className="text-xs font-black uppercase tracking-[0.4em] text-red-600 mb-4 block">Institutional Risk Analysis</span>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter sm:text-6xl text-slate-950 mb-8 leading-[0.9]">
                  The Texas <br />Licensure Crisis
                </h2>
                <div className="space-y-6 text-lg text-slate-800 font-bold leading-relaxed">
                  <p>
                    Texas barber schools are currently facing critical NACCAS Title IV vulnerability. The structural written pass rate—currently a staggering 37.25% statewide—is not a teaching failure; it is an Informational Design Failure.
                  </p>
                  <p>
                    While students achieve a 89.8% pass rate on practical exams, the 75-question PSI written theory remains the primary blocker. Our research division identified this "Licensure Crisis" as the primary driver of student attrition and institutional revenue leakage ($15M statewide).
                  </p>
                </div>

                <div className="mt-12 p-10 rounded-[2.5rem] bg-red-50 border-2 border-red-100 flex gap-6">
                   <AlertTriangle className="h-14 w-14 text-red-600 shrink-0" />
                   <div>
                     <h4 className="text-sm font-black uppercase tracking-widest text-red-950 mb-2 italic">Institutional Danger Zone</h4>
                     <p className="text-base text-red-900/80 font-bold leading-relaxed">Consecutive drops below the 70% NACCAS threshold trigger immediate monitorization and potential suspension of Title IV federal funding eligibility.</p>
                   </div>
                </div>
             </div>

             <div className="relative">
                <div className="aspect-[4/5] rounded-[3.5rem] bg-slate-950 p-12 text-white relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.15)] border-8 border-white">
                   <div className="absolute top-0 right-0 p-8 opacity-20">
                     <Map className="h-48 w-48 text-primary" />
                   </div>
                   <div className="relative z-10">
                     <span className="text-[11px] font-black uppercase tracking-[0.4em] text-primary mb-12 block">Regional Cluster Audit</span>
                     <div className="space-y-12">
                        {[
                          { area: "Houston Hub", risk: "Critical", pass: "36.8%", back: "90 Days" },
                          { area: "Dallas Metro", risk: "High", pass: "37.5%", back: "60 Days" },
                          { area: "San Antonio", risk: "Critical", pass: "35.2%", back: "75 Days" },
                        ].map((hub) => (
                          <div key={hub.area} className="border-b border-white/20 pb-8 flex items-end justify-between group cursor-default">
                             <div>
                                <h4 className="text-3xl font-black uppercase italic tracking-tighter text-white group-hover:text-primary transition-colors leading-none">{hub.area}</h4>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mt-2">FY2025 Written Performance</p>
                             </div>
                             <div className="text-right">
                                <div className="text-primary text-3xl font-black leading-none">{hub.pass}</div>
                                <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1">Pass Rate</div>
                             </div>
                          </div>
                        ))}
                     </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* The Blueprint: Section 02 */}
      <section className="py-32 bg-slate-50 relative overflow-hidden border-y border-slate-200">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center text-center mb-24">
             <span className="text-xs font-black uppercase tracking-[0.6em] text-primary mb-4">Proprietary Architecture</span>
             <h2 className="text-5xl font-black uppercase italic tracking-tighter text-slate-950 sm:text-7xl">
               The Sovereign Texas Blueprint
             </h2>
             <p className="mt-8 text-xl text-slate-800 max-w-2xl font-bold leading-relaxed text-balance">
               We architect Accreditation-First Intelligence designed to bridge the gap between classroom instruction and PSI's 75-question barber theory exam.
             </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-10">
             {[
               {
                 icon: Shield,
                 title: "Metric 01: COMPLIANCE",
                 subtitle: "The NACCAS Shield",
                 body: "Our ADI provides an automated safety buffer for your 70% NACCAS threshold. We identify at-risk students 60 days before their testing window, securing your Title IV eligibility.",
               },
               {
                 icon: Brain,
                 title: "Metric 02: DECODING",
                 subtitle: "PSI Syntax Alignment",
                 body: "The state exam tests 'Test-Taking Logic' more than technical Skill. We train students to decode the specific distractor syntax used by the Texas PSI proctor in its 75-question format.",
               },
               {
                 icon: TrendingUp,
                 title: "Metric 03: RETENTION",
                 subtitle: "Workforce Entry Velocity",
                 body: "Failed attempts lead to student dropout and tuition loss. By ensuring first-time pass rates, we accelerate placement and eliminate the 'Unlicensed Limbo' attrition cycle.",
               },
             ].map((layer, i) => (
               <div key={layer.title} className="p-12 rounded-[3rem] bg-white border-2 border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 group">
                 <div className="h-20 w-20 rounded-[1.5rem] bg-slate-50 flex items-center justify-center text-primary mb-10 border-2 border-slate-100 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                    <layer.icon className="h-10 w-10" />
                 </div>
                 <div className="text-[11px] font-black uppercase tracking-[0.5em] text-primary mb-3">{layer.title}</div>
                 <h3 className="text-2xl font-black uppercase tracking-tight text-slate-950 mb-5">{layer.subtitle}</h3>
                 <p className="text-slate-700 font-bold leading-relaxed text-base">
                   {layer.body}
                 </p>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* Institutional ROI: Section 03 */}
      <section className="py-32 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-stretch">
             <div className="flex flex-col justify-center">
                <Shield className="h-16 w-16 text-primary mb-10" />
                <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-950 sm:text-6xl mb-10 leading-[0.9]">
                  Institutional <br />Shielding
                </h2>
                <div className="space-y-10">
                   <div className="flex gap-6">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-xl text-slate-800 font-bold leading-relaxed">
                        <span className="text-slate-950">Accreditation Protection</span>: Secure your 70% NACCAS threshold and defend Title IV federal funding eligibility.
                      </p>
                   </div>
                   <div className="flex gap-6">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-xl text-slate-800 font-bold leading-relaxed">
                        <span className="text-slate-950">Placement Velocity</span>: Reach 100% test-readiness upon 1000-hour completion. Shorten the 'unlicensed limbo' by 45+ days.
                      </p>
                   </div>
                   <div className="flex gap-6">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-xl text-slate-800 font-bold leading-relaxed">
                        <span className="text-slate-950">Regional Dominance</span>: Establish your academy as the high-pass-rate authority in your metropolitan cluster.
                      </p>
                   </div>
                </div>
             </div>

             <div className="rounded-[4rem] border-2 border-slate-200 bg-slate-50 p-1.5 shadow-2xl bg-[linear-gradient(to_bottom_right,white,transparent)]">
                <div className="bg-white rounded-[3.8rem] p-12 h-full border border-slate-100 shadow-inner overflow-hidden relative">
                   <div className="absolute -right-20 top-0 opacity-10">
                      <Cpu className="h-64 w-64 text-primary" />
                   </div>
                   <h4 className="text-sm font-black uppercase tracking-[0.5em] text-primary mb-10 border-b-2 border-slate-50 pb-6">ROI Modeling: Texas Case Study</h4>
                   <div className="space-y-8">
                      {[
                        ["Scenario", "TX Pass Rate", "Workforce Lag", "Economic Utility"],
                        ["Standard Academy", "37.25% (W)", "90+ Days", "$0 Baseline"],
                        ["Pilot Academy", "92% (Target)", "3-7 Days", "+ $5,000 / Student"],
                      ].map((row, i) => (
                        <div key={i} className={`grid grid-cols-4 gap-6 py-6 ${i === 0 ? "border-b-2 border-slate-950" : "border-b border-slate-100"}`}>
                           {row.map((cell, j) => (
                             <div key={j} className={`text-xs sm:text-sm font-black leading-tight ${i === 0 ? "uppercase tracking-widest text-slate-400" : i === 2 && j === 3 ? "text-primary font-black scale-110" : "text-slate-950"}`}>
                                {cell}
                             </div>
                           ))}
                        </div>
                      ))}
                   </div>
                   <div className="mt-12 flex items-center gap-4 text-xs font-black uppercase text-slate-950 bg-slate-50 w-fit px-8 py-4 rounded-full border-2 border-slate-100 shadow-sm">
                      <Clock className="h-4 w-4 text-primary" />
                      Strategic Acceleration: +45 Days Workforce Velocity
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* The Pilot Application */}
      <section id="pilot-application" className="py-40 relative text-center bg-white border-t border-slate-100 overflow-hidden">
        <GlowOrb className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] bg-primary/10" />
        <div className="relative z-10 mx-auto max-w-4xl px-6">
           <span className="text-xs font-black uppercase tracking-[0.6em] text-primary mb-10 block underline underline-offset-[12px] decoration-4">Next-Generation Research Pilot</span>
           <h2 className="text-5xl font-black uppercase italic tracking-tighter sm:text-8xl mb-10 leading-[0.85] text-balance text-slate-950">
             Apply For The <br />Texas Cohort
           </h2>
           <p className="mx-auto mt-6 mb-20 max-w-2xl text-xl text-slate-700 leading-relaxed font-bold italic text-balance">
             "Limited capacity. We are selecting a cohort of forward-thinking Texas institutions to participate in the final 2026 state barber exam cognitive alignment pilot program."
           </p>
           
           <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                className="bg-primary text-white hover:bg-slate-950 gap-5 px-16 py-10 text-lg font-black uppercase tracking-[0.4em] shadow-xl transition-all duration-500 hover:scale-105 rounded-2xl"
                asChild
              >
                <Link href="/#contact">
                  Initiate Research Phase
                  <ArrowRight className="h-8 w-8" />
                </Link>
              </Button>
           </div>
        </div>
      </section>

      {/* Footer Branding Override */}
      <Footer />
    </main>
  )
}
