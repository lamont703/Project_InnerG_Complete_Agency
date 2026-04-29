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
    title: "04/2026 Texas Barber Written Exam English Pass/Fail Roster",
    source: "TDLR Official Records",
    year: "2026",
    url: "/Texas Barber Bulletin.pdf",
  },
  {
    id: 2,
    authors: "Inner G Complete Agency",
    title: "Regional Market Analysis: El Paso Barber Education Cluster",
    source: "Inner G Strategy Division",
    year: "2026",
    url: "/insights/texas-barber-licensure-crisis",
  },
  {
    id: 3,
    authors: "TDLR Barber & Cosmetology Bulletin",
    title: "Institutional Performance Metrics & State Standards",
    source: "Texas Government Records",
    year: "2025",
    url: "/Texas Barber Bulletin.pdf",
  },
  {
    id: 4,
    authors: "National Accrediting Commission of Career Arts & Sciences (NACCAS)",
    title: "Accreditation Safety Thresholds & Federal Funding Compliance",
    source: "NACCAS.org",
    year: "2024",
    url: "https://naccas.org/",
  },
]

export const metadata = {
  title: "El Paso Barber Market Rescue Report | Inner G Complete",
  description: "A data-driven rescue audit of the El Paso barber market's 58.0% written exam failure rate. TDLR April 2026 roster analysis proposing the Barber Exam Prep Pilot Scholarship as the accreditation-saving solution.",
  keywords: [
    "El Paso barber exam fail rate",
    "Texas barber licensure crisis El Paso",
    "Socorro High School barber fail rate",
    "TDLR barber written exam El Paso",
    "barber school accreditation risk Texas",
    "Barber Exam Prep Pilot Scholarship",
    "El Paso barber school NACCAS",
    "Texas barber industry report 2026",
  ],
  openGraph: {
    title: "El Paso Barber Market Rescue Report | Inner G Complete",
    description: "58.0% aggregate fail rate. Socorro HS leads El Paso's licensure crisis. A data-backed rescue plan powered by the Barber Exam Prep Pilot Scholarship.",
    url: "https://innergcomplete.com/insights/el-paso-barber-market-rescue-report",
    type: "article",
    images: [{ url: "/el_paso_barber_rescue_report_cover.png", width: 1200, height: 630, alt: "El Paso Barber Market Rescue Report" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "El Paso Barber Market Rescue Report | Inner G Complete",
    description: "58.0% aggregate fail rate in El Paso. A TDLR-sourced industry rescue report with the Pilot Scholarship solution.",
    images: ["/el_paso_barber_rescue_report_cover.png"],
  },
  alternates: { canonical: "https://innergcomplete.com/insights/el-paso-barber-market-rescue-report" },
}

export default function ElPasoRescueReport() {
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
              "@id": "https://innergcomplete.com/insights/el-paso-barber-market-rescue-report"
            },
            "headline": "El Paso Barber Market Rescue Report | Regional Failure Rate Analysis",
            "description": "An industry rescue report analyzing the critical 58.0% failure rates in the El Paso barber market and proposing the Pilot Scholarship solution.",
            "author": {
              "@type": "Person",
              "name": "Lamont Evans",
              "url": "https://innergcomplete.com/about"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Inner G Complete Agency"
            },
            "datePublished": "2026-04-28T08:00:00Z"
          })
        }}
      />
      <BreadcrumbSchema slug="el-paso-barber-market-rescue-report" title="El Paso Barber Market Rescue Report | Inner G Complete" />
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
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Industry Rescue Report</span>
            </div>

            <ExecutiveSummary data={{
              "problem": "The El Paso barber market exhibits a statistically significant 58.0% aggregate failure rate, driven by a critical disconnect between high testing volume and licensure outcomes.",
              "requirement": "Immediate deployment of the Barber Exam Prep Pilot Scholarship to provide institutional-grade theory support for students at high-volume programs.",
              "roi": "Recovery of regional licensure velocity and stabilization of institutional accreditation for El Paso's core barber education clusters.",
              "solution": "Localized ADI-driven exam prep to bridge the gap between classroom hours and PSI theory logic."
            }} />
            
            <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-6xl md:text-7xl uppercase italic leading-[0.95] mb-8">
              The <span className="text-primary">El Paso</span> Barber <br />Market Rescue Report
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed font-medium text-balance mb-6">
              A strategic audit of the El Paso barber education cluster, where failing metrics at institutions like Socorro High School and Milan Institute signal a systemic need for theory-first intervention.
            </p>

            <StatisticalSignal signals={[
              {"label":"El Paso Aggregate Fail Rate","value":"58.00%","icon":"chart"},
              {"label":"Socorro HS Fail Rate","value":"58.50%","icon":"activity"},
              {"label":"Highest Failure Volume","value":"El Paso","icon":"shield"}
            ]} />

            <div className="flex flex-wrap items-center gap-4 mb-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <FileText className="h-3 w-3" /> TDLR April 2026 Roster
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <Shield className="h-3 w-3" /> Regional Intervention
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/20 px-4 py-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                 Data-Backed Recovery
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
          <div className="aspect-[21/9] rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-secondary/20">
            <Image
              src="/el_paso_barber_rescue_report_cover.png"
              alt="El Paso Barber Market Rescue Report Analysis"
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
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Rescue Mission Statement</p>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              This report is not designed to criticize El Paso's barber institutions. Instead, it serves as a data-driven "Rescue Map" to identify where students are struggling most. By providing the <Link href="/barber-school-pilot-scholarship-fund" className="font-black uppercase tracking-widest text-primary hover:underline">Barber Exam Prep Pilot Scholarship</Link>, we aim to support these schools and their students in overcoming the current licensure bottleneck.
            </p>
          </div>

          {/* Section 1: The El Paso Data Surge */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <BarChart3 className="h-5 w-5 text-destructive" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                01. The El Paso Data Surge: Statistical Significance
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-6">
              El Paso stands out in the April 2026 TDLR Roster as having the most statistical significance in terms of high testing volume coupled with a critical failure rate. While other cities show high percentages, El Paso's sheer volume makes its 58.0% aggregate fail rate a regional crisis.
              <Cite id={1} href="/Texas Barber Bulletin.pdf" />
            </p>
            
            {/* School Spotlight */}
            <div className="p-8 rounded-2xl border border-destructive/20 bg-destructive/5 mb-10">
              <h3 className="text-base font-black uppercase tracking-widest text-destructive mb-4">Institution Spotlight: Socorro High School</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                Socorro High School produced the highest absolute number of individual failing grades from a single institution in the provided data, with 24 failing grades out of 41 tests—a 58.5% fail rate. This volume indicates a critical need for theory-aligned prep tools.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-8 border-y border-border py-12">
              {[
                { pct: "58.00%", label: "El Paso Aggregate Fail", desc: "The combined failure rate across Socorro HS, El Pipo, Capelli, and Milan El Paso." },
                { pct: "58.50%", label: "Socorro HS Fail Rate", desc: "24 failures out of 41 tests—the highest volume failure point in the region." },
                { pct: "58.30%", label: "Bryan Aggregate Fail", desc: "Driven by James Earl Rudder HS and Goldstar Barber Academy." },
                { pct: "71.40%", label: "Beaumont Fail Rate", desc: "Barbers Trade School recorded the highest individual failure rate for high-volume programs." },
              ].map((item) => (
                <div key={item.label} className="p-6 rounded-2xl bg-white border border-border shadow-sm">
                  <div className="text-4xl font-black text-primary mb-2 tracking-tighter">{item.pct}</div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground mb-3">{item.label}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Regional Failure Pockets */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Map className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                02. The Heatmap: Regional Failure Pockets
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-10">
              Beyond El Paso, critical failure rates are concentrated in specific metropolitan pockets. These "Failure Pockets" highlight that the issue is not limited to one city but is a statewide instructional alignment challenge.
            </p>

            <div className="space-y-6">
              {[
                { city: "Laredo", rate: "57.1%", institutions: "Next Top Barber Academy, Immaculate Cut Barber Institute", status: "Critical" },
                { city: "Houston & San Antonio", rate: "55.0%", institutions: "Modern Barber College (HOU), Cut & Shave Barber & Beauty (SA)", status: "High Risk" },
                { city: "Dallas / Duncanville", rate: "52.4%", institutions: "Texas Fadez Barber College", status: "Warning" },
              ].map((item) => (
                <div key={item.city} className="flex flex-col sm:flex-row gap-6 p-8 rounded-2xl bg-white border border-border hover:border-primary/30 transition-all">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl font-black text-foreground uppercase italic tracking-tighter">{item.city}</span>
                      <span className="text-xs font-black text-primary bg-primary/10 px-2 py-1 rounded">{item.rate}</span>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium mb-1">Key Institutions: {item.institutions}</p>
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Risk Status: {item.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: NACCAS / Title IV Danger Zone */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-destructive" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                03. The Title IV Danger Zone: Accreditation at Risk
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-6">
              For every El Paso barber school, the NACCAS 70% written exam threshold is the institutional lifeline. When a school's aggregate pass rate drops below this mark on a quarterly basis, NACCAS issues a Request for Monitoring — the first step toward losing Federal Title IV eligibility.
              <Cite id={4} href="https://naccas.org/" />
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-10">
              Without Title IV, the average Texas barber academy loses access to the federal student loan pipeline that funds the majority of enrollment. At a 58.0% fail rate, El Paso's institutions are not just below the threshold — they are operating in the danger zone where accreditation remediation becomes mandatory.
            </p>

            <div className="p-8 rounded-2xl border border-primary/20 bg-primary/5">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4 flex items-center gap-2">
                <Activity className="h-3 w-3" />
                El Paso Scenario ROI Modeling
              </div>
              <div className="overflow-auto rounded-xl border border-border bg-white mt-4 shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/20">
                      <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Scenario</th>
                      <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Outcome Path</th>
                      <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Accreditation Safety</th>
                      <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-primary">Student Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Standard TX Curriculum Only", "58% Fail Rate · 90-Day Delay", "Probationary Risk", "Unlicensed Limbo"],
                      ["Generic Flashcard Apps", "Inconsistent Results", "Marginal Safety", "Baseline"],
                      ["Barber Exam Prep Scholarship", "Target 85%+ Pass Rate", "Secure NACCAS Buffer", "Licensed in 30 Days"],
                    ].map(([scenario, path, safety, outcome], i) => (
                      <tr key={i} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-white" : "bg-secondary/5"}`}>
                        <td className="px-6 py-4 font-bold text-foreground">{scenario}</td>
                        <td className="px-6 py-4 text-muted-foreground font-medium">{path}</td>
                        <td className="px-6 py-4 text-destructive font-bold">{safety}</td>
                        <td className="px-6 py-4 text-primary font-black">{outcome}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 4: The Rescue Solution */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                04. The Rescue Solution: Pilot Scholarship Fund
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-10">
              The primary solution to this data-proven crisis is the <Link href="/barber-school-pilot-scholarship-fund" className="font-black uppercase tracking-widest text-primary hover:underline">Barber Exam Prep Pilot Scholarship</Link>. By providing students and schools with AI-Enhanced, board-aligned practice decks, we bridge the cognitive gap that is currently costing El Paso's workforce millions in delayed wages.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { step: "Step 01", title: "Institutional Grant", desc: "Schools receive sponsored access to the Barber Intelligence exam prep deck for high-intent students." },
                { step: "Step 02", title: "Theory Alignment", desc: "Students training on the ADI model master the PSI syntax used in the 75-question theory exam." },
                { step: "Step 03", title: "Licensure Velocity", desc: "Recovering the 60-day licensure delay and stabilizing the school's NACCAS aggregate score." },
              ].map((s) => (
                <div key={s.step} className="p-6 rounded-2xl bg-primary/5 border border-primary/20">
                  <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">{s.step}</div>
                  <h4 className="text-sm font-black uppercase mb-2 leading-tight">{s.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed font-medium">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: The Direct Link to Funding */}
          <div className="p-12 rounded-3xl bg-foreground text-background relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Shield className="h-48 w-48" />
            </div>
            <div className="relative z-10">
              <div className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-6">
                Funding Opportunity
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-tight mb-6">
                Apply for the <br /><span className="text-primary">Pilot Scholarship</span> Fund
              </h2>
              <p className="text-lg opacity-80 mb-10 max-w-xl font-medium leading-relaxed">
                We are prioritizing El Paso-based students and schools for the initial scholarship cohort. Protect your licensure status and your school's reputation with board-aligned theory intelligence.
              </p>
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-10 py-7 text-xs font-black uppercase tracking-[0.3em] shadow-xl"
                asChild
              >
                <Link href="/barber-school-pilot-scholarship-fund">
                  View Scholarship Details
                  <ArrowRight className="ml-3 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Section 05: Institutional Verdict */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground text-balance">
                05. The Institutional Verdict: A Rescue Blueprint
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-10">
              The El Paso barber education cluster is not failing because its students lack talent or its instructors lack skill. The failure is rooted in a systemic gap between classroom preparation and the specific cognitive demands of the PSI written examination. The Barber Exam Prep Pilot Scholarship is the precision instrument designed to close that gap.
              <Cite id={2} href="/insights/texas-barber-licensure-crisis" />
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
              {[
                { step: "Phase 1: Diagnose", title: "Cognitive Gap Mapping", desc: "AI identifies the specific PSI theory domains where El Paso students show the highest dissonance." },
                { step: "Phase 2: Align", title: "Exam Syntax Training", desc: "Students learn to decode the trap-question logic used by Texas state board PSI proctors." },
                { step: "Phase 3: Certify", title: "Licensure Entry", desc: "First-time pass rates climb, schools recover NACCAS buffers, and students enter the chair earning." },
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
                &ldquo;El Paso's 58% fail rate is not a talent deficit. It is an informational alignment failure. The Pilot Scholarship is the corrective instrument that converts a failing statistic into a licensed workforce.&rdquo;
              </p>
              <p className="text-sm text-muted-foreground italic">
                Verified Research: Inner G State Strategy Division (2026).
                <Cite id={1} href="/Texas Barber Bulletin.pdf" />
              </p>
            </div>

            <div className="p-8 rounded-2xl border border-border bg-secondary/5 italic mb-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                &ldquo;Every barber student who fails the written exam is a licensed professional the workforce is waiting for. In El Paso, we are not waiting — we are rescuing.&rdquo;
              </p>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              For the full statewide context on why this crisis extends beyond El Paso, read our in-depth analysis:{" "}
              <Link href="/insights/texas-barber-licensure-crisis" className="text-primary font-bold hover:underline">
                The Texas Barber Licensure Crisis: A $15M Institutional Risk Analysis →
              </Link>
            </p>
          </div>

          {/* Research Methodology */}
          <div className="pt-16 border-t border-border">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Research Methodology &amp; Rigor</h3>
            </div>
            <div className="prose prose-sm max-w-none text-muted-foreground font-medium italic">
              <p className="mb-4">
                This report was generated following the Cognitive Project Management for AI (CPMAI) framework. All data points were synthesized directly from the April 2026 TDLR Texas Barber Written Exam English Pass/Fail Roster — an official government record. Failure rates are calculated from raw pass/fail counts per institution and aggregated by city.
              </p>
              <p>
                Scenario ROI modeling assumes a Texas baseline weekly commission for Class A Barbers and a 60-to-90 day licensure delay window associated with written exam re-testing cycles. The Barber Exam Prep Pilot Scholarship architecture is built on an Accreditation-First foundation to prioritize institutional NACCAS safety above all other outcomes.
              </p>
            </div>
          </div>

          {/* FAQ Section */}
          <FAQSection faqs={[
            {
              question: "Is this report meant to criticize El Paso barber schools?",
              answer: "Absolutely not. This is an industry rescue report. The data reveals a failure of informational alignment — the PSI exam tests specific cognitive patterns that standard curricula don't explicitly address. Our goal is to provide the scholarship solution to repair these metrics and protect every institution."
            },
            {
              question: "How can Socorro High School students access the scholarship?",
              answer: "Students from Socorro High School and other high-volume failure programs in El Paso are prioritized for the Pilot Scholarship Fund. Apply at the Barber School Pilot Scholarship Fund page to secure a sponsored seat in the board-aligned exam prep program."
            },
            {
              question: "What does 'Licensure Velocity' mean for my income?",
              answer: "Every day between finishing school hours and receiving your license is an unpaid day. At an average Texas barber weekly commission, a 60-day delay costs a student approximately $2,400-$4,000 in delayed earnings. The Scholarship is designed to eliminate that gap by achieving a first-time pass."
            },
            {
              question: "What is the NACCAS 70% threshold and why does it matter to my school?",
              answer: "NACCAS requires accredited schools to maintain a 70% written exam pass rate. Dropping below this triggers a Request for Monitoring, and consecutive failures can lead to the loss of Federal Title IV eligibility — which eliminates access to government-backed student loans and can shut down enrollment entirely."
            },
            {
              question: "How is the Barber Exam Prep Scholarship different from generic study apps?",
              answer: "Generic apps test raw facts. The Barber Intelligence ADI model decodes the specific question syntax and 'trap logic' used by Texas PSI proctors — teaching students the reasoning strategy behind the 75-question exam, not just the raw content."
            }
          ]} />


          {/* Technical Citations */}
          <TechnicalCitations citations={[
            { source: "TDLR", label: "April 2026 Written Exam English Pass/Fail Roster", url: "/Texas Barber Bulletin.pdf" },
            { source: "PSI Services", label: "Candidate Information Bulletin (CIB) Criteria", url: "https://test-takers.psiexams.com/tdlr" },
            { source: "NACCAS", label: "Institutional Compliance Standards", url: "https://naccas.org/" }
          ]} />

          <AuthorBio />

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
                    <p className="text-muted-foreground leading-relaxed font-medium">
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
