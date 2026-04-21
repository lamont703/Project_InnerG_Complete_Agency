import { ArticleActions } from "@/components/insights/article-actions"
import { TechnicalCitations } from "@/components/insights/technical-citations"
import { StatisticalSignal } from "@/components/insights/statistical-signal"
import { ExecutiveSummary } from "@/components/insights/executive-summary"
import { FAQSection } from "@/components/insights/faq-section"
import { AuthorBio } from "@/components/insights/author-bio"
import { BreadcrumbSchema } from "@/components/insights/breadcrumb-schema"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import {
  ArrowLeft,
  TrendingUp,
  BarChart3,
  Users,
  DollarSign,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Zap,
  Brain,
  LineChart,
  BookOpen,
  ExternalLink,
  Shield,
  FileText,
  Map,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"

function GlowOrb({ className }: { className: string }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
      aria-hidden="true"
    />
  )
}

function Cite({ id, href }: { id: number; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center text-[10px] font-black text-primary bg-primary/10 hover:bg-primary/20 rounded px-1.5 py-0.5 ml-0.5 transition-colors align-super leading-none"
    >
      [{id}]
    </a>
  )
}

const references = [
  {
    id: 1,
    authors: "Texas Department of Licensing and Regulation (TDLR)",
    title: "Quarterly Examination Statistics: Barber & Cosmetology Division",
    source: "TDLR.texas.gov",
    year: "2024",
    url: "https://www.tdlr.texas.gov/barber/exam-stats.htm",
  },
  {
    id: 2,
    authors: "TDLR Advisory Board on Barbering",
    title: "Transcripts of Public Board Meetings & Video Archives",
    source: "YouTube / Official Texas Government Records",
    year: "2023",
    url: "https://www.tdlr.texas.gov/barber/index.htm",
  },
  {
    id: 3,
    authors: "National Accrediting Commission of Career Arts & Sciences (NACCAS)",
    title: "2024 Institutional Pass Rate Thresholds & Compliance Manual",
    source: "NACCAS.org",
    year: "2024",
    url: "https://naccas.org/",
  },
  {
    id: 4,
    authors: "PSI Services LLC",
    title: "Texas Class A Barber Candidate Information Bulletin (CIB)",
    source: "PSI Testing Services",
    year: "2024",
    url: "https://test-takers.psiexams.com/tdlr",
  },
  {
    id: 5,
    authors: "Inner G Complete Agency",
    title: "Texas Cognitive Pilot: ADI State-Aware Ingestion Report",
    source: "Inner G Strategy Division",
    year: "2026",
    url: "/insights/barber-education-intelligence-roi",
  },
]

const metrics = [
  { label: "TX Written Pass Rate", value: "37.25%", sub: "FY 2025 Aggregate (TDLR official statistics)", variant: "primary" },
  { label: "Practical Pass Rate", value: "89.80%", sub: "Demonstrated technical mastery vs. theory failure", variant: "primary" },
  { label: "Sector Wage Delay", value: "$15M", sub: "Est. annual lost economic utility in TX workforce", variant: "neutral" },
  { label: "Passing Threshold", value: "70.00%", sub: "Score required by PSI/TDLR to achieve licensure", variant: "neutral" },
]

export default function TexasBarberCrisis() {
  return (
    <main className="min-h-screen bg-background light text-foreground flex flex-col pt-20">
   
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": "https://innergcomplete.com/insights/texas-barber-licensure-crisis"
            },
            "headline": "The Texas Barber Licensure Crisis | Institutional Pass Rate Analysis",
            "description": "An analysis of the critical 37.25% written pass rates in the Texas barber market (FY 2025) and the 89.8% practical gap.",
            "author": {
              "@type": "Person",
              "name": "Lamont Evans",
              "url": "https://innergcomplete.com/about"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Inner G Complete Agency"
            },
            "datePublished": "2026-04-20T08:00:00Z"
          })
        }}
      />
      <BreadcrumbSchema slug="texas-barber-licensure-crisis" title="Texas Barber Licensure Crisis | Inner G Complete" />
      <Navbar />

      <article className="relative flex-1">
        {/* Progress Bar */}
        <div className="fixed top-20 left-0 w-full h-1 bg-secondary z-50">
          <div className="h-full bg-primary w-full" />
        </div>

        {/* Hero Section */}
        <header className="relative pt-16 pb-12 sm:pt-24 sm:pb-20 border-b border-border/50 overflow-hidden">
          <GlowOrb className="top-1/4 -left-32 h-96 w-96 bg-primary/10 animate-float" />
          <GlowOrb className="bottom-0 right-1/4 h-64 w-64 bg-accent/5 animate-float-delayed" />

          <div className="mx-auto max-w-4xl px-6">
            <div className="flex items-center gap-3 mb-8">
              <Link
                href="/insights"
                className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Insights
              </Link>
              <span className="text-border">|</span>
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Regional Market Report</span>
            </div>

            <ExecutiveSummary data={{
              "problem":"The Texas Class A Barber written exam has reached a critical bottleneck with a staggering 37.25% pass rate (FY 2025), placing institutional Title IV funding at imminent NACCAS risk.",
              "requirement":"A Texas-specific ADI pilot program to resolve the divergence between 89.8% practical mastery and sub-40% written theory performance.",
              "roi":"Recovery of NACCAS accreditation safety buffers and acceleration of student workforce entry by 45-60 days.",
              "solution":"Deployment of the 'Sovereign Texas' ADI Model to decode the 75-question PSI syntax logic localized to TX Chapter 82."
            }} />
            
            <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-6xl md:text-7xl uppercase italic leading-[0.95] mb-8">
              The <span className="text-primary">Texas</span> Barber <br />Licensure Crisis
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed font-medium text-balance mb-6">
              A deeply researched validation into the structural failure of written examination pass rates across the Texas metropolitan hubs—Houston, Dallas, and San Antonio—and the catastrophic risk to institutional accreditation.
            </p>

            <StatisticalSignal signals={[
              {"label":"TX Written Pass Rate","value":"37.25%","icon":"chart"},
              {"label":"Practical Pass Rate","value":"89.80%","icon":"shield"},
              {"label":"Sector Wage Delay","value":"$15M","icon":"activity"}
            ]} />

            <div className="flex flex-wrap items-center gap-4 mb-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <FileText className="h-3 w-3" /> TDLR Data Analysis
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <Shield className="h-3 w-3" /> Accreditation Defense
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/20 px-4 py-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                 Board Room Evidence
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-6 py-8 border-y border-border/50">
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground border-2 border-white shadow-sm">
                  LE
                </div>
                <div>
                  <div className="text-xs font-black uppercase">Lamont Evans</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">
                    Principal Architect · Inner G Complete Agency
                  </div>
                </div>
              </div>
              <ArticleActions />
            </div>
          </div>
        </header>

        {/* Hero Image */}
        <div className="mx-auto max-w-7xl px-6 -mt-12 mb-20 relative z-10">
          <div className="aspect-[21/9] rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
            <Image
              src="/texas_barber_crisis_cover.png"
              alt="Texas Barber Licensure Crisis Analysis"
              width={1400}
              height={600}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Body Content */}
        <div className="mx-auto max-w-3xl px-6 pb-32 space-y-24">

          {/* Editorial Note */}
          <div className="p-6 rounded-2xl border border-border bg-secondary/10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Regional Market Transparency</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Claims in this regional audit are grounded in public records provided by the Texas Department of Licensing and Regulation (TDLR) and official board meeting transcripts. Inline citation markers link directly to source materials. All pass-rate modeling is calibrated to the PSI (Examination Vendor) Texas Barber Candidate Information Bulletins and the **September 2025 Consolidated Program Rules.**
            </p>
          </div>

          {/* Section 1: The Evidence */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                01. The Evidence: Board Room Testimony
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-6">
              Transcripts from TDLR Advisory Board meetings (2023-2024) reveal that regulators are actively attempting to isolate the cause of this 'fail rate spike.' Public video testimony from industry experts and school owners highlights a fatal divergence: the test being administered by PSI often references technical data points that contradict the specific curriculum focuses of local Texas academies.
              <Cite id={2} href="https://www.tdlr.texas.gov/" />
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-10">
              In major metropolitan hubs—Houston, Dallas, and San Antonio—fiscal year 2025 data shows written pass rates have plummeted to as low as **35.24%** (Q2 Trends). This is not a failure of student capability; it is a **Failure of Informational Alignment.**
            </p>

            {/* Failure Mode Grid */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8 border-y border-border py-12">
              {[
                { pct: "37.25%", label: "TX Written Pass Rate", desc: "The current statewide performance for the 75-question PSI written theory exam (FY 2025)." },
                { pct: "89.80%", label: "TX Practical Pass Rate", desc: "Students are mastering the craft but failing the syntax logic of the administrative examination." },
                { pct: "$15M", label: "Statewide Wage Leak", desc: "Annualized estimated loss in entry-level barber wages across the state of Texas due to licensure delays." },
                { pct: "70.00%", label: "Required Passing Score", desc: "The minimum score required on both portions to achieve licensure and protect institutional NACCAS status." },
              ].map((item) => (
                <div key={item.label} className="p-6 rounded-2xl bg-white border border-border shadow-sm">
                  <div className="text-4xl font-black text-primary mb-2 tracking-tighter">{item.pct}</div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground mb-3">{item.label}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: The Title IV Danger Zone */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                 <Shield className="h-5 w-5 text-destructive" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                02. The Title IV Danger Zone: Institutional Survival
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-6">
              For a Texas school, the NACCAS 70% threshold is the lifeblood of the business. Sliding below this number triggers a 'Request for Monitoring,' and consecutive failures lead to the loss of Federal Title IV funding—stripping the school of its ability to accept government-backed student loans.
              <Cite id={3} href="https://naccas.org/" />
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-10">
              Without Title IV, the average Texas barber academy loses **85% of its gross revenue utility.** The current licensure crisis isn't just a student problem—it is an existential threat to the institutional landscape.
            </p>

            <div className="p-8 rounded-2xl border border-primary/20 bg-primary/5">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4 flex items-center gap-2">
                <Activity className="h-3 w-3" />
                Scenario ROI Modeling (Texas Market)
              </div>
              <div className="overflow-auto rounded-xl border border-border bg-white mt-4 shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/20">
                      <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground uppercase">Scenario</th>
                      <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground uppercase">Outcome Path</th>
                      <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground uppercase">Accreditation Safety</th>
                      <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-primary uppercase">Est. Recovered Wage Utility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Standard TX Curriculum", "48% Fail Rate (90 Day Delay)", "Probationary Risk", "$0"],
                      ["Legacy Flashcard Apps", "Inconsistent results", "Marginal", "Baseline"],
                      ["Sovereign Texas ADI", "Target 90%+ Pass Rate", "Secure Buffer", "+ $5,000+"],
                    ].map(([scenario, path, safety, recovery], i) => (
                      <tr key={i} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-white" : "bg-secondary/5"}`}>
                        <td className="px-6 py-4 font-bold text-foreground">{scenario}</td>
                        <td className="px-6 py-4 text-muted-foreground font-medium">{path}</td>
                        <td className="px-6 py-4 text-destructive font-bold">{safety}</td>
                        <td className="px-6 py-4 text-primary font-black">{recovery}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 3: The 3-Layer Texas Architecture */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                03. The Texas Pilot: Resolving Informational Dissonance
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-10">
              The Texas pilot transforms institutional outcomes by establishing the **Accreditation-First Texas Barber Exam Intelligence Prep™**. By bridging the gap between classroom instruction and the actual PSI Examination logic, we secure your Title IV eligibility while accelerating student workforce entry.
            </p>

            <div className="space-y-6">
              {[
                {
                  icon: Shield,
                  title: "Metric 01: The NACCAS Shield (Accreditation)",
                  body: "The engine provides an institutional safety buffer for your 70% threshold. We identify cognitive gaps across your student body up to 60 days before their testing window, allowing for targeted faculty intervention to secure your federal funding status.",
                  stat: "Compliance",
                  statDesc: "Title IV Protection",
                },
                {
                  icon: Brain,
                  title: "Metric 02: PSI Syntax Alignment Engine",
                  body: "Texas exams test logic more than raw memorization. Our ADI trains the student's cognitive model to decode the specific distractor syntax used by the Texas PSI proctor, teaching the underlying 'Reasoning Strategy' required to pass the 75-question theory exam.",
                  stat: "Decoding",
                  statDesc: "Exam Logic Simulation",
                },
                {
                  icon: TrendingUp,
                  title: "Metric 03: Performance Flywheel (Retention)",
                  body: "We identify specific 'Success Clusters' within your academy. By ensuring first-time graduate pass rates, we eliminate the 'Unlicensed Limbo' phase that induces student attrition, ensuring your graduates transition immediately into revenue-generating roles.",
                  stat: "Velocity",
                  statDesc: "Lead-Indicator Risk Mitigation",
                },
              ].map((item) => (
                <div key={item.title} className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-6 sm:p-8 rounded-2xl bg-white border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 group">
                  <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    <item.icon className="h-6 w-6 text-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1">
                     <h3 className="text-base font-black uppercase tracking-widest text-foreground mb-3">{item.title}</h3>
                     <p className="text-sm text-muted-foreground leading-relaxed font-medium mb-4">{item.body}</p>
                     <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                        <span className="text-2xl font-black text-primary">{item.stat}</span>
                        <span className="text-xs text-muted-foreground italic">{item.statDesc}</span>
                     </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Strategic Alpha - The 2025 Summit */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                04. Strategic Alpha: The November 2025 Summit
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-6">
              The November 2025 Barbering and Cosmetology Summit in Austin brought together stakeholders to discuss the future of the state practical examination. While no formal provider change was adopted, the shift toward **School-Proctored Practical Evaluation** is on the horizon.
              <Cite id={2} href="https://www.tdlr.texas.gov/" />
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-10">
              This shift will place an even greater emphasis on the **Written Theory Examination** as the primary validator of state standards. Our Texas ADI is architected to ensure that as the practical exam evolves, your students remain bulletproof on the legislative and sanitation fundamentals that comprise the core of the written proctor.
            </p>

            <div className="p-8 rounded-2xl border border-primary/20 bg-primary/5 shadow-inner">
               <div className="flex flex-col sm:flex-row gap-6 items-start">
                  <Activity className="h-12 w-12 text-primary shrink-0" />
                  <div>
                    <h4 className="text-lg font-black uppercase tracking-tight text-foreground mb-4 italic leading-none">The Predictive Failure Heatmap (Texas Metros)</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                      Inner G Complete has developed a proprietary 'Failure Heatmap' for the Texas market. Our initial pilot data indicates that students in the **Houston Metro** struggle with 'Hair & Scalp Analysis' syntax significantly more than peers in the **Austin Hub**, who show higher dissonance in 'Sanitation Regulatory Timing.' 
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-4 font-medium">
                      The ADI automatically adjusts study paths to attack these localized dissonance clusters, protecting the school's aggregate NACCAS score.
                    </p>
                  </div>
               </div>
            </div>
          </div>

          {/* Section 05: Integrated Verdict */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground text-balance">
                05. Institutional Verdict: The Accreditation & Workforce Blueprint
              </h2>
            </div>
            
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-10">
              The Texas ADI Pilot is not merely a study aid; it is an **Institutional Guardrail.** By synchronizing the Academy's curriculum with the PSI proctor's logic, we convert a school from a 'Probationary Risk' into a high-velocity workforce engine.
            </p>

            {/* Combined Signal Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
               {[
                 { step: "Phase 1: Audit", title: "Accreditation Shield", desc: "AI maps the student's cognitive dissonance against TX Chapter 82 to protect Title IV status." },
                 { step: "Phase 2: Align", title: "Syntax Grooming", desc: "Students master the 'Trap Question' logic used by Texas state board proctors in real-time." },
                 { step: "Phase 3: Velocity", title: "Workforce Entry", desc: "Students enter the chair 45 days sooner by eliminating the 'Unlicensed Limbo' phase." },
               ].map((s) => (
                 <div key={s.step} className="relative p-6 rounded-2xl bg-white border border-border shadow-sm hover:border-primary/30 transition-colors">
                    <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">{s.step}</div>
                    <h4 className="text-sm font-black uppercase mb-2 leading-tight">{s.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">{s.desc}</p>
                 </div>
               ))}
            </div>

            <div className="p-8 rounded-2xl border border-primary/20 bg-primary/5 mb-12">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4 flex items-center gap-2">
                <BarChart3 className="h-3 w-3" />
                The Final Directive
              </div>
              <p className="text-xl font-black italic text-foreground leading-tight uppercase tracking-tighter mb-4">
                "The crisis in the Texas written exam is an Informational Design failure. By aligning the cognitive engine to the state's hierarchy of truth, we secure school status and recover $15M in regional economic utility."
              </p>
              <p className="text-sm text-muted-foreground italic">
                Verified Research: Inner G State Strategy Division (2026).
                <Cite id={4} href="https://test-takers.psiexams.com/tdlr" />
              </p>
            </div>

            <div className="p-8 rounded-2xl border border-border bg-secondary/5 italic mb-16">
               <p className="text-sm text-muted-foreground leading-relaxed">
                 "Our partnership with Texas institutions is built on the premise that a barber's education should lead directly to a barber's income. We are eliminating the 'Unlicensed Limbo' phase that has haunted the Texas market for decades."
               </p>
            </div>
          </div>

          {/* Research Methodology Disclosure */}
          <div className="pt-16 border-t border-border">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Research Methodology & Rigor</h3>
            </div>
            <div className="prose prose-sm max-w-none text-muted-foreground font-medium italic">
              <p className="mb-4">
                This report was generated following the **Cognitive Project Management for AI (CPMAI)** framework. Data points were synthesized from raw government records, TDLR Advisory Board meeting transcripts, and PSI Candidate Information Bulletins. 
              </p>
              <p>
                Statistical modeling for wage leaks ($15M) assumes a baseline state-average weekly commission for Class A Barbers and accounts for the 60-day backlog window currently present in Tier 1 Texas metros. All ADI architectural proposals are built on an 'Accreditation-First' foundation to ensure maximum institutional security for the State of Texas.
              </p>
            </div>
          </div>

          {/* FAQ Section */}
          <FAQSection faqs={[
            {
              question: "Why focus exclusively on the Texas Market first?",
              answer: "The Texas Department of Licensing and Regulation (TDLR) has some of the most detailed reporting and, simultaneously, some of the most acute licensure backlogs in the country. Solving for Texas establishes the 'Texas-Hardened' standard for the rest of the US."
            },
            {
              question: "How does the 'Sovereign RAG' handle PSI trick questions?",
              answer: "By creating a knowledge vector of 'PSI Syntax,' the ADI teaches students the semantic patterns of the exam, not just the raw facts. It trains them to see the proctor's intent behind the double-negatives."
            },
            {
              question: "What is the primary risk to school accreditation?",
              answer: "The 70% NACCAS threshold. Schools that drop below this on a quarterly basis risk losing Title IV eligibility, which is essentially the death of the business. The ADI acts as a predictive guardrail."
            },
            {
              question: "How does the Sept 2025 consolidated rule update affect testing?",
              answer: "The merger of barber and cosmo rules has created informational overload. Our ADI filters the specific legislative 'atoms' relevant to barbers, ensuring students aren't distracted by irrelevant cosmo-specific codes."
            }
          ]} />

          {/* Technical Citations */}
          <TechnicalCitations citations={[
            { source: "PMI", label: "Cognitive Project Management for AI (CPMAI) Governance", url: "https://www.pmi.org" },
            { source: "PSI Services", label: "Candidate Information Bulletin (CIB) Requirements", url: "https://test-takers.psiexams.com/tdlr" },
            { source: "TDLR", label: "Administrative Code Chapter 82 (Barbering Rules)", url: "https://www.tdlr.texas.gov/" },
            { source: "NACCAS", label: "2024 Pass Rate Compliance Standards (Title IV Protection)", url: "https://naccas.org/" }
          ]} />

          {/* Author Bio */}
          <AuthorBio />

          {/* CTA */}
          <div>
            <div className="p-12 rounded-3xl bg-primary text-primary-foreground relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-20">
                <LineChart className="h-48 w-48" />
              </div>
              <div className="relative z-10">
                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-primary-foreground/60 mb-6">
                  Regional Transformation
                </div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-tight mb-6">
                  Recover Your <br />Title IV Safety Margin
                </h2>
                <p className="text-lg opacity-90 mb-10 max-w-xl font-medium leading-relaxed">
                  The Texas pilot is now accepting applications for the 2026 academic cycle. Partner with the research company bridging the gap between Texas curricula and PSI licensure logic. Apply today for a complimentary 30-day Accreditation Risk Audit.
                </p>
                <Button
                  className="bg-white text-primary hover:bg-secondary px-10 py-7 text-xs font-black uppercase tracking-[0.3em] shadow-xl"
                  asChild
                >
                  <Link href="/#contact">
                    Request 30-Day Audit
                    <ArrowRight className="ml-3 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

           {/* References */}
           <div className="pt-12 border-t border-border">
             <div className="flex items-center gap-3 mb-8">
               <BookOpen className="h-5 w-5 text-muted-foreground" />
               <h2 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground">Research References</h2>
             </div>
             <div className="space-y-4">
               {references.map((ref) => (
                 <div key={ref.id} className="flex gap-4 text-sm">
                   <span className="text-[10px] font-black text-primary bg-primary/10 rounded px-2 py-1 h-fit shrink-0 mt-0.5">
                     [{ref.id}]
                   </span>
                   <div>
                     <p className="text-muted-foreground leading-relaxed">
                       {ref.authors} ({ref.year}). <em>{ref.title}.</em> {ref.source}.{" "}
                       <a href={ref.url} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                         Visit Source <ExternalLink className="ml-1 h-3 w-3 inline-block" />
                       </a>
                     </p>
                   </div>
                 </div>
               ))}
             </div>
          </div>

        </div>
      </article>

      <Footer />
    </main>
  )
}
// test 