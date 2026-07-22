"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Navbar } from "@/components/layout/navbar"
import {
  Brain,
  LayoutDashboard,
  MapPin,
  Shield,
  ArrowRight,
  Clipboard,
  Check,
  Printer,
  BookOpen,
  Users,
  Clock,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PACPresentationKitPage() {
  const { setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState("agenda")
  const [activeSegment, setActiveSegment] = useState(0)
  const [copied, setCopied] = useState(false)

  // Form State
  const [schoolName, setSchoolName] = useState("")
  const [directorName, setDirectorName] = useState("")
  const [memberName, setMemberName] = useState("")
  const [memberRole, setMemberRole] = useState("Employer / Shop Owner")
  const [score1, setScore1] = useState(5)
  const [score2, setScore2] = useState(5)
  const [score3, setScore3] = useState(5)
  const [comments, setComments] = useState("")
  const [recommendation, setRecommendation] = useState("Endorse full integration of ADI suite into curriculum")
  const [showMinutes, setShowMinutes] = useState(false)

  useEffect(() => {
    setTheme("light")
  }, [setTheme])

  const agendaSegments = [
    {
      time: "00:00 - 00:05 (5 Mins)",
      title: "The Licensure Cliff Audit",
      action: "Identify Regional Vulnerability",
      script: "Present your school's current written pass rates against the strict national 70% threshold. Show why traditional paper flashcards fail to engage students.",
      talkingPoints: [
        "NACCAS and ACCSC require a quarterly written pass rate of at least 70%.",
        "A student who fails is delayed by 60-90 days, costing them upwards of $3,500 in lost earnings.",
        "Unregulated generic AI (like standard ChatGPT) causes students to memorize incorrect terminology."
      ]
    },
    {
      time: "00:05 - 00:12 (7 Mins)",
      title: "Software Demonstration",
      action: "Showcase Interactive Telemetry",
      script: "Open the interactive prototypes directly. Demonstrate the psychometric alignment and real-time outcomes.",
      talkingPoints: [
        "Demonstrate the Texas Barber Exam Intelligence Deck. Show how it aligns with actual PSI exam syntax.",
        "Walk through the Instructor Command Center, showing how teachers spot struggling students early.",
        "Show the Geospatial Placement Matcher maps and automated SMS outreach tools."
      ]
    },
    {
      time: "00:12 - 00:18 (6 Mins)",
      title: "The Employer ROI",
      action: "Address Local Staffing Needs",
      script: "Pivot directly to the salon/shop owners on the board. Address how these tools make graduates more employable.",
      talkingPoints: [
        "Ask the board members: 'Would an immediate, automated matching service help with your staffing bottlenecks?'",
        "Explain how automated placement tracking satisfies the 60% NACCAS / 70% ACCSC placement thresholds.",
        "Confirm that continuing education portal upgrades improve professional salon skills."
      ]
    },
    {
      time: "00:18 - 00:20 (2 Mins)",
      title: "Resolution & Vote",
      action: "Secure Official Endorsement",
      script: "Request the board members to complete the digital evaluation rubric. Document the resolution in the minutes.",
      talkingPoints: [
        "Pass the digital rubric link to committee members to fill out on their devices.",
        "Propose the official resolution to adopt Aesthetic Domain Intelligence.",
        "Ensure the final endorsement is recorded for your upcoming accreditation site visit."
      ]
    }
  ]

  const generateMinutesText = () => {
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    return `PROGRAM ADVISORY COMMITTEE (PAC) RESOLUTION MINUTE LOG
Date of Evaluation: ${today}
Institution Name: ${schoolName || "[Enter School Name]"}
Program Director: ${directorName || "[Enter Director Name]"}
Evaluator Name: ${memberName || "[Enter Evaluator Name]"}
Evaluator Category: ${memberRole}

EVALUATION SUMMARY & FEEDBACK SCORING:
1. Geospatial Placement Alignment Score: ${score1}/5
2. Instructor Dashboard Utility Score: ${score2}/5
3. Continuing Education Portal Innovation Score: ${score3}/5

QUALITATIVE COMMITTEE FEEDBACK:
"${comments || "No comments provided. The committee agrees that the tools align with local employer expectations."}"

OFFICIAL BOARD RECOMMENDATION:
"${recommendation}"

COMPLIANCE VERDICT:
"The Program Advisory Committee has reviewed the Aesthetic Domain Intelligence (ADI) platform. The committee officially resolves that integrating these interactive tools directly supports graduate licensure readiness, accelerates job placement velocity, and satisfies the pedagogical oversight requirements set by NACCAS Standard VII / ACCSC Student Achievement benchmarks."

Signed by Evaluator: ___________________________`
  }

  const handleCopyMinutes = () => {
    navigator.clipboard.writeText(generateMinutesText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col light selection:bg-primary/20">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden bg-white border-b border-slate-200">
        <div className="absolute inset-0 z-0 opacity-40 bg-[url('/aesthetic-intelligence-bg.png')] bg-cover bg-center bg-no-repeat" aria-hidden="true" />
        <div className="absolute inset-0 z-0 bg-white/70 backdrop-blur-[2px]" aria-hidden="true" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[700px] rounded-full bg-primary/5 blur-3xl pointer-events-none z-0" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase">Accreditation Safety Tool</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 text-balance leading-tight">
            Accreditation Advisory <br />
            <span className="text-primary inline-block mt-2">Committee Toolkit</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-slate-600 leading-relaxed">
            De-risk and propose board-aligned AI learning systems to your Program Advisory Committee (PAC). Secure official endorsements, run digital agendas, and generate audit-ready meeting minutes instantly.
          </p>
        </div>
      </section>

      {/* Tab Selectors */}
      <section className="bg-white border-b border-slate-200 sticky top-20 z-30 shadow-sm">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex justify-center border-b border-slate-100">
            {[
              { id: "agenda", label: "Interactive Agenda", icon: Clock },
              { id: "rubric", label: "Digital Rubric Form", icon: Users },
              { id: "minutes", label: "Minutes Generator", icon: Clipboard },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="py-16 flex-1">
        <div className="mx-auto max-w-4xl px-6">
          
          {/* TAB 1: INTERACTIVE AGENDA */}
          {activeTab === "agenda" && (
            <div className="space-y-8 animate-fadeIn">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Meeting Presenter Instructions
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Use this screen to guide your committee through the meeting. Project this layout on the board and click through each segment below to reveal talking scripts, compliance requirements, and slides.
                </p>
              </div>

              {/* Agenda Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                {agendaSegments.map((segment, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSegment(idx)}
                    className={`p-4 rounded-xl text-left border transition-all ${
                      activeSegment === idx
                        ? "bg-primary text-primary-foreground border-primary shadow-md scale-102"
                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="text-[9px] font-black uppercase tracking-wider opacity-85 mb-1">{segment.time}</div>
                    <div className="text-xs font-extrabold leading-tight uppercase tracking-tight">{segment.title}</div>
                  </button>
                ))}
              </div>

              {/* Segment Content Detail */}
              <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-4 gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] bg-primary/10 px-3 py-1 rounded-full">
                      {agendaSegments[activeSegment].time}
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 mt-2 uppercase italic tracking-tight">
                      {agendaSegments[activeSegment].title}
                    </h3>
                  </div>
                  <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Goal: {agendaSegments[activeSegment].action}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">Presentation Script:</h4>
                  <p className="text-base text-slate-700 leading-relaxed font-medium italic border-l-4 border-slate-300 pl-4">
                    &ldquo;{agendaSegments[activeSegment].script}&rdquo;
                  </p>
                </div>

                <div className="space-y-4 pt-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">Critical Agenda Telemetry:</h4>
                  <ul className="space-y-3">
                    {agendaSegments[activeSegment].talkingPoints.map((point, i) => (
                      <li key={i} className="flex gap-3 text-sm text-slate-600 leading-relaxed font-medium">
                        <span className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 flex justify-between border-t border-slate-100">
                  <Button
                    onClick={() => setActiveSegment((prev) => Math.max(0, prev - 1))}
                    disabled={activeSegment === 0}
                    variant="outline"
                    className="border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    Previous Segment
                  </Button>
                  {activeSegment < agendaSegments.length - 1 ? (
                    <Button
                      onClick={() => setActiveSegment((prev) => Math.min(agendaSegments.length - 1, prev + 1))}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Next Segment
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setActiveTab("rubric")}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Go to Evaluation Rubric
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIGITAL RUBRIC FORM */}
          {activeTab === "rubric" && (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8 animate-fadeIn">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 uppercase italic tracking-tight">
                  Advisory Board Evaluation Rubric
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed font-medium mt-2">
                  Advisory committee members can fill out this form on their mobile devices or tablets to evaluate the Aesthetic Domain Intelligence suite.
                </p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); setShowMinutes(true); setActiveTab("minutes") }} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">School Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Royal Barber Academy"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-sm font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Program Director</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Elena Rodriguez"
                      value={directorName}
                      onChange={(e) => setDirectorName(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-sm font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Board Member Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Marcus Vance"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-sm font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Member Category</label>
                    <select
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-sm font-semibold bg-white"
                    >
                      <option>Employer / Shop Owner</option>
                      <option>Program Graduate</option>
                      <option>Educational Administrator</option>
                      <option>Lay Public / Community Member</option>
                    </select>
                  </div>
                </div>

                {/* Score 1 */}
                <div className="space-y-4 border-t border-slate-100 pt-6">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-extrabold uppercase tracking-tight text-slate-800">
                      1. Placement Matcher Alignment Score: {score1}/5
                    </label>
                    <span className="text-[10px] text-muted-foreground">Local Shop Hiring Match</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={score1}
                    onChange={(e) => setScore1(Number(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <p className="text-xs text-slate-500 font-medium">
                    How well does an automated career-matching and SMS-interview outreach tool align with active barber/salon employment strategies?
                  </p>
                </div>

                {/* Score 2 */}
                <div className="space-y-4 border-t border-slate-100 pt-6">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-extrabold uppercase tracking-tight text-slate-800">
                      2. Instructor Dashboard Utility Score: {score2}/5
                    </label>
                    <span className="text-[10px] text-muted-foreground">Academic Telemetry</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={score2}
                    onChange={(e) => setScore2(Number(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <p className="text-xs text-slate-500 font-medium">
                    Does providing instructors with live students exam statistics help protect passing thresholds?
                  </p>
                </div>

                {/* Score 3 */}
                <div className="space-y-4 border-t border-slate-100 pt-6">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-extrabold uppercase tracking-tight text-slate-800">
                      3. Continuing Education Portal Score: {score3}/5
                    </label>
                    <span className="text-[10px] text-muted-foreground">Curriculum Efficacy</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={score3}
                    onChange={(e) => setScore3(Number(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <p className="text-xs text-slate-500 font-medium">
                    Does upgrading from paper sheets to interactive CE portals improve overall graduate professionalism?
                  </p>
                </div>

                {/* Qualitative Feedback */}
                <div className="space-y-2 border-t border-slate-100 pt-6">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Qualitative Board Comments</label>
                  <textarea
                    rows={4}
                    placeholder="Enter any specific feedback, recommendations, or custom requests from the board members..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="w-full p-4 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-sm font-semibold"
                  />
                </div>

                {/* Official Recommendation */}
                <div className="space-y-2 border-t border-slate-100 pt-6">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Official Recommendation</label>
                  <select
                    value={recommendation}
                    onChange={(e) => setRecommendation(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-sm font-semibold bg-white"
                  >
                    <option>Endorse full integration of ADI suite into curriculum</option>
                    <option>Endorse pilot integration (exam prep module only)</option>
                    <option>Request technical adjustments before official deployment</option>
                  </select>
                </div>

                <div className="pt-6">
                  <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 font-bold uppercase tracking-widest text-xs"
                  >
                    Generate Official Minute Log
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: MINUTES GENERATOR */}
          {activeTab === "minutes" && (
            <div className="space-y-8 animate-fadeIn">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                  <Clipboard className="h-5 w-5 text-primary" />
                  Compliance Minutes Output
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Review and copy this compiled text block directly into your school's official board minutes or print it out to keep in your NACCAS/ACCSC accreditation audit binder.
                </p>
              </div>

              <div className="bg-slate-900 text-slate-100 p-8 rounded-2xl border border-slate-800 shadow-xl font-mono text-xs leading-relaxed space-y-6 relative overflow-hidden">
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={handleCopyMinutes}
                    className="p-2 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                    title="Copy to Clipboard"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-green-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Clipboard className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={handlePrint}
                    className="p-2 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                    title="Print Minutes"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print
                  </button>
                </div>

                <pre className="whitespace-pre-wrap select-all pr-12 font-mono">
                  {generateMinutesText()}
                </pre>
              </div>

              <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5">
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-tight text-slate-900">What to do next?</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium mt-1">
                      Present this resolution document to the board members at your next meeting. Have them sign the printed copy and store it safely in your compliance cabinet. It provides the definitive proof of pedagogical oversight NACCAS/ACCSC compliance officers seek during audit sweeps.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </section>

    </main>
  )
}
