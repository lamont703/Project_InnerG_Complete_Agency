import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { ArrowLeft, Share2, Printer, TrendingUp, BarChart3, Users, DollarSign, Activity } from "lucide-react"
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

export default function AutonomousConciergeROI() {
  return (
    <main className="min-h-screen bg-background light text-foreground flex flex-col pt-20">
      <Navbar />

      <article className="relative flex-1">
        {/* Progress Bar (Visual only) */}
        <div className="fixed top-20 left-0 w-full h-1 bg-secondary z-50">
           <div className="h-full bg-primary w-full" />
        </div>

        {/* Hero Section */}
        <header className="relative pt-16 pb-12 sm:pt-24 sm:pb-20 border-b border-border/50">
          <GlowOrb className="top-1/4 -left-32 h-96 w-96 bg-primary/10 animate-float" />
          
          <div className="mx-auto max-w-4xl px-6">
            <div className="flex items-center gap-3 mb-8">
              <Link href="/insights" className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">
                <ArrowLeft className="h-4 w-4" />
                Back to Insights
              </Link>
              <span className="text-border">|</span>
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Industry Report</span>
            </div>

            <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-6xl md:text-7xl uppercase italic leading-[0.95] mb-8">
              The Autonomous <span className="text-primary">Concierge</span>: A 2026 ROI Analysis
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed font-medium text-balance mb-12">
              Quantifying the economic impact of shifting from manual front-desk operations to institutional-grade automated workflows in luxury clinical environments.
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
                src="/autonomous_concierge_roi_cover_1776043024026.png" 
                alt="ROI visualization for clinical AI automation" 
                width={1200} 
                height={600}
                className="w-full h-full object-cover"
              />
           </div>
        </div>

        {/* Body Content */}
        <div className="mx-auto max-w-3xl px-6 pb-32 prose prose-lg prose-primary">
          <p className="lead font-medium text-xl text-foreground">
            For growing wellness groups and clinical franchises, the "Front-Desk Bottleneck" is the single greatest inhibitor of scale. In this report, we analyze the measurable ROI of deploying an **Autonomous Concierge** layer.
          </p>

          <h2 className="text-3xl font-black uppercase italic mt-16 mb-8 flex items-center gap-3">
             <BarChart3 className="h-8 w-8 text-primary" />
             01. Throughput Efficiency
          </h2>
          <p>
            The average manual booking cycle (call response, calendar check, intake confirmation) takes <strong>4.2 minutes</strong> per client. Our benchmarking shows that institutional AI agents reduce this same cycle to <strong>6.5 seconds</strong>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-10">
             <div className="p-6 rounded-2xl bg-secondary/10 border border-border text-center">
                <div className="text-[10px] font-black uppercase text-muted-foreground mb-2">Manual Booking</div>
                <div className="text-3xl font-black text-foreground">252s</div>
             </div>
             <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20 text-center">
                <div className="text-[10px] font-black uppercase text-primary mb-2">AI Concierge</div>
                <div className="text-3xl font-black text-primary">6s</div>
             </div>
          </div>
          <p className="text-sm italic text-muted-foreground">
            *Result: A 97.6% reduction in operational friction per booking, allowing clinics to handle 10x the lead volume without increasing FTE overhead.
          </p>

          <h2 className="text-3xl font-black uppercase italic mt-20 mb-8 flex items-center gap-3">
             <TrendingUp className="h-8 w-8 text-primary" />
             02. Revenue Recovery (No-Show Mitigation)
          </h2>
          <p>
            No-shows represent the "Ghost Loss" of the med-spa industry, often accounting for 12% to 18% of gross potential revenue. 
          </p>
          <p>
            By deploying <strong>Intelligent Persistence</strong>—AI agents that analyze client behavior to send personalized, high-conversion confirmation triggers—clinics have seen no-show rates drop by an average of <strong>42% within the first 90 days</strong>.
          </p>

          <h2 className="text-3xl font-black uppercase italic mt-20 mb-8 flex items-center gap-3">
             <Activity className="h-8 w-8 text-primary" />
             03. CPA vs. LTV Optimization
          </h2>
          <p>
            The true power of the Autonomous Concierge lies in its ability to manage the two most critical metrics of enterprise growth:
          </p>
          
          <div className="space-y-8 mt-12">
             <div className="flex gap-6 p-8 rounded-2xl glass-panel border border-border/50">
                <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                   <DollarSign className="h-6 w-6 text-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase mt-0">Lowering CPA</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Automating the "5-Minute Lead Response" ensures every social media or web inquiry is captured instantly. Instant responses increase conversion rates by up to 391% compared to those answered after 30 minutes.
                  </p>
                </div>
             </div>
             <div className="flex gap-6 p-8 rounded-2xl glass-panel border border-border/50">
                <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                   <Users className="h-6 w-6 text-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase mt-0">Increasing LTV</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    AI doesn't just book; it predicts. By analyzing the "Regrowth Cycle" data (from our 15 Data Sources), the concierge triggers re-booking invites exactly when the client requires their next service, maximizing retention.
                  </p>
                </div>
             </div>
          </div>

          <h2 className="text-3xl font-black uppercase italic mt-20 mb-8">The Verdict</h2>
          <p>
            Infrastructure-grade automation is no longer a luxury for wellness brands—it is the prerequisite for institutional scale. The Autonomous Concierge delivers a measurable <strong>Feasibility Premium</strong> by converting operational chaos into predictable revenue.
          </p>

          <div className="mt-24 p-12 rounded-3xl bg-primary text-primary-foreground relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-20">
                <TrendingUp className="h-32 w-32" />
             </div>
             <h2 className="text-3xl font-black uppercase italic mb-6 leading-tight">Quantify Your <br />Efficiency Gaps</h2>
             <p className="text-lg opacity-90 mb-10 max-w-xl font-medium">
                Our Viability Assessment includes a full economic modeling of your specific clinical throughput. 
             </p>
             <Button className="bg-white text-primary hover:bg-secondary px-10 py-7 text-sm font-black uppercase tracking-widest shadow-xl" asChild>
                <Link href="/#contact">Download ROI Framework</Link>
             </Button>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  )
}
