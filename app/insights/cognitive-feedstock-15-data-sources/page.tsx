import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { ArrowLeft, Share2, Printer, Database, UserCheck, Zap, Globe, ShieldCheck, Microscope } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"

export default function DataSourcesBrief() {
  return (
    <main className="min-h-screen bg-background light text-foreground flex flex-col pt-20">
      <Navbar />

      <article className="relative flex-1">
        {/* Progress Bar (Visual only) */}
        <div className="fixed top-20 left-0 w-full h-1 bg-secondary z-50">
           <div className="h-full bg-primary w-1/3" />
        </div>

        {/* Hero Section */}
        <header className="relative pt-16 pb-12 sm:pt-24 sm:pb-20 border-b border-border/50">
          <div className="mx-auto max-w-4xl px-6">
            <div className="flex items-center gap-3 mb-8">
              <Link href="/insights" className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">
                <ArrowLeft className="h-4 w-4" />
                Back to Insights
              </Link>
              <span className="text-border">|</span>
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Technical Brief</span>
            </div>

            <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-6xl md:text-7xl uppercase italic leading-[0.95] mb-8">
              Cognitive Feedstock: <span className="text-primary">15 Data Sources</span> for Aesthetic AI
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed font-medium text-balance mb-12">
              To architect and deploy an AI project in the grooming and wellness industry, companies must move beyond simple booking lists and tap into high-fidelity data that captures the "human" element of the service.
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
                src="/cognitive_feedstock_brief_cover_1776041859371.png" 
                alt="Neural mapping for aesthetic intelligence" 
                width={1200} 
                height={600}
                className="w-full h-full object-cover"
              />
           </div>
        </div>

        {/* Body Content */}
        <div className="mx-auto max-w-3xl px-6 pb-32 prose prose-lg prose-primary">
          <p className="lead font-medium text-xl text-foreground">
            The following 15 data sources are critical for training models that personalize client journeys, optimize operations, and predict industry trends.
          </p>

          <h2 className="text-3xl font-black uppercase italic mt-16 mb-8 flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            01. Core Operational Data
          </h2>
          <div className="space-y-8">
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-primary">
              <h3 className="text-xl font-bold mt-0">Appointment & Scheduling History</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Found in platforms like <strong>Mindbody</strong> and <strong>Zenoti</strong>, this data helps AI predict peak hours and "no-show" probabilities, enabling dynamic staffing optimizations.
              </p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-primary">
              <h3 className="text-xl font-bold mt-0">Client Treatment & Service Records</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Historical logs of past haircuts, colors, or facials that allow AI to perform predictive suggestion of the next logical service based on regrowth cycles and style evolution.
              </p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-primary">
              <h3 className="text-xl font-bold mt-0">Real-Time "Back-Bar" Inventory</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Data from <strong>Square Appointments</strong> or <strong>Meevo</strong> tracks usage of professional products (like dyes or massage oils) to trigger automated reordering and cost-per-service audits.
              </p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-primary">
              <h3 className="text-xl font-bold mt-0">Employee Performance & Productivity</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Metrics on stylist speed, upsell rates, and client retention used to optimize shift scheduling and performance-based compensation via tools like <strong>Planday</strong>.
              </p>
            </div>
          </div>

          <h2 className="text-3xl font-black uppercase italic mt-20 mb-8 flex items-center gap-3">
            <UserCheck className="h-8 w-8 text-primary" />
            02. Personalized Experience Data
          </h2>
          <div className="space-y-8">
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-primary">
              <h3 className="text-xl font-bold mt-0">Digital Consultation Forms</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Structured data from pre-service intake regarding allergies, skin types, or aesthetic goals allows models to tailor product recommendations and service intensities.
              </p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-primary">
              <h3 className="text-xl font-bold mt-0">High-Resolution Visual Assets</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                "Before and after" photos or scalp/skin scans from devices like <strong>Portrait</strong> are used for Computer Vision diagnostics and quantitative result tracking.
              </p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-primary">
               <h3 className="text-xl font-bold mt-0">Personalized Technical Formulas</h3>
               <p className="text-muted-foreground text-sm leading-relaxed">
                 Specific chemical notes, such as custom hair color ratios or laser intensity settings, used as foundational data for ensuring global service consistency across franchises.
               </p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-primary">
               <h3 className="text-xl font-bold mt-0">Client Preference & Feedback Profiles</h3>
               <p className="text-muted-foreground text-sm leading-relaxed">
                 Sentiment data from post-service reviews and qualitative preference tags (e.g., "prefers quiet environment") to train personalization agents.
               </p>
            </div>
          </div>

          <h2 className="text-3xl font-black uppercase italic mt-20 mb-8 flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" />
            03. Marketing & Interaction Data
          </h2>
          <div className="space-y-8">
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-primary">
              <h3 className="text-xl font-bold mt-0">CRM & Engagement Analytics</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Engagement metrics from platforms like <strong>HubSpot</strong> to refine automated marketing flows and predict client churn based on interaction decay.
              </p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-primary">
              <h3 className="text-xl font-bold mt-0">Conversation & Voice Logs</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Transcripts from AI-powered front desks that analyze common customer friction points, booking obstacles, and sentiment trends in real-time.
              </p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-primary">
              <h3 className="text-xl font-bold mt-0">Loyalty & Membership Transactions</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Data on recurring revenue streams and member behavior to build predictive models for high-value client retention.
              </p>
            </div>
          </div>

          <h2 className="text-3xl font-black uppercase italic mt-20 mb-8 flex items-center gap-3">
            <Globe className="h-8 w-8 text-primary" />
            04. External & Market Intelligence
          </h2>
          <div className="space-y-8">
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-primary">
              <h3 className="text-xl font-bold mt-0">Ingredient & Product Metadata</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Extensive databases from sources like <strong>Gravel AI</strong> or <strong>Kaggle</strong> that map chemical ingredients to specific skin concerns and efficacy profiles.
              </p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-primary">
              <h3 className="text-xl font-bold mt-0">Global Trend & Search Data</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Insights from booking aggregators like <strong>Fresha</strong> regarding surging interest in clinical treatments or specialized aesthetic styles.
              </p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-primary">
              <h3 className="text-xl font-bold mt-0">Regional Regulatory & Compliance Standards</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                <strong>HHS.gov</strong> or medical oversight data needed to ensure AI-driven med-spa treatments remain compliant with regional licensing and HIPAA laws.
              </p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-primary">
              <h3 className="text-xl font-bold mt-0">Market Competitor Benchmarking</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                External datasets on local pricing and brand popularity used to train dynamic pricing models that respond to market demand in real-time.
              </p>
            </div>
          </div>

          <div className="mt-24 p-8 rounded-3xl bg-secondary/30 border border-border">
            <h2 className="text-2xl font-black uppercase italic mb-6">Secondary Signal Sources</h2>
            <p className="text-sm text-muted-foreground mb-6">
              While the 15 sources above form the "Infrastructure Bedrock," elite enterprises are also beginning to pilot these auxiliary data streams for hyper-specialized models:
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Biometric Wearables", sub: "Oura, Apple Health" },
                { label: "Smart Mirrors", sub: "Sensor Data" },
                { label: "Virtual AR tools", sub: "User Attempt Data" },
                { label: "Social Listening", sub: "Sentiment Nodes" },
                { label: "Carbon Footprint", sub: "Sourcing Origin Data" },
                { label: "Public Health Data", sub: "Regional Trends" }
              ].map((item) => (
                <div key={item.label} className="bg-white p-4 rounded-xl shadow-sm border border-border/50">
                   <div className="text-xs font-black uppercase text-foreground">{item.label}</div>
                   <div className="text-[10px] text-primary font-bold uppercase tracking-wider">{item.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-32 p-12 rounded-3xl bg-primary text-primary-foreground text-center relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform">
                <Microscope className="h-32 w-32" />
             </div>
             <h2 className="text-3xl font-black uppercase italic mb-6">Ready to Architect?</h2>
             <p className="text-lg opacity-90 mb-10 max-w-xl mx-auto font-medium">
                Mapping your data landscape is the first step in our Viability Assessment. Let our senior architects audit your current infrastructure.
             </p>
             <Button className="bg-white text-primary hover:bg-secondary px-10 py-7 text-sm font-black uppercase tracking-widest shadow-xl" asChild>
                <Link href="/#contact">Request Technical Audit</Link>
             </Button>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  )
}
