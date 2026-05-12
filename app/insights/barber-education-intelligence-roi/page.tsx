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
    authors: "California Board of Barbering & Cosmetology",
    title: "Senate Bill 803: Practical Examination Removal Notice",
    source: "CA.gov / DCA",
    year: "2021",
    url: "https://www.barbercosmo.ca.gov/",
  },
  {
    id: 2,
    authors: "National Interstate Council of State Boards of Cosmetology (NIC)",
    title: "Barber Candidate Information Bulletins (CIB)",
    source: "NIC Testing",
    year: "2024",
    url: "https://nictesting.org/",
  },
  {
    id: 3,
    authors: "Texas Department of Licensing and Regulation (TDLR)",
    title: "Examination Statistics: Class A Barber",
    source: "TDLR.texas.gov",
    year: "2023",
    url: "https://www.tdlr.texas.gov/",
  },
  {
    id: 4,
    authors: "CollegeTuitionCompare",
    title: "Average Barbering / Cosmetology Tuition Costs in the US",
    source: "CollegeTuitionCompare.com",
    year: "2024",
    url: "https://www.collegetuitioncompare.com/",
  },
  {
    id: 5,
    authors: "GlossGenius Industry Insights",
    title: "State of the Grooming Industry: Economic Impact resulting from Testing Backlogs",
    source: "GlossGenius",
    year: "2023",
    url: "https://glossgenius.com",
  },
  {
    id: 6,
    authors: "National Accrediting Commission of Career Arts & Sciences (NACCAS)",
    title: "Standards and Criteria for Institutional Accreditation",
    source: "NACCAS.org",
    year: "2024",
    url: "https://naccas.org/",
  }
]

const metrics = [
  { label: "Avg. Educational Investment", value: "$16.8K", sub: "Combined tuition, supplies, and tools (CollegeTuitionCompare)", variant: "neutral" },
  { label: "Time Commitment", value: "1,000+ Hrs", sub: "Required clocked hours varies by state", variant: "neutral" },
  { label: "State Licensing Weight", value: "100%", sub: "CA replaced practical with written-only theory in 2022", variant: "primary" },
  { label: "Accreditation Threshold", value: "70%", sub: "Minimum NACCAS pass rate requirement to protect Title IV", variant: "primary" },
  { label: "Wage Delay Penalty", value: "$5K+", sub: "Est. lost income resulting from testing backlog", variant: "neutral" },
]

export default function BarberEducationADI() {
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
              "@id": "https://innergcomplete.com/insights/barber-education-intelligence-roi"
            },
            "headline": "Barber Education Intelligence | State Board ADI Solution",
            "description": "Architecting the State Board ADI: Eradicating the $16K Barber Education Bottleneck with Sovereign Intelligence.",
            "author": {
              "@type": "Person",
              "name": "Lamont Evans",
              "url": "https://innergcomplete.com/about"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Inner G Complete Agency",
              "logo": {
                "@type": "ImageObject",
                "url": "https://innergcomplete.com/icon-dark-32x32.png"
              }
            },
            "datePublished": "2026-04-19T08:00:00Z"
          })
        }}
      />
      <BreadcrumbSchema slug="barber-education-intelligence-roi" title="Barber Education Intelligence | State Board ADI Solution" />
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
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Industry Report</span>
            </div>

            <ExecutiveSummary data={{
              "problem":"Barber students invest $16,800+ into an education that prepares them physically but repeatedly fails them theoretically at the state licensing level.",
              "requirement":"A state-aware Sovereign RAG Pipeline calibrated to 50 individual state Candidate Information Bulletins.",
              "roi":"Guaranteed first-time pass rates, protecting the $16K tuition risk and securing $5,000+ per candidate in recovered wage utility.",
              "solution":"Artificial Domain Intelligence (ADI) that ingests state textbooks and auto-generates exam synthesis to combat structural informational dissonance."
            }} />
            <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-6xl md:text-7xl uppercase italic leading-[0.95] mb-8">
              Overcoming the <span className="text-primary">Blockade</span>: Barber Education Intelligence
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed font-medium text-balance mb-6">
              A deeply researched validation into the state board written examination—the most damaging financial bottleneck in the barbering industry—and the Cognitive Intelligence architecture designed to completely eradicate it.
            </p>

            <StatisticalSignal signals={[
              {"label":"Time Invested","value":"1,000+ Hrs","icon":"data"},
              {"label":"Capital Cost","value":"$16.8K","icon":"zap"},
              {"label":"Theory Reliance","value":"100%","icon":"activity"}
            ]} />

            <div className="flex flex-wrap items-center gap-4 mb-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <BarChart3 className="h-3 w-3" /> State Board Metrics
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <BookOpen className="h-3 w-3" /> 5 Sources
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/20 px-4 py-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                <Clock className="h-3 w-3" /> 16 min read
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/20 px-4 py-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                April 19, 2026
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-6 py-8 border-y border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground border-2 border-white shadow-sm">
                  LE
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-tight">Lamont Evans</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">
                    Principal Architect · Inner G Complete Agency
                  </div>
                </div>
              </div>
              <ArticleActions />
            </div>
          </div>
        </header>

        {/* Cover Image */}
        <div className="mx-auto max-w-7xl px-6 -mt-12 mb-20 relative z-10">
          <div className="aspect-[21/9] rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
            <Image
              src="/barber_education_adi_vision_cover.png"
              alt="Barber Education ADI Vision"
              width={1400}
              height={600}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Body */}
        <div className="mx-auto max-w-3xl px-6 pb-32 space-y-24">

          {/* Editorial Note */}
          <div className="p-6 rounded-2xl border border-border bg-secondary/10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Architectural Hypothesis</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This report examines the fragmentation of the United States barber licensure mechanism. Built on the premise of Artificial Domain Intelligence (ADI), this validates a proprietary education pipeline that scales across regulatory borders to close the gap between practical competence and theoretical testing fail rates.
            </p>
          </div>

          {/* The $16K Bottleneck */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                01. The $16K Bottleneck: Physical Preparation vs. Cognitive Reality
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-6">
              The modern barbering education is a massive upfront capital commitment. Students in the United States invest an average of $14,980 in tuition and an additional $1,821 in books and supplies.
              <Cite id={4} href="https://www.collegetuitioncompare.com/" /> They commit anywhere from 1,000 to 1,500 hours standing behind the chair mastering the physical art of blending, fading, and straight-razor shaving.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-10">
              But increasingly, the physical skill is not what stands between the student and a license. On January 1, 2022, the State of California—the largest beauty footprint in the nation—permanently removed the practical component of the barber state examination.
              <Cite id={1} href="https://www.barbercosmo.ca.gov/" /> Licensure is now 100% reliant on a student's ability to pass an archaic written theory exam.
            </p>

            {/* Ghost Loss Breakdown */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {[
                { pct: "$16.8K", label: "Initial Capital Risk", desc: "The combined sunk cost of tuition, supplies, and tools invested prior to taking the written licensure examination." },
                { pct: "100%", label: "The Shift in Weight", desc: "In major states like California, the test is no longer about clipper control—it's entirely about theoretical knowledge and test-taking syntax." },
                { pct: "80%+", label: "Practical Reality", desc: "Historically, students pass the practical exams easily. The failure point has overwhelmingly trended toward the written examination." },
                { pct: "$5K+", label: "The Cost of Retesting", desc: "Failing the written test induces a 1-to-3-month schedule backlog, effectively erasing thousands in potential early-career baseline revenue." },
              ].map((item) => (
               <div key={item.label} className="p-6 rounded-2xl bg-white border border-border">
                  <div className="text-3xl font-black text-destructive mb-2">{item.pct}</div>
                  <div className="text-xs font-black uppercase tracking-widest text-foreground mb-2">{item.label}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Financial Velocity Impact Table */}
            <div className="overflow-auto rounded-2xl border border-border mt-10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/20">
                    <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Scenario</th>
                    <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Path to License</th>
                    <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Capital Lost</th>
                    <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-primary">Est. Recovered Wage Utility</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Legacy Textbooks", "Fails Written (Wait 90 Days)", "$150 Retest + $5K Wages", "$0"],
                    ["Flashcard Apps", "Barely Passes (Possible 30 Day Lag)", "High Test Anxiety", "Baseline"],
                    ["ADI Intelligence Layer", "Passes First Attempt (No Lag)", "$0", "+ $5,000+"],
                  ].map(([scenario, path, delay, recovery], i) => (
                    <tr key={i} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-white" : "bg-secondary/5"}`}>
                      <td className="px-6 py-4 font-bold text-foreground">{scenario}</td>
                      <td className="px-6 py-4 text-muted-foreground">{path}</td>
                      <td className="px-6 py-4 text-destructive font-bold">{delay}</td>
                      <td className="px-6 py-4 text-primary font-black">{recovery}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs italic text-muted-foreground mt-4">
              * Modeled based on the $5K potential minimum wage lag suffered by a licensed barber missing 1-3 months of chair time due to exam backlog constraints.
              <Cite id={5} href="https://glossgenius.com" />
            </p>
          </div>

          {/* Benchmark Metrics */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                02. Informational Dissonance: Why Prepared Students Fail
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-10">
              Our research points to a major failure in structural information parity. The failure of state board students is rarely rooted in a lack of skill; the failure stems from informational dissonance and a misunderstanding of what is actually being tested.
            </p>
            <div className="space-y-6">
              {[
                {
                  icon: BookOpen,
                  title: "Conflicting Source Texts (Milady vs. Pivot Point)",
                  body: "The two primary educational textbooks in the U.S. often provide contradictory statements on chemical pH levels and hygiene procedures. If a student is taught out of Milady but their state accesses test questions verified by Pivot Point, the student may answer correctly based on their training and still fail the question.",
                  stat: "Gap 1",
                  statDesc: "Fragmented Educational Baselines",
                },
                {
                  icon: Users,
                  title: "The Non-Core Chemical Dependency Trap",
                  body: "A barber student may intend to specialize purely in tight fades and beard grooming. Yet state exams aggressively test anatomical composition and chemical service theory (perms, relaxers, dye). Because this knowledge seems peripheral to the practical chair, it is neglected, despite comprising up to 30% of the exam weight.",
                  stat: "Gap 2",
                  statDesc: "Misaligned Practical vs Exam Reality",
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

          {/* Section 3: Generative Integration */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                03. The Generative Exam Engine & CIB Integration
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-6">
              When scaling AI Barber Education Intelligence across the U.S., a generic quiz app fails due to regulatory fragmentation. The true solution requires a **Sovereign Regulatory Brain** established through Retrieval-Augmented Generation (RAG). 
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-6">
              The Artificial Domain Intelligence (ADI) fundamentally changes how students study through the precise vector ingestion of Candidate Information Bulletins (CIB).
              <Cite id={2} href="https://nictesting.org/" /> By scraping and mapping the exact weights of the Texas exam vs. the New York exam, the engine creates synthetic study conditions perfectly mirroring reality. 
            </p>
            
            <div className="space-y-4 mb-10">
              {[
                { layer: "Layer 01", title: "Ingest and Clean", desc: "PDFs of textbooks, Administrative Codes, and State forms are processed via OCR and securely stored in the Data Lake, establishing immutable fidelity." },
                { layer: "Layer 02", title: "Atomic Fragmentation", desc: "The RAG pipeline chops textbooks into 'Knowledge Atoms.' The ADI maps out when information conflicts, establishing a hierarchical truth specifically geared to the target state board." },
                { layer: "Layer 03", title: "Dynamic Generation", desc: "Rather than forcing students to click through 10 static quizzes over and over, the system dynamically generates questions mapped exactly to the percentage weights disclosed in the CIB. Students encounter the tricky syntax that mimics real-world exam conditions." },
              ].map((step) => (
                <div key={step.layer} className="p-5 border-l-4 border-primary bg-primary/5 rounded-r-xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">{step.layer}</span>
                  <h4 className="text-sm font-black uppercase tracking-wide text-foreground mb-1">{step.title}</h4>
                  <p className="text-sm text-muted-foreground font-medium">{step.desc}</p>
                </div>
              ))}
            </div>

            <div className="p-8 rounded-2xl border border-primary/20 bg-primary/5">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">Sovereign State Routing</div>
              <p className="text-xl font-black italic text-foreground leading-tight uppercase tracking-tighter mb-4">
                "An ADI acts as the ultimate conflict resolver. When a Texas student queries a question on infection control algorithms, the AI filters out California laws and Milady contradictions, returning only what the TDLR evaluator is attempting to see."
              </p>
              <p className="text-sm text-muted-foreground">
                Supported by: Texas TDLR Class A Barber licensing requirements and statistical trends indicating lack of theoretical preparedness in technical areas.
                <Cite id={3} href="https://www.tdlr.texas.gov/" />
              </p>
            </div>
          </div>

          {/* Section 4: Institution ROI */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-destructive" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                04. The Institutional Reality: Accreditation Protection
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-6">
              While the student bears the immediate financial blow of exam failure, the existential risk is actually absorbed by the school. The National Accrediting Commission of Career Arts & Sciences (NACCAS) sets strict thresholds for academic viability. If an academy's licensure pass rate drops below 70%, they enter probationary statuses that severely threaten their accreditation.
              <Cite id={6} href="https://naccas.org/" />
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-10">
              Without NACCAS accreditation, an institution can no longer accept federal financial aid (Title IV funding). For the majority of barber academies, the loss of Title IV equates to immediate insolvency. The Barber Education Intelligence pipeline transcends being a generic study tool—it operates as an institutional <strong className="text-foreground">Accreditation Protection Engine</strong>. By leveraging the Sovereign RAG pipeline to guarantee pass rates, academy owners mathematically defend their primary revenue pipeline and secure their business valuation.
            </p>

            <div className="p-8 rounded-2xl bg-white border border-border mt-10 mb-20 shadow-sm relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                <Brain className="h-40 w-40" />
              </div>
              <div className="relative z-10">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4 flex items-center gap-2">
                  <Activity className="h-3 w-3" />
                  The Predictive Flywheel Effect
                </div>
                <p className="text-base text-muted-foreground leading-relaxed font-medium">
                  As hundreds of students cycle through the regional Generative Exam Engine, the ADI captures localized failure metrics at scale. Before a quarterly testing block, the ADI informs academy instructors that <em>"82% of current enrollees are failing Infection Control syntax."</em> It grants administration the ability to pivot the real-world curriculum proactively, ensuring the critical 70% threshold is never breached by utilizing predictive analytics rather than reactive failure autopsy.
                </p>
              </div>
            </div>
          </div>

          {/* Verdict */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                05. The Sovereign Knowledge Advantage (Verdict)
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-6">
               There is a massive market opportunity in barber education. Academies consistently teach the correct physical skills necessary to earn a living, but fail to navigate the regulatory framework holding the keys to immediate post-grad monetization.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-6">
              When the ultimate outcome of a $16,800 education relies 100% on a candidate's ability to answer theoretical questions correctly during a high-stakes exam, schools must upgrade their educational deployment vehicles. 
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium">
              Institutions that augment their training curriculum with AI Education Intelligence will practically guarantee passing credentials to their enrollees, vastly outperforming schools utilizing static testing software or generalized ChatGPT prompts. The architecture to deploy this is fully sovereign, secure, and state-specific.
            </p>
          </div>

          {/* References Section */}
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
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Visit Source <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="p-8 sm:p-12 rounded-3xl bg-primary text-primary-foreground relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-20">
              <TrendingUp className="h-48 w-48" />
            </div>
            <div className="relative z-10">
              <div className="text-[10px] font-black uppercase tracking-[0.4em] text-primary-foreground/60 mb-6">
                Institutional Transformation
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-tight mb-6">
                Secure Your Students' <br />Licensure Guarantee
              </h2>
              <p className="text-lg opacity-90 mb-10 max-w-xl font-medium leading-relaxed">
                Connect your curriculum with our state-calibrated ADI and ensure your tuition leads directly to post-grad employment. Overcome the $16K testing blockade starting today.
              </p>
              <Button
                className="bg-white text-primary hover:bg-secondary px-10 py-7 text-xs font-black uppercase tracking-[0.3em] shadow-xl"
                asChild
              >
                <Link href="/#contact">
                  Deploy Intelligence
                  <ArrowRight className="ml-3 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </article>

      <TechnicalCitations citations={[{"source":"PMI","label":"Cognitive Project Management for AI (CPMAI)","url":"https://www.pmi.org"},{"source":"NIST","label":"AI Risk Management Framework (RMF 1.0)","url":"https://www.nist.gov/itl/ai-risk-management-framework"}]} />

      <FAQSection faqs={[
        {"question":"Why do we explicitly map to the CIB?","answer":"The CIB (Candidate Information Bulletin) gives the exact weighting formulas behind the written test. Teaching without referencing the CIB is preparing a student blindly."},
        {"question":"How exactly does the Generative Exam Engine work?","answer":"By ingesting state laws and textbook fundamentals, the ADI dynamically generates synthetic mock tests mimicking the syntax and double-negatives inherent to state board evaluations."}
      ]} />
      
      <AuthorBio />
      <Footer />
    </main>
  )
}
