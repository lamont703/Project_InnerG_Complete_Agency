"use client"

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
  Share2,
  Printer,
  Brain,
  Layers,
  Cpu,
  Network,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
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

const pillars = [
  {
    icon: Layers,
    title: "01. The Data Accumulation Phase",
    body: "Every enterprise in this industry is currently sitting on fragmented, high-value data: client treatment records, inventory velocity, no-show patterns, and behavioral signals. The company that unifies this 'Cognitive Feedstock' first—across all 15+ source categories—controls the training corpus for the dominant ADI. You cannot build the model without the data; you cannot own the data without the relationships. The race begins in the CRM, not the cloud.",
  },
  {
    icon: Cpu,
    title: "02. From Generic to Domain-Specific",
    body: "General-purpose models (GPT, Claude, Gemini) are powerful generalists. They do not know the chemical behavior of a Brazilian Blowout at 60% humidity, nor can they predict the specific re-booking cadence of a Manhattan medical-aesthetic client. A true Aesthetic ADI is fine-tuned on domain-native data, capable of returning deterministic clinical and operational verdicts—not probabilistic guesses. The delta between a 'generic answer' and a 'domain-certain answer' is the entire value proposition.",
  },
  {
    icon: Network,
    title: "03. The Platform Inversion",
    body: "Today, Mindbody and Zenoti are the 'Operating Systems' of the salon. In the ADI era, this inverts. The intelligence layer becomes the OS—and every booking app, smart mirror, or wearable becomes a peripheral sensor that feeds data into, and receives directives from, the central brain. The enterprise that owns the ADI owns the standard. They no longer pay a tax to the platform; they collect one.",
  },
  {
    icon: ShieldCheck,
    title: "04. Sovereignty Over Compliance",
    body: "A proprietary ADI cannot be hosted on a generic public cloud without losing its sovereign edge. The compliance architecture must be built from the ground up—HIPAA-ready, audit-logged, and PHI-isolated. This is not a constraint; it is a competitive barrier. An enterprise whose intelligence model operates under a certified compliance framework has a legal and reputational moat that no competitor acquiring a 'third-party AI tool' can replicate.",
  },
  {
    icon: TrendingUp,
    title: "05. The Compound Intelligence Effect",
    body: "Unlike traditional software, an ADI improves autonomously. Every client interaction—every booking, every skin assessment, every inventory replenishment—becomes a new training signal that sharpens the model's precision. The enterprise with 10,000 client interactions per day produces a model that is measurably smarter than a competitor with 1,000. Market dominance becomes a self-reinforcing loop. This is why the time to architect is now, not when the market has already consolidated.",
  },
]

export default function SovereignIntelligenceLayer() {
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
              "@id": "https://innergcomplete.com/insights/the-sovereign-intelligence-layer"
            },
            "headline": "The Sovereign Intelligence Layer | Core Vision",
            "description": "Why the enterprise that builds a proprietary Artificial Domain Intelligence creates an unassailable competitive moat.",
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
            "datePublished": "2026-04-13T08:00:00Z"
          })
        }}
      />
      <BreadcrumbSchema slug="the-sovereign-intelligence-layer" title="The Sovereign Intelligence Layer | Core Vision" />
      <Navbar />

      <article className="relative flex-1">
        {/* Reading progress bar (visual) */}
        <div className="fixed top-20 left-0 w-full h-1 bg-secondary z-50">
          <div className="h-full bg-primary w-4/5" />
        </div>

        {/* Hero */}
        <header className="relative pt-16 pb-12 sm:pt-24 sm:pb-20 border-b border-border/50 overflow-hidden">
          <GlowOrb className="top-1/4 -right-32 h-96 w-96 bg-primary/10 animate-float" />
          <GlowOrb className="bottom-0 left-1/3 h-64 w-64 bg-accent/5 animate-float-delayed" />

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
              <span className="text-xs font-bold text-primary uppercase tracking-widest">
                Strategic View
              </span>
            </div>

            <ExecutiveSummary data={{"problem":"Institutional intelligence trapped inside third-party 'Black Box' platform algorithms.","requirement":"Model weights, parameters, and behavioral fingerprints owned entirely by the enterprise.","roi":"Long-term institutional longevity and the creation of a portable intelligence asset.","solution":"Sovereign Proprietary ADI architecture ensuring platform-agnostic intelligence."}} />
            <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-6xl md:text-7xl uppercase italic leading-[0.95] mb-8">
              The Sovereign{" "}
              <span className="text-primary">Intelligence</span> Layer
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed font-medium text-balance mb-6">
              Why the next decade of wellness and grooming will be defined not by which brand has the best stylists—but by which enterprise owns the most powerful <strong>Artificial Domain Intelligence.</strong>
            </p>
            <p className="text-sm font-bold text-primary uppercase tracking-widest">
              The race has already started. Most brands don't know they're in it.
            </p>

            <div className="flex flex-wrap items-center gap-6 py-8 border-y border-border/50 mt-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-foreground">
                  LE
                </div>
                <div>
                  <div className="text-xs font-black uppercase">Lamont Evans</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">
                    Principal Architect · InnerG Complete Agency
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground font-bold uppercase tracking-widest ml-auto">
                <span>April 13, 2026</span>
                <span>·</span>
                <span>14 min read</span>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="icon" className="rounded-full h-9 w-9 border-border">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full h-9 w-9 border-border">
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Cover Image */}
        <div className="mx-auto max-w-7xl px-6 -mt-12 mb-20 relative z-10">
          <div className="aspect-[21/9] rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
            <Image
              src="/adi_sovereign_layer_cover_1776108008232.png"
              alt="Artificial Domain Intelligence sovereign layer architecture"
              width={1400}
              height={600}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Article Body */}
        <div className="mx-auto max-w-3xl px-6 pb-32">
          {/* Lead */}
          <div className="mb-16 p-8 rounded-2xl bg-primary/5 border-l-4 border-primary">
            <p className="text-xl font-medium text-foreground leading-relaxed">
              There is a pattern that repeats across every major industry disruption: one company quietly builds the foundational layer while everyone else competes on the surface. In computing, it was the OS. In mobile, it was the app store. In wellness and grooming, the foundational layer is the <strong>Artificial Domain Intelligence (ADI)</strong>—and the window to claim it is closing.
            </p>
          </div>

          <StatisticalSignal signals={[{"label":"Parameter Sovereignty","value":"100%","icon":"shield"},{"label":"Operational Uptime","value":"99.99%","icon":"zap"},{"label":"Institutional Learning","value":"Persistent","icon":"data"}]} />

          {/* Section: What is ADI */}
          <div className="mb-16">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                What is an Artificial Domain Intelligence?
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed mb-6 font-medium">
              An ADI is not a chatbot. It is not a scheduling plugin. It is a{" "}
              <strong className="text-foreground">
                proprietary, fine-tuned intelligence model
              </strong>{" "}
              trained exclusively on the high-fidelity data of a specific industry—in this case, luxury wellness and aesthetic medicine.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium">
              Unlike generic AI models that operate on broad probabilistic reasoning, an ADI is capable of <em>deterministic domain verdicts</em>: predicting exact client re-booking windows, diagnosing formulation failures before they occur, and allocating clinical resources with institutional precision. It is the difference between a general practitioner and a board-certified specialist with 20 years of domain-specific case history.
            </p>
          </div>

          {/* Five Pillars */}
          <div className="mb-20">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground mb-12">
              The Five Pillars of{" "}
              <span className="text-primary">ADI Architecture</span>
            </h2>
            <div className="space-y-8">
              {pillars.map((pillar) => (
                <div
                  key={pillar.title}
                  className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-6 sm:p-8 rounded-2xl border border-border/50 bg-white hover:border-primary/30 hover:shadow-lg transition-all duration-300 group"
                >
                  <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    <pillar.icon className="h-6 w-6 text-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-widest text-foreground mb-3">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                      {pillar.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strategic Verdict */}
          <div className="mb-20">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground mb-8">
              The Strategic Verdict
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-8">
              The enterprises that will lead this industry in 2030 are already making a critical decision today, often without realizing it: <em>Are they building toward an ADI, or are they becoming dependent on someone else's?</em>
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-8">
              There are two paths. The first is the <strong className="text-foreground">SaaS Dependency</strong> path: continue stitching together third-party tools (Zenoti, Mindbody, generic AI plugins) and remain at the mercy of vendor roadmaps, pricing changes, and data-portability restrictions. The second is the <strong className="text-foreground">Sovereign Intelligence</strong> path: begin the structured, phased architecture of a proprietary domain model that compounds in value with every client interaction.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-10">
              <div className="p-6 rounded-2xl bg-secondary/20 border border-border">
                <div className="text-[10px] font-black uppercase text-muted-foreground mb-3 tracking-widest">
                  Path A: SaaS Dependency
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><span className="text-destructive mt-0.5">✕</span> Data owned by the vendor</li>
                  <li className="flex items-start gap-2"><span className="text-destructive mt-0.5">✕</span> Model improves for all competitors equally</li>
                  <li className="flex items-start gap-2"><span className="text-destructive mt-0.5">✕</span> Zero IP accumulation</li>
                  <li className="flex items-start gap-2"><span className="text-destructive mt-0.5">✕</span> Priced out at scale</li>
                </ul>
              </div>
              <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20">
                <div className="text-[10px] font-black uppercase text-primary mb-3 tracking-widest">
                  Path B: Sovereign Intelligence
                </div>
                <ul className="space-y-2 text-sm text-foreground">
                  <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Data is a proprietary enterprise asset</li>
                  <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Model compounds exclusively for your brand</li>
                  <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> IP ownership drives enterprise valuation</li>
                  <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Others pay you to access the standard</li>
                </ul>
              </div>
            </div>

            <blockquote className="border-l-4 border-primary pl-8 py-2 my-10">
              <p className="text-xl font-black italic text-foreground uppercase tracking-tighter leading-tight">
                "The enterprise that builds the ADI doesn't just win market share. It becomes the market standard that everyone else licenses."
              </p>
            </blockquote>

            <p className="text-lg text-muted-foreground leading-relaxed font-medium">
              At InnerG Complete Agency, our singular architectural mission is to build this sovereign intelligence layer for a select cohort of enterprises in the aesthetic and wellness space. We are not building features. We are building the foundational cognitive infrastructure that the industry will run on.
            </p>
          </div>

          {/* CTA */}
          <div className="p-8 sm:p-12 rounded-3xl bg-foreground text-background relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Brain className="h-48 w-48" />
            </div>
            <div className="relative z-10">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] text-primary mb-4 sm:mb-6">
                Architecture Assessment
              </div>
              <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter leading-tight mb-4 sm:mb-6">
                Is Your Enterprise on the{" "}
                <span className="text-primary">Sovereign Path?</span>
              </h2>
              <p className="text-base sm:text-lg opacity-70 mb-8 sm:mb-10 max-w-xl font-medium leading-relaxed">
                Our Viability Assessment determines whether your current data architecture and operational infrastructure can support the foundation of a proprietary ADI—and what it would take to get there.
              </p>
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto px-6 sm:px-10 py-6 sm:py-7 text-xs font-black uppercase tracking-[0.15em] sm:tracking-[0.3em] shadow-xl shadow-primary/20"
                asChild
              >
                <Link href="/#contact">
                  <span className="sm:hidden">Request Assessment</span>
                  <span className="hidden sm:inline">Request ADI Architecture Review</span>
                  <ArrowRight className="ml-2 sm:ml-3 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </article>

      <TechnicalCitations citations={[{"source":"PMI","label":"Cognitive Project Management for AI (CPMAI)","url":"https://www.pmi.org"},{"source":"NIST","label":"AI Risk Management Framework (RMF 1.0)","url":"https://www.nist.gov/itl/ai-risk-management-framework"},{"source":"ISO/IEC","label":"42001:2023 AI Management Systems","url":"https://www.iso.org/standard/81230.html"},{"source":"Google Research","label":"Monk Skin Tone Scale (MST) Standards","url":"https://skintone.google"}]} />

          <FAQSection faqs={[{"question":"What defines a 'Sovereign' AI layer?","answer":"Sovereignty is defined by data ownership, model portability, and the ability to operate across different booking platforms without losing institutional intelligence."}]} />
      <AuthorBio />
      <Footer />
    </main>
  )
}
