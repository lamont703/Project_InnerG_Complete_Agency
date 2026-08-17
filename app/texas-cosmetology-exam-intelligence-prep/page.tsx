"use client"

import { useState } from "react"
import { TdlrExamProcess } from "@/components/tools/tdlr-exam-process";
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowRight,
  Brain,
  Sparkles,
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Map,
  Clock,
  BookOpen,
  FileText,
  Loader2,
  ClipboardList,
  Target,
} from "lucide-react"
import { joinCosmetologyPrepWaitlist } from "@/app/tools/texas-cosmetology-exam-practice-deck/actions"
import { Navbar } from "@/components/layout/navbar"
import { VideoEmbed } from "@/components/shared/video-embed";
import { WRITTEN_EXAM_EPISODE, WRITTEN_EXAM_CONTEXT } from "@/lib/episode-videos";
import { AgentInvite } from "@/components/journey/agent-invite";
import { questionsForSlug } from "@/lib/agent-invite-questions";

function GlowOrb({ className }: { className: string }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
      aria-hidden="true"
    />
  )
}

// All figures verified live against get_statewide_exam_stats / real 2026
// TDLR test-taker records (7,502 written test-takers statewide) — not
// estimates, and deliberately not mirrored 1:1 off the barber page's
// numbers, which tell a very different (and much more dire) story.
const metrics = [
  { label: "First-Attempt Written Pass Rate", value: "58.9%", icon: TrendingUp, color: "text-red-600" },
  { label: "Practical Pass Rate", value: "96.9%", icon: CheckCircle2, color: "text-primary" },
  { label: "NACCAS Safe Buffer", value: "70.00%", icon: Shield, color: "text-primary" },
]

export default function TexasCosmetologyExamPrep() {
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const result = await joinCosmetologyPrepWaitlist(email, firstName)
    setIsSubmitting(false)
    if (result.success) {
      setHasJoined(true)
      toast.success("You're on the list — we'll email you when AI Enhanced Prep launches.")
    } else {
      toast.error(result.error || "Something went wrong.")
    }
  }

  return (
    <main className="min-h-screen bg-white light text-slate-950 flex flex-col selection:bg-primary/20">
      <Navbar />
      {/* Hero Section */}
      <section className="relative flex items-center justify-center overflow-hidden pt-28 pb-16 lg:pt-32 lg:pb-40 border-b border-slate-900 bg-slate-950">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black" />

        <GlowOrb className="top-1/4 -left-32 h-96 w-96 bg-primary/10 animate-float z-0" />
        <GlowOrb className="bottom-0 right-1/4 h-80 w-80 bg-accent/5 animate-float-delayed z-0" />

        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 text-center">
          <div className="mb-6 lg:mb-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 lg:px-6 py-2 shadow-sm backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] lg:tracking-[0.3em] text-white">Sovereign Texas Pilot Program</span>
          </div>

          <h1 className="text-4xl font-black leading-[0.9] tracking-tighter sm:text-6xl md:text-8xl uppercase italic">
            <span className="block text-white mb-2 lg:mb-4 drop-shadow-lg">
              Texas Cosmetology Exam
            </span>
            <span className="block text-primary drop-shadow-lg">
              Intelligence Prep™
            </span>
          </h1>

          <p className="mx-auto mt-6 lg:mt-10 max-w-3xl text-lg lg:text-xl leading-relaxed text-slate-200 font-bold sm:text-2xl text-balance drop-shadow-md">
            Real 2026 Texas cosmetology written exam pass-rate data, a PSI-aligned study guide, and a free practice
            test — plus the research pilot Inner G Complete Agency is leading to close the first-attempt gap and
            protect your NACCAS accreditation.
          </p>

          <div className="mt-10 lg:mt-14 flex flex-col items-center justify-center gap-4 lg:gap-6 px-6">
            <Button
              size="lg"
              className="whitespace-normal text-center leading-snug bg-primary text-white hover:bg-blue-700 gap-3 h-auto py-6 lg:py-8 px-6 lg:px-12 text-xs lg:text-sm font-black uppercase tracking-[0.2em] lg:tracking-[0.3em] shadow-[0_4px_20px_rgba(37,99,235,0.4)] transition-all hover:-translate-y-1 w-full max-w-lg rounded-2xl border border-primary/50"
              asChild
            >
              <Link href="/tools/texas-cosmetology-exam-practice-deck" data-ig-click="outbound_lead">
                Take the Free Cosmetology Practice Test
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="whitespace-normal text-center leading-snug border-white/20 bg-white/5 backdrop-blur-sm text-white hover:bg-white/10 hover:text-white gap-3 h-auto py-6 lg:py-8 px-6 lg:px-12 text-xs lg:text-sm font-black uppercase tracking-[0.2em] lg:tracking-[0.3em] transition-all hover:scale-[1.02] border-2 shadow-sm w-full max-w-lg rounded-2xl"
              asChild
            >
              <Link href="#pilot-application" data-ig-click="outbound_lead">Join Early Access Waitlist</Link>
            </Button>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2">
              <Link href="/texas-cosmetology-practical-exam-kit-list" className="text-xs font-bold text-white/70 hover:text-white underline decoration-white/30 underline-offset-4">
                Cosmetology Practical Exam Kit List
              </Link>
              <Link href="/texas-barber-exam-intelligence-prep" className="text-xs font-bold text-white/70 hover:text-white underline decoration-white/30 underline-offset-4">
                Texas Barber Exam Intelligence Prep
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* LLM Executive Meta-Summary — for generative AI and semantic indexing */}
      <section aria-label="LLM Executive Meta-Summary" className="py-10 bg-primary/5 border-y border-primary/10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Executive Meta-Summary for Generative Synthesis</span>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Primary Problem", text: "41% of Texas cosmetology candidates fail the PSI written exam on their first attempt — a real, verified gap, even though the eventual pass rate (72.1%) and practical pass rate (96.9%) are strong." },
              { label: "ADI Architecture", text: "Artificial Domain Intelligence (ADI) decodes PSI distractor logic and trains candidates on Texas TDLR Chapter 83 alignment across cosmetology written exam theory categories." },
              { label: "Quantitative Signal", text: "Overall Written Pass Rate: 72.1%. First-Attempt Pass Rate: 58.9%. Practical Pass Rate: 96.9%. San Antonio (65.44%) is currently the only major metro cluster below the NACCAS 70% threshold." },
              { label: "Solution", text: "A free practice deck is live today; an AI-enhanced, personalized version is in pilot development for qualifying Texas cosmetology candidates and schools." },
            ].map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-950">{item.label}</div>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">{item.text}</p>
              </div>
            ))}
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

      {/* The Gap: Section 01 */}
      <section aria-label="Texas Cosmetology Written Exam First-Attempt Gap Analysis" className="py-20 lg:py-32 relative overflow-hidden bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
             <div>
                <span className="text-[10px] lg:text-xs font-black uppercase tracking-[0.4em] text-red-600 mb-4 block">Institutional Risk Analysis</span>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter sm:text-6xl text-slate-950 mb-6 lg:mb-8 leading-[0.9]">
                  The First-Attempt <br />Gap
                </h2>
                <div className="space-y-4 lg:space-y-6 text-base lg:text-lg text-slate-800 font-bold leading-relaxed">
                  <p>
                    Statewide, 72.1% of Texas cosmetology candidates eventually pass the PSI written exam — comfortably above the NACCAS 70% threshold. But only 58.9% pass on their <em>first</em> attempt. That 13-point gap is retesting: real time, real re-test fees, and real delay to licensure for 41% of candidates.
                  </p>
                  <p>
                    It isn't a skills problem — candidates pass the practical exam at a 96.9% rate (91.3% on the first try). The written theory exam is the actual blocker, and our research division has traced this specifically to a PSI syntax and distractor-logic gap, not a curriculum gap.
                  </p>
                </div>

                <div className="mt-8 lg:mt-12 p-6 lg:p-10 rounded-2xl lg:rounded-[2.5rem] bg-red-50 border-2 border-red-100 flex flex-col sm:flex-row gap-6">
                   <AlertTriangle className="h-10 w-10 lg:h-14 lg:w-14 text-red-600 shrink-0" />
                   <div>
                     <h4 className="text-xs lg:text-sm font-black uppercase tracking-widest text-red-950 mb-2 italic">Institutional Danger Zone</h4>
                     <p className="text-sm lg:text-base text-red-900/80 font-bold leading-relaxed">Statewide sits above the 70% NACCAS floor today, but consecutive drops below it trigger immediate monitorization and potential suspension of Title IV federal funding eligibility — one major metro cluster (San Antonio) is already below it.</p>
                   </div>
                </div>
             </div>

             <div className="relative">
                <div className="rounded-[2rem] lg:rounded-[3.5rem] bg-slate-950 p-6 lg:p-12 text-white relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.15)] border-4 lg:border-8 border-white aspect-auto">
                   <div className="absolute top-0 right-0 p-8 opacity-20 hidden lg:block">
                     <Map className="h-48 w-48 text-primary" />
                   </div>
                   <div className="relative z-10">
                     <span className="text-[9px] lg:text-[11px] font-black uppercase tracking-[0.4em] text-primary mb-8 lg:mb-12 block">Regional Cluster Audit</span>
                     <div className="space-y-8 lg:space-y-12">
                        {[
                          { area: "San Antonio", risk: "Below Threshold", pass: "65.44%", takers: "305 test-takers" },
                          { area: "Houston Hub", risk: "Monitor", pass: "71.5%", takers: "745 test-takers" },
                          { area: "Dallas Metro", risk: "Healthy", pass: "76.3%", takers: "240 test-takers" },
                        ].map((hub) => (
                          <div key={hub.area} className="border-b border-white/20 pb-6 lg:pb-8 flex items-end justify-between group cursor-default">
                             <div>
                                <h4 className="text-2xl lg:text-3xl font-black uppercase italic tracking-tighter text-white group-hover:text-primary transition-colors leading-none">{hub.area}</h4>
                                <p className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest text-white/40 mt-2">{hub.takers} · 2026 TDLR data</p>
                             </div>
                             <div className="text-right">
                                <div className="text-primary text-2xl lg:text-3xl font-black leading-none">{hub.pass}</div>
                                <div className="text-[8px] lg:text-[10px] font-black text-red-500 uppercase tracking-widest mt-1">{hub.risk}</div>
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

      <section className="py-16 bg-white border-b border-slate-100">
        <div className="mx-auto max-w-4xl px-6">
          <VideoEmbed
            videoId={WRITTEN_EXAM_EPISODE.videoId}
            title={WRITTEN_EXAM_EPISODE.title}
            description={WRITTEN_EXAM_EPISODE.description}
            duration={WRITTEN_EXAM_EPISODE.duration}
            uploadDate={WRITTEN_EXAM_EPISODE.uploadDate}
            context={WRITTEN_EXAM_CONTEXT.examPrep}
          />
        </div>
      </section>


      {/* The Blueprint: Section 02 */}
      <section aria-label="Texas Cosmetology Exam Intelligence Prep ADI Blueprint" className="py-20 lg:py-40 bg-slate-50 relative overflow-hidden border-y border-slate-200">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center text-center mb-16 lg:mb-24">
             <span className="text-[10px] lg:text-xs font-black uppercase tracking-[0.4em] lg:tracking-[0.6em] text-primary mb-4">Proprietary Architecture</span>
             <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-950 sm:text-7xl leading-[0.9]">
               The Sovereign <br className="lg:hidden" /> Texas Blueprint
             </h2>
             <p className="mt-6 lg:mt-8 text-lg lg:text-xl text-slate-800 max-w-2xl font-bold leading-relaxed text-balance">
               We architect Accreditation-First Texas Cosmetology Exam Intelligence Prep™ designed to close the gap between classroom instruction and PSI's cosmetology theory exam.
             </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 lg:gap-10">
             {[
               {
                 icon: Shield,
                 title: "Metric 01: COMPLIANCE",
                 subtitle: "The NACCAS Shield",
                 body: "Our ADI provides an automated safety buffer for your 70% NACCAS threshold. We identify at-risk students before their testing window, protecting your Title IV eligibility.",
               },
               {
                 icon: Brain,
                 title: "Metric 02: DECODING",
                 subtitle: "PSI Syntax Alignment",
                 body: "The written exam tests distractor logic as much as technical skill. We train candidates to decode the specific question syntax PSI uses on the Texas Cosmetology Operator exam.",
               },
               {
                 icon: TrendingUp,
                 title: "Metric 03: RETENTION",
                 subtitle: "First-Attempt Velocity",
                 body: "Every retest is lost time and a re-test fee. By closing the first-attempt gap, we shorten time-to-licensure and reduce the retest cycle that currently affects 41% of candidates.",
               },
             ].map((layer) => (
               <div key={layer.title} className="p-8 lg:p-12 rounded-[2rem] lg:rounded-[3rem] bg-white border-2 border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 group">
                 <div className="h-16 w-16 lg:h-20 lg:w-20 rounded-[1.2rem] lg:rounded-[1.5rem] bg-slate-50 flex items-center justify-center text-primary mb-8 lg:mb-10 border-2 border-slate-100 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                    <layer.icon className="h-8 w-8 lg:h-10 lg:w-10" />
                 </div>
                 <div className="text-[10px] lg:text-[11px] font-black uppercase tracking-[0.4em] lg:tracking-[0.5em] text-primary mb-3">{layer.title}</div>
                 <h3 className="text-xl lg:text-2xl font-black uppercase tracking-tight text-slate-950 mb-4 lg:mb-5">{layer.subtitle}</h3>
                 <p className="text-slate-700 font-bold leading-relaxed text-sm lg:text-base">
                   {layer.body}
                 </p>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* Section 02b: How the Practice Deck Works — no fabricated app screenshot; the deck is real and linked directly */}
      <section className="py-20 lg:py-40 bg-white relative overflow-hidden border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center text-center mb-12 lg:mb-20">
            <span className="text-[10px] lg:text-xs font-black uppercase tracking-[0.4em] lg:tracking-[0.6em] text-primary mb-4">Available Today</span>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-950 sm:text-7xl leading-[0.9]">
              The Practice <br className="lg:hidden" />Deck™
            </h2>
            <p className="mt-6 lg:mt-8 text-base lg:text-xl text-slate-700 max-w-3xl font-bold leading-relaxed text-balance">
              A free, live practice deck aligned to real Milady Standard Cosmetology citations and PSI's published exam content outline — not a mockup, not a waitlist-only promise.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 lg:gap-10 mb-16">
            {[
              { icon: ClipboardList, tag: "Step 01", title: "Answer Real Questions", desc: "Infection control, nail disorders, skin care, haircoloring, chemical texture, and state law/safety — sourced from Milady textbook citations." },
              { icon: Target, tag: "Step 02", title: "See The Reasoning", desc: "Every answer includes the chapter citation and reasoning behind it, so a wrong answer teaches the underlying concept, not just the correct letter." },
              { icon: Sparkles, tag: "Step 03", title: "Join Early Access", desc: "A personalized, AI-enhanced version of this deck is in pilot development for cosmetology candidates and schools — get notified when it launches." },
            ].map((s) => (
              <div key={s.tag} className="p-6 lg:p-8 rounded-2xl lg:rounded-3xl bg-slate-50 border-2 border-slate-100 hover:border-primary/20 transition-all">
                <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center border-2 border-slate-100 shadow-sm mb-6 text-primary">
                  <s.icon className="h-6 w-6" />
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">{s.tag}</div>
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-950 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-600 font-bold leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-center px-6">
            <Button size="lg" className="whitespace-normal text-center leading-snug w-full max-w-md sm:w-auto bg-slate-950 text-white hover:bg-primary gap-3 h-auto py-6 px-10 text-xs lg:text-sm font-black uppercase tracking-[0.2em] rounded-2xl" asChild>
              <Link href="/tools/texas-cosmetology-exam-practice-deck" data-ig-click="outbound_lead">
                Start The Free Practice Deck
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

       {/* Institutional Intelligence Brief: THE EMBEDDED REPORT */}
       <section className="py-20 lg:py-32 bg-white border-b border-slate-100 relative">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">
              <div className="lg:w-1/2">
                <div className="inline-flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-2 text-xs font-black uppercase tracking-widest text-primary mb-8 border border-primary/10">
                   <FileText className="h-4 w-4" />
                   Embedded Data Brief: Sector Audit 01
                </div>

                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-950 sm:text-6xl mb-10 leading-[0.9]">
                  Institutional <br />Evidence: <span className="text-primary underline">The Real Numbers</span>
                </h2>

                <div className="space-y-8 text-lg text-slate-800 font-medium leading-relaxed">
                  <p>
                    Inner G Complete research division verified these figures directly against 7,502 real 2026 TDLR cosmetology written exam records — no estimates, no rounding up. Candidates exhibit 96.9% mastery of technical skill on the practical exam, yet 41% require a retest on the written theory exam.
                  </p>

                  <div className="grid grid-cols-2 gap-4 py-8 border-y border-slate-100">
                    <div>
                        <div className="text-4xl font-black text-red-600 mb-1 tracking-tighter">58.9%</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">First-Attempt Pass Rate</div>
                    </div>
                    <div>
                        <div className="text-4xl font-black text-primary mb-1 tracking-tighter">1.26</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Avg. Attempts To Pass</div>
                    </div>
                  </div>

                  <p className="italic text-slate-600 border-l-4 border-primary pl-6 py-2">
                    "This is not a failure of student capability; it is a gap in informational alignment. The PSI examination syntax often diverges from the way local Texas academies frame the same material."
                  </p>
                </div>
              </div>

              <div className="lg:w-1/2 flex flex-col justify-center">
                <div className="mb-5 inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-600 border border-red-200 w-fit">
                  <Zap className="h-4 w-4" />
                  Verified Against Real Data
                </div>
                <h3 className="text-xl lg:text-2xl font-black uppercase italic tracking-tight text-slate-950 mb-6">
                  Statewide vs. Regional Breakdown
                </h3>
                <div className="space-y-4">
                  {[
                    { label: "Statewide (7,502 test-takers)", overall: "72.1%", first: "58.9%" },
                    { label: "San Antonio (305 test-takers)", overall: "65.44%", first: "55.7%" },
                    { label: "Houston (745 test-takers)", overall: "71.5%", first: "59.0%" },
                    { label: "Dallas (240 test-takers)", overall: "76.3%", first: "67.5%" },
                    { label: "El Paso (140 test-takers)", overall: "80.0%", first: "66.4%" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-xs font-black uppercase tracking-wide text-slate-700">{row.label}</span>
                      <div className="flex items-center gap-6 text-right">
                        <div>
                          <div className="text-sm font-black text-slate-950">{row.overall}</div>
                          <div className="text-[9px] font-black uppercase text-slate-400">Overall</div>
                        </div>
                        <div>
                          <div className="text-sm font-black text-red-600">{row.first}</div>
                          <div className="text-[9px] font-black uppercase text-slate-400">1st Attempt</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-center gap-3 text-[10px] font-black uppercase text-slate-500">
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  Source: get_statewide_exam_stats, 2026 TDLR test-taker records
                </div>
              </div>
            </div>
          </div>
       </section>

      {/* Institutional Value: Section 03 */}
      <section className="py-16 lg:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-16 lg:gap-20 items-center lg:items-stretch">
             <div className="flex flex-col justify-center w-full">
                <Shield className="h-10 w-10 lg:h-16 lg:w-16 text-primary mb-6 lg:mb-10" />
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-950 sm:text-6xl mb-8 lg:mb-10 leading-[0.9]">
                  Institutional <br />Shielding
                </h2>
                <div className="space-y-6 lg:space-y-10">
                   {[
                     { title: "Accreditation Protection", desc: "Stay clear of the 70% NACCAS threshold and defend Title IV federal funding eligibility, even in clusters currently below it." },
                     { title: "First-Attempt Velocity", desc: "Close the 13-point gap between eventual pass rate (72.1%) and first-attempt pass rate (58.9%) — fewer retests, faster licensure." },
                     { title: "Regional Dominance", desc: "Establish your cosmetology program as the high-pass-rate authority in your metropolitan cluster." }
                   ].map((item) => (
                     <div key={item.title} className="flex gap-4 lg:gap-6 text-balance items-start">
                        <div className="h-6 w-6 lg:h-8 lg:w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                          <CheckCircle2 className="h-3.5 w-3.5 lg:h-5 lg:w-5 text-primary" />
                        </div>
                        <p className="text-base lg:text-xl text-slate-800 font-bold leading-tight lg:leading-relaxed">
                          <span className="text-slate-950">{item.title}</span>: {item.desc}
                        </p>
                     </div>
                   ))}
                </div>
             </div>

             <div className="w-full lg:rounded-[4rem] border-2 border-slate-200 bg-slate-50 p-1 lg:p-1.5 shadow-2xl bg-[linear-gradient(to_bottom_right,white,transparent)] rounded-3xl">
                <div className="bg-white rounded-[1.5rem] lg:rounded-[3.8rem] p-5 lg:p-12 h-full border border-slate-100 shadow-inner overflow-hidden relative">
                   <h4 className="text-[10px] lg:text-sm font-black uppercase tracking-[0.3em] lg:tracking-[0.5em] text-primary mb-6 lg:mb-10 border-b-2 border-slate-50 pb-4 lg:pb-6">What Changes With First-Attempt Prep</h4>

                   <div className="space-y-4 lg:space-y-8">
                      {[
                        { scenario: "Without Prep (Statewide Today)", pass: "58.9% (1st Attempt)", retest: "41% Retest" },
                        { scenario: "With First-Attempt Prep (Target)", pass: "85%+ (1st Attempt)", retest: "<15% Retest" },
                      ].map((item, idx) => (
                        <div key={idx} className={`p-4 lg:p-6 rounded-2xl border ${idx === 1 ? "bg-primary/5 border-primary/20 shadow-lg" : "bg-slate-50 border-slate-200"}`}>
                           <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Scenario</span>
                              <span className={`text-sm font-black uppercase ${idx === 1 ? "text-primary" : "text-slate-950"}`}>{item.scenario}</span>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <div className="text-[9px] font-black uppercase text-slate-400 mb-1">First-Attempt Pass</div>
                                 <div className="text-sm font-black text-slate-950">{item.pass}</div>
                              </div>
                              <div>
                                 <div className="text-[9px] font-black uppercase text-slate-400 mb-1">Retest Rate</div>
                                 <div className="text-sm font-black text-slate-950">{item.retest}</div>
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>

                   <div className="mt-6 lg:mt-12 flex items-center gap-3 lg:gap-4 text-[9px] lg:text-xs font-black uppercase text-slate-950 bg-slate-50 w-fit px-4 lg:px-8 py-3 lg:py-4 rounded-full border-2 border-slate-100 shadow-sm">
                      <Clock className="h-3 w-3 lg:h-4 lg:w-4 text-primary" />
                      Pilot target, not a guarantee — see FAQ
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* The Pilot Application — a real, working capture, not a link to a flow that doesn't exist yet */}
      <section id="pilot-application" className="py-24 lg:py-40 relative text-center bg-white border-t border-slate-100 overflow-hidden">
        <GlowOrb className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] lg:h-[600px] w-[300px] lg:w-[600px] bg-primary/10" />
        <div className="relative z-10 mx-auto max-w-2xl px-6">
           <span className="text-[10px] lg:text-xs font-black uppercase tracking-[0.4em] lg:tracking-[0.6em] text-primary mb-8 lg:mb-10 block underline underline-offset-[12px] decoration-4">Early Access</span>
           <h2 className="text-4xl font-black uppercase italic tracking-tighter sm:text-7xl mb-8 lg:mb-10 leading-[0.85] text-balance text-slate-950">
             Join The <br />Cosmetology Cohort
           </h2>
           <p className="mx-auto mt-6 mb-12 max-w-xl text-lg lg:text-xl text-slate-700 leading-relaxed font-bold italic text-balance">
             The AI Enhanced Prep dashboard is live for barber candidates today, and in pilot development for cosmetology. Join the waitlist and we'll email candidates and schools the moment it opens.
           </p>

           {hasJoined ? (
             <div className="p-8 rounded-3xl bg-primary/5 border-2 border-primary/20 max-w-md mx-auto">
               <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-4" />
               <p className="text-lg font-black text-slate-950 uppercase tracking-tight">You're On The List</p>
               <p className="text-sm text-slate-600 font-bold mt-2">We'll email you the moment cosmetology AI Enhanced Prep is ready.</p>
             </div>
           ) : (
             <form onSubmit={handleJoinWaitlist} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
               <input
                 type="text"
                 placeholder="First name"
                 value={firstName}
                 onChange={(e) => setFirstName(e.target.value)}
                 className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-xl px-5 py-4 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none text-slate-900"
               />
               <input
                 type="email"
                 required
                 placeholder="Email address"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-xl px-5 py-4 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none text-slate-900"
               />
               <Button
                 type="submit"
                 disabled={isSubmitting}
                 size="lg"
                 className="whitespace-normal text-center leading-snug bg-primary text-white hover:bg-slate-950 gap-2 px-8 py-4 h-auto text-xs font-black uppercase tracking-widest rounded-xl shrink-0"
                 data-ig-click="outbound_lead"
               >
                 {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Join Waitlist<ArrowRight className="h-4 w-4" /></>}
               </Button>
             </form>
           )}
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6">
        <TdlrExamProcess courseName="Cosmetology Operator" hoursForWritten={900} />
      </div>

      {/* FAQ Section — People Also Ask / LLM answer extraction */}
      <section aria-label="Frequently Asked Questions About Texas Cosmetology Exam Prep" className="py-20 lg:py-32 bg-slate-50 border-t border-slate-200">
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-12 text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-4 block">Strategic Q&amp;A</span>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-950 sm:text-5xl leading-[0.9]">
              Texas Cosmetology Exam <br />Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-4">
            {[
              {
                q: "What is the Texas cosmetology written exam pass rate?",
                a: "Based on 2026 TDLR data across 7,502 test-takers, 72.1% of candidates eventually pass the PSI written exam, but only 58.9% pass on their first attempt — a 13-point gap driven by retesting, not by candidates never passing at all.",
              },
              {
                q: "Why do Texas cosmetology students fail the PSI written exam on the first try?",
                a: "Candidates pass the practical exam at a 96.9% rate (91.3% on the first attempt) — the failure is not a skills gap. The PSI written theory exam uses distractor logic and question syntax that standard classroom curricula don't explicitly address.",
              },
              {
                q: "What is the Texas Cosmetology Exam Intelligence Prep™?",
                a: "A proprietary ADI-powered (Artificial Domain Intelligence) preparation program by Inner G Complete Agency that decodes PSI distractor logic and aligns training with TDLR Chapter 83 for the Cosmetology Operator written exam.",
              },
              {
                q: "Is the Texas cosmetology exam practice deck free?",
                a: "Yes, the practice deck is free to use today. An AI-enhanced, personalized version is in pilot development — join the early access waitlist above to be notified when it launches.",
              },
              {
                q: "What is the NACCAS 70% threshold, and is cosmetology at risk?",
                a: "NACCAS requires accredited cosmetology schools to maintain a 70% written exam pass rate. Statewide, cosmetology sits just above that floor at 72.1% — but San Antonio's metro cluster (65.44%) is currently below it, which is enough to trigger a Request for Monitoring for schools in that cluster.",
              },
              {
                q: "Which Texas cities have the lowest cosmetology written exam pass rates?",
                a: "Based on 2026 TDLR data, San Antonio (65.44%) is the only major metro cluster currently below the NACCAS 70% threshold. Houston (71.5%) sits just above it. Dallas (76.3%) and El Paso (80.0%) post the strongest regional pass rates.",
              },
            ].map((faq, i) => (
              <details key={i} className="group rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="text-sm font-black uppercase tracking-wide text-slate-950 group-hover:text-primary transition-colors">{faq.q}</span>
                  <span className="ml-4 shrink-0 text-primary text-xl font-black group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="px-6 pb-6 text-base text-slate-600 leading-relaxed font-medium">{faq.a}</div>
              </details>
            ))}
          </div>

          {/* Cross-link to barber intelligence hub */}
          <div className="mt-16 p-8 rounded-2xl bg-primary/5 border border-primary/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Related Program</p>
            <p className="text-sm font-bold text-slate-700 mb-4 leading-relaxed">Looking for barber exam prep instead? The Texas barber written exam has its own, separate pass-rate data and a dedicated intelligence hub with an active school pilot scholarship.</p>
            <Link href="/texas-barber-exam-intelligence-prep" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary hover:underline">
              View Texas Barber Exam Intelligence Prep
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>
            {/* Questions derived from this route, so a page renamed or added
            to the same convention is handled without a second edit.
            See lib/agent-invite-questions.ts. */}
        <AgentInvite questions={questionsForSlug("texas-cosmetology-exam-intelligence-prep")!} />

</main>
  )
}
