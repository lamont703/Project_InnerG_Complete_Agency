import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { ArrowLeft, Share2, Printer, Target, ShieldX, Briefcase, TrendingUp, CheckCircle2 } from "lucide-react"
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

export default function FeasibilityPremiumArticle() {
  return (
    <main className="min-h-screen bg-background light text-foreground flex flex-col pt-20">
      <Navbar />

      <article className="relative flex-1">
        {/* Progress Bar (Visual only) */}
        <div className="fixed top-20 left-0 w-full h-1 bg-secondary z-50">
           <div className="h-full bg-primary w-2/3" />
        </div>

        {/* Hero Section */}
        <header className="relative pt-16 pb-12 sm:pt-24 sm:pb-20 border-b border-border/50">
          <GlowOrb className="top-1/4 -right-32 h-96 w-96 bg-primary/10 animate-float" />
          
          <div className="mx-auto max-w-4xl px-6">
            <div className="flex items-center gap-3 mb-8">
              <Link href="/insights" className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">
                <ArrowLeft className="h-4 w-4" />
                Back to Insights
              </Link>
              <span className="text-border">|</span>
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Strategic View</span>
            </div>

            <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-6xl md:text-7xl uppercase italic leading-[0.95] mb-8">
              The Feasibility <span className="text-primary">Premium</span>: Starting with "No"
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed font-medium text-balance mb-12">
              In the AI gold rush, the most valuable move a CEO can make isn't launching a new product—it's performing the institutional audit that proves why a project *shouldn't* be built.
            </p>

            <div className="flex flex-wrap items-center gap-6 py-8 border-y border-border/50">
               <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-foreground">LE</div>
                  <div>
                    <div className="text-xs font-black uppercase">Lamont Evans</div>
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">Principal Architect</div>
                  </div>
               </div>
               <div className="ml-auto flex gap-4">
                  <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-border"><Share2 className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-border"><Printer className="h-4 w-4" /></Button>
               </div>
            </div>
          </div>
        </header>

        {/* Featured Image */}
        <div className="mx-auto max-w-7xl px-6 -mt-12 mb-20 relative z-10">
           <div className="aspect-[21/9] rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
              <Image 
                src="/the_feasibility_premium_cover_1776042291644.png" 
                alt="Strategic vetting protocols for enterprise AI" 
                width={1200} 
                height={600}
                className="w-full h-full object-cover"
              />
           </div>
        </div>

        {/* Body Content */}
        <div className="mx-auto max-w-3xl px-6 pb-32 prose prose-lg prose-primary">
          <p className="lead font-medium text-xl text-foreground">
            We are currently witnessing the "AI FOMO" era of wellness tech. Companies are rushing to deploy generative chat-bots and predictive diagnostics, often without a clear understanding of the architectural risks or economic ROI.
          </p>

          <p className="mt-8">
            At InnerG Complete Agency, we believe the highest-value service we provide isn't code—it's **Certainty**. And true certainty often begins with the courage to issue a "No" verdict during a technical audit.
          </p>

          <h2 className="text-3xl font-black uppercase italic mt-16 mb-8 flex items-center gap-3">
            <ShieldX className="h-8 w-8 text-primary" />
            The High Cost of "Yes"
          </h2>
          <p>
            An un-vetted AI project is a structural liability. When an enterprise says "yes" to a project that lacks <strong>Technical Feasibility</strong>, they aren't just wasting capital—they are building technical debt that can destabilize their entire infrastructure for years.
          </p>
          <blockquote>
            "The most successful AI projects in 2026 aren't the ones that launched the fastest; they are the ones that were audited the most ruthlessly." 
          </blockquote>

          <h2 className="text-3xl font-black uppercase italic mt-20 mb-8 flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            The Three Pillars of the Verdict
          </h2>
          <p>
            When we conduct a <strong>Viability & Feasibility (V&F) Assessment</strong>, we look through three non-negotiable lenses:
          </p>
          
          <div className="space-y-6 mt-12 mb-12">
            <div className="p-8 rounded-2xl bg-secondary/10 border border-border">
               <h3 className="text-xl font-black uppercase mt-0">01. Technical Feasibility</h3>
               <p className="text-muted-foreground text-sm">Can it actually be built with the current data state? We audit the "Cognitive Feedstock"—the 15+ data sources required to make the model perform at institutional-grade accuracy.</p>
            </div>
            <div className="p-8 rounded-2xl bg-secondary/10 border border-border">
               <h3 className="text-xl font-black uppercase mt-0">02. Economic Viability</h3>
               <p className="text-muted-foreground text-sm">Will it actually make money? We model the TCO (Total Cost of Ownership) versus the predicted LTV boost. If the model costs more to maintain than the revenue it recovers, the verdict is No.</p>
            </div>
            <div className="p-8 rounded-2xl bg-secondary/10 border border-border">
               <h3 className="text-xl font-black uppercase mt-0">03. Operational Sincerity</h3>
               <p className="text-muted-foreground text-sm">Will the team actually use it? AI that disrupts the "human touch" of a stylist or a MedSpa nurse is a failure. We audit the human-in-the-loop workflow before writing a line of code.</p>
            </div>
          </div>

          <h2 className="text-3xl font-black uppercase italic mt-20 mb-8 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            Winning the "Feasibility Premium"
          </h2>
          <p>
            The **Feasibility Premium** is the measurable advantage gained by companies that pause to audit. These enterprises experience 10x higher success rates because their projects are built on a foundation of reality, not hype.
          </p>
          <p>
            By the time an InnerG project moves to the "Build" phase, its success is already a statistical certainty. We've already killed the weak ideas, identified the data gaps, and mitigated the compliance risks.
          </p>

          <div className="mt-24 p-12 rounded-3xl bg-secondary/20 border border-border relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-10">
                <CheckCircle2 className="h-32 w-32" />
             </div>
             <h2 className="text-3xl font-bold mb-6">Start with an Audit. Finish with Authority.</h2>
             <p className="text-lg text-muted-foreground mb-10 max-w-xl font-medium">
                Don't build on hope. Let us conduct a ruthless V&F audit of your project concept today.
             </p>
             <Button className="bg-primary text-primary-foreground hover:bg-primary/90 px-10 py-7 text-sm font-black uppercase tracking-widest shadow-xl" asChild>
                <Link href="/#contact">Request V&F Audit</Link>
             </Button>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  )
}
