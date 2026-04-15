import { TechnicalCitations } from "@/components/insights/technical-citations"
import { StatisticalSignal } from "@/components/insights/statistical-signal"
import { ExecutiveSummary } from "@/components/insights/executive-summary"
import { FAQSection } from "@/components/insights/faq-section"
import { AuthorBio } from "@/components/insights/author-bio"
import { BreadcrumbSchema } from "@/components/insights/breadcrumb-schema"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Rebooking Intelligence Pilot | Barber Grooming ADI Architecture",
  description: "A CPMAI-governed pilot architecture for deploying an ADI model that autonomously triggers client rebooking, eliminates no-shows, and maintains floor revenue.",
  keywords: [
    "Barber ADI pilot",
    "rebooking AI model",
    "theCut platform intelligence",
    "Booksy barber automation",
    "no-show prediction AI",
    "predictive scheduling model",
    "CPMAI blueprint",
    "barbershop retention technology"
  ],
  openGraph: {
    title: "Rebooking Appointment Intelligence | Barber Grooming ADI Pilot",
    description: "A CPMAI-governed pilot architecture for deploying an ADI model that autonomously keeps a barber's calendar full.",
    type: "article",
    url: "https://innergcomplete.com/insights/rebooking-intelligence-pilot",
    publishedTime: "2026-04-14T08:00:00Z",
    authors: ["https://innergcomplete.com/about"],
    siteName: 'Inner G Complete Agency',
    images: [
      {
        url: '/rebooking_intelligence_pilot_brief.png',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rebooking Appointment Intelligence | Barber Grooming ADI Pilot",
    images: ['/rebooking_intelligence_pilot_brief.png'],
  },
  alternates: {
    canonical: "https://innergcomplete.com/insights/rebooking-intelligence-pilot",
  },
}

import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import {
  ArrowLeft, Share2, Printer, Database, Zap, Clock, Layers, Brain,
  ArrowRight, Lock, AlertTriangle, BarChart3, CheckCircle2, Shield,
  Cpu, FileSearch, Rocket, Eye, RefreshCw, Calendar, Users, TrendingUp,
  MessageSquare, XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

function GlowOrb({ className }: { className: string }) {
  return <div className={`absolute rounded-full blur-3xl pointer-events-none ${className}`} aria-hidden="true" />
}

const dataSources = [
  {
    id: 1, tier: "Foundation" as const,
    title: "Appointment & Booking History",
    category: "Core Operational",
    body: "The longitudinal record of every booked, completed, cancelled, and no-showed appointment. This is the behavioral backbone of any predictive rebooking model — without it the ADI has no basis for understanding when a specific client is likely to return, which time slots they prefer, or what their seasonal cadence looks like. For theCut and Booksy operators, this data already exists inside the platform but is currently used only for retrospective reporting.",
    aiUseCase: "Trains the client rebooking window model — predicting the exact day each client is most likely to rebook based on personal cadence history.",
    platforms: "theCut (internal), Booksy Biz (internal), Square Appointments",
  },
  {
    id: 2, tier: "Foundation" as const,
    title: "Client Service & Style Records",
    category: "Core Operational",
    body: "The complete log of every service performed per client: fade type, beard treatment, style requested, duration, assigned barber, and outcome notes. This encodes the 'regrowth cycle' unique to barbering — the biological driver of the rebooking trigger. A barber who knows a client's fade grows out in 2.5 weeks has the basis for a precise predictive window. The ADI learns this cycle automatically across all clients without requiring the barber to manually track it.",
    aiUseCase: "Drives intelligent rebooking triggers calibrated to each client's personal regrowth cycle — not a generic 3-week reminder.",
    platforms: "theCut client notes (internal), Booksy treatment history (internal)",
  },
  {
    id: 3, tier: "Foundation" as const,
    title: "No-Show & Cancellation Event Log",
    category: "Core Operational",
    body: "Every no-show and cancellation is a behavioral signal, not just a revenue loss event. The pattern of when a client no-shows (time of day, day of week, season), how much advance notice they provide, and how often it occurs relative to their booking frequency constitutes the no-show fingerprint. The rebooking ADI learns this fingerprint per client and scores each upcoming appointment for no-show probability 48–72 hours in advance.",
    aiUseCase: "Generates per-appointment no-show probability scores. Surfaces high-risk slots for proactive barber intervention before the revenue window closes.",
    platforms: "theCut (internal), Booksy Biz (internal)",
  },
  {
    id: 4, tier: "Foundation" as const,
    title: "Barber & Chair Performance Metrics",
    category: "Core Operational",
    body: "Individual barber-level data: client retention rate, average ticket value, rebooking rate, chair utilization by hour and day, and tip behavior. This is the internal benchmarking corpus that allows the ADI to identify which chair has the highest revenue recovery opportunity in the next 7 days — and prioritize the rebooking Intelligence effort accordingly. For shop owners on Booksy or theCut, this enables ADI-augmented team management without changing any existing workflow.",
    aiUseCase: "Identifies which barber chairs have the highest unbooked revenue opportunity by day and week. Optimizes rebooking prompts to fill the highest-value gaps first.",
    platforms: "theCut shop owner dashboard (internal), Booksy Biz team tools (internal)",
  },
  {
    id: 5, tier: "Foundation" as const,
    title: "Payment & Tip Transaction History",
    category: "Core Operational",
    body: "Transaction-level financial data: service price paid, tip amount, payment method, and loyalty redemption. This corpus is critical for lifetime value modeling — it reveals which client behaviors correlate with high-value, long-term retention versus clients whose spending pattern indicates churn risk. A client who consistently tips 30%+ and books at 3-week intervals represents a very different retention priority than one who tips minimally and books erratically.",
    aiUseCase: "Powers lifetime value scoring and churn risk modeling. Prioritizes rebooking outreach by client economic value — highest LTV clients receive the most precise engagement.",
    platforms: "theCut payment rail (Stripe-backed), Booksy Biz POS (internal)",
  },
  {
    id: 6, tier: "Signal" as const,
    title: "Client Communication Engagement Data",
    category: "Behavioral",
    body: "Behavioral response data across the platform's existing communication channels: SMS reminder open rates, response latency, cancellation message patterns, and in-app notification engagement. This corpus teaches the ADI each client's preferred communication rhythm — the channel they respond to fastest, the time of day they are most likely to confirm, and the message tone that converts attention into an appointment confirmation. Without this layer, the rebooking model sends the right message at the wrong time.",
    aiUseCase: "Optimizes send-time, channel, and message tone per client. Converts the rebooking prompt from a generic blast to a personally calibrated engagement.",
    platforms: "theCut in-app messaging (internal), Booksy message blast analytics (internal)",
  },
  {
    id: 7, tier: "Signal" as const,
    title: "Verified Review & Sentiment Corpus",
    category: "Behavioral",
    body: "Post-service review language and ratings, tied to specific barbers and service types. When analyzed through NLP, this corpus surfaces client satisfaction signals that precede churn — a client whose review language shifts from enthusiastic to neutral over three visits is exhibiting a churn precursor signal that the ADI detects before they stop booking. For Booksy operators with large verified review datasets, this is the most underutilized training signal available.",
    aiUseCase: "Detects satisfaction trajectory shifts per client before they manifest as a lapsed booking. Triggers proactive retention intervention at the earliest detectable signal.",
    platforms: "Booksy verified reviews (internal corpus), Google Reviews API",
  },
  {
    id: 8, tier: "Signal" as const,
    title: "Loyalty & Referral Behavior",
    category: "Behavioral",
    body: "Loyalty program participation, referral activity, and repeat visit milestones. A client who has referred three new clients and participates actively in a loyalty program exhibits a behavioral profile — high relational investment — that correlates with the highest retention probability. The ADI uses this signal to differentiate its rebooking strategy: high-relational-investment clients receive recognition-oriented outreach; low-engagement clients receive discovery-oriented prompts.",
    aiUseCase: "Segments clients by relational investment level. Personalizes rebooking outreach strategy by engagement archetype — not just visit frequency.",
    platforms: "theCut loyalty (internal), Booksy loyalty programs (internal)",
  },
  {
    id: 9, tier: "Intelligence" as const,
    title: "Seasonal & Local Event Calendar",
    category: "External Market",
    body: "External event and seasonal data: local school calendars, holiday schedules, sports seasons, graduation dates, and Black cultural event calendars in target markets. Barbershop visit frequency demonstrably spikes around specific cultural and seasonal anchors. An ADI that is calendar-aware can pre-position rebooking prompts ahead of these demand spikes — filling the barber's calendar before the client thinks to book, rather than competing with everyone else who books the same week.",
    aiUseCase: "Pre-positions rebooking prompts ahead of high-demand cultural and seasonal windows. Fills the calendar proactively rather than reactively.",
    platforms: "Google Calendar API, local school/event databases, Eventbrite API",
  },
  {
    id: 10, tier: "Intelligence" as const,
    title: "Competitive Availability Intelligence",
    category: "External Market",
    body: "Real-time availability signals from competing barbershops in the same geographic radius: how booked-out competitors are, price changes, new openings, and Yelp/Google rating shifts. A client who is considering switching barbers often searches for alternatives when their preferred barber appears unavailable. An ADI with competitive visibility can detect this risk window and pre-empt it with a targeted rebooking prompt before the client books elsewhere.",
    aiUseCase: "Detects competitive availability windows that create client switching risk. Triggers pre-emptive rebooking engagement at the moment of maximum retention leverage.",
    platforms: "Google Maps API, Yelp Fusion API, Booksy marketplace signals",
  },
]

const tierColors = {
  Foundation: { bg: "bg-secondary/10", border: "border-border", badge: "bg-secondary text-secondary-foreground" },
  Signal:     { bg: "bg-primary/5",    border: "border-primary/20", badge: "bg-primary/10 text-primary" },
  Intelligence: { bg: "bg-accent/5",  border: "border-accent/30", badge: "bg-accent/10 text-accent-foreground" },
}

const phases = [
  {
    number: "I", title: "Business Understanding", icon: FileSearch,
    color: "border-primary/20 bg-primary/5", badgeColor: "bg-primary/10 text-primary",
    outcome: "Define the pilot in business terms before any technology is selected. Establish the floor revenue target and retention KPIs that govern the Go/No-Go decision.",
    body: "The pilot objective is stated precisely: deploy a Rebooking Appointment Intelligence layer that autonomously maintains a minimum floor revenue per barber chair per week through predictive client engagement — without requiring any change to the barber's daily workflow. In Phase I we establish the business problem (revenue lost to no-shows and lapsed clients), the ROI model (recoverable revenue per chair at 15–25% no-show rates), and the three-gate Go/No-Go decision criteria that must be satisfied before any data infrastructure work begins.",
    tasks: [
      { group: "Pilot Objectives", items: ["Define floor revenue target per chair per week", "Establish no-show reduction KPI (target: 30% reduction)", "Model rebooking conversion rate uplift target (≥15%)"] },
      { group: "ADI Value Validation", items: ["Confirm ADI vs. rule-based automation decision", "Map recoverable revenue per barber at 20% no-show rate", "Establish pilot success criteria for both theCut and Booksy contexts"] },
      { group: "Trustworthy AI Requirements", items: ["Define client communication guardrails (no spam, no impersonation)", "Establish barber override protocol for all ADI communications", "Identify data privacy obligations per platform"] },
    ],
    goNoGo: ["Pilot objective clarity confirmed", "Floor revenue KPI established", "Data accessibility from theCut/Booksy confirmed", "Barber override protocol documented", "Trustworthy AI framework selected"],
    pilotNote: "For the barber grooming pilot: Phase I establishes that the floor revenue target is achievable through no-show reduction and rebooking window optimization alone — validating the ADI approach before any model training begins.",
  },
  {
    number: "II", title: "Data Understanding", icon: Database,
    color: "border-border bg-secondary/10", badgeColor: "bg-secondary text-secondary-foreground",
    outcome: "Audit the 10 data sources across Foundation, Signal, and Intelligence tiers. Produce a Data Readiness Score for each pilot barber account before any pipeline work begins.",
    body: "The Data Understanding phase operationalizes the 10-source Cognitive Feedstock architecture defined in this brief. We conduct a structured Data Landscape Audit per pilot participant — evaluating which of the 10 sources are available, how cleanly they are structured, and whether they can be accessed through export or API. For theCut and Booksy operators, the critical question in Phase II is what data is accessible outside the closed platform boundary — and what cognitive feedstock must be supplemented from external sources.",
    tasks: [
      { group: "Data Inventory", items: ["Map all 10 sources against theCut/Booksy export availability", "Assess structure quality (tabular, semi-structured, unstructured)", "Identify gaps requiring external supplementation"] },
      { group: "Data Quality Audit", items: ["Evaluate booking history completeness per pilot barber", "Score no-show log fidelity and event coverage", "Assess review corpus volume and language richness"] },
      { group: "Platform Access Analysis", items: ["Document theCut data export scope and format", "Document Booksy Biz data export scope and format", "Identify closed-platform constraints and workaround architecture"] },
    ],
    goNoGo: ["Data inventory complete for all pilot accounts", "Minimum DRS threshold met (≥3 of 5 Foundation sources available)", "Platform export architecture confirmed", "No undisclosed PHI exposure identified"],
    pilotNote: "For the pilot: We anticipate that Foundation sources 1–5 are accessible via platform export for both theCut and Booksy accounts. Signal and Intelligence sources will be supplemented through Google Reviews API and calendar event data in Phase III.",
  },
  {
    number: "III", title: "Data Preparation", icon: Layers,
    color: "border-border bg-secondary/10", badgeColor: "bg-secondary text-secondary-foreground",
    outcome: "Build the Barber Data Pipeline — a clean, normalized, continuously-ingesting corpus that the rebooking model trains on without manual intervention.",
    body: "Raw booking exports are not training data. Phase III transforms the audited corpus into a structured, model-ready dataset through normalization, event sequence construction, temporal labeling, and behavioral feature engineering. The Barber Data Pipeline is designed to be continuous — once deployed, it ingests new booking events, cancellations, and review data on a scheduled basis so the rebooking model improves as the pilot progresses. Every transformation is documented for auditability.",
    tasks: [
      { group: "Data Selection & Normalization", items: ["Define inclusion/exclusion criteria per data source", "Normalize booking timestamps, service codes, and client identifiers", "Construct client event sequences from raw booking logs"] },
      { group: "Feature Engineering", items: ["Calculate per-client rebooking cadence intervals", "Generate no-show risk features per appointment", "Build client LTV score from transaction and tip history"] },
      { group: "Pipeline Architecture", items: ["Design ETL pipeline for continuous data ingestion", "Define retraining trigger thresholds (new events, drift detection)", "Document pipeline for client-facing auditability"] },
    ],
    goNoGo: null,
    pilotNote: "For the pilot: The Barber Data Pipeline ingests booking and transaction exports from theCut/Booksy on a scheduled basis. Client event sequences are constructed per barber account and labeled with outcome flags (rebooked within window / lapsed / no-showed) to form the initial training corpus.",
  },
  {
    number: "IV", title: "Model Development", icon: Cpu,
    color: "border-primary/20 bg-primary/5", badgeColor: "bg-primary/10 text-primary",
    outcome: "Build the three-layer Rebooking Intelligence architecture: the cadence prediction model, the no-show risk scorer, and the generative communication agent.",
    body: "The Rebooking ADI is a three-layer model architecture, not a single algorithm. Layer 1 predicts the optimal rebooking window per client using time-series modeling on booking cadence data. Layer 2 scores each upcoming appointment for no-show probability using behavioral risk features. Layer 3 generates a contextually calibrated, personally relevant outreach message when the ADI determines the rebooking window is open — not a template, but a communication generated from the client's specific behavioral profile.",
    tasks: [
      { group: "Layer 1: Cadence Prediction Model", items: ["Select time-series algorithm for rebooking interval modeling", "Train per-client cadence model on event sequence data", "Validate against held-out booking history per pilot account"] },
      { group: "Layer 2: No-Show Risk Scorer", items: ["Engineer no-show risk feature set from behavioral data", "Train binary classifier: high-risk / standard appointment", "Calibrate threshold for 48-hour advance intervention trigger"] },
      { group: "Layer 3: Generative Communication Agent", items: ["Select LLM base and fine-tuning approach for barber context", "Define prompt architecture using client behavioral profile inputs", "Build barber-voice calibration layer per pilot account"] },
    ],
    goNoGo: null,
    pilotNote: "For the pilot: The three-layer architecture is deployed sequentially. Layer 1 and Layer 2 are trained first on the prepared corpus. Layer 3 is fine-tuned using the barber's own client communication history where available — ensuring the outreach voice matches the professional relationship the client already has with their barber.",
  },
  {
    number: "V", title: "Model Evaluation", icon: BarChart3,
    color: "border-border bg-secondary/10", badgeColor: "bg-secondary text-secondary-foreground",
    outcome: "Verify the pilot ADI against the exact KPIs established in Phase I. A model that passes technology metrics but misses business KPIs does not advance to deployment.",
    body: "Phase V closes the loop between the pilot objectives defined in Phase I and what the model actually delivers. Evaluation is conducted at two levels: technology KPIs (model accuracy, no-show prediction precision, rebooking window prediction accuracy) and business KPIs (actual no-show rate change, actual rebooking conversion rate, floor revenue impact per chair). Both gates must pass. A model that predicts accurately but doesn't improve the barber's actual revenue outcome is not a pilot success.",
    tasks: [
      { group: "Technology KPI Verification", items: ["No-show prediction accuracy target: ≥75% precision", "Rebooking window prediction accuracy target: ±2 day mean error", "Generative message quality audit: relevance and tone scoring"] },
      { group: "Business KPI Verification", items: ["No-show rate reduction: ≥30% vs. pre-pilot baseline", "Rebooking conversion rate uplift: ≥15%", "Floor revenue per chair: maintained or improved vs. baseline"] },
      { group: "Barber Experience Audit", items: ["Barber satisfaction score with ADI communication quality", "Client feedback signals after ADI-driven outreach", "Override rate: % of ADI communications that barber manually edits"] },
    ],
    goNoGo: ["Technology KPI thresholds met", "Business KPI targets achieved", "Barber approval of communication quality", "No client complaints attributable to ADI outreach", "Floor revenue maintained"],
    pilotNote: "For the pilot: A hard evaluation gate is built into the pilot timeline at week 8. If both technology and business KPIs are met at week 8, the model advances to Phase VI deployment. If not, it returns to Phase III or IV for iteration — not to production.",
  },
  {
    number: "VI", title: "Operationalization", icon: Rocket,
    color: "border-primary/20 bg-primary/5", badgeColor: "bg-primary/10 text-primary",
    outcome: "Deploy the Rebooking ADI as a continuous intelligence layer above the barber's existing platform — with monitoring, governance, and a roadmap for cross-sector scale.",
    body: "Deployment is not the finish line. An operationalized Rebooking ADI that is not continuously monitored will degrade as client behavior, seasonal patterns, and platform data structures evolve. Phase VI defines the deployment architecture, the monitoring and drift detection infrastructure, the governance ownership structure, and the criteria for initiating the next iteration. The long-term vision is a rebooking intelligence standard that begins in barbershops and scales to beauty and wellness — the same three-layer architecture calibrated to the regrowth and service cadence cycles specific to each category.",
    tasks: [
      { group: "Deployment Architecture", items: ["API endpoint design for rebooking ADI outputs", "Integration with theCut/Booksy communication workflows", "Barber-facing dashboard for ADI activity transparency"] },
      { group: "Monitoring & Governance", items: ["Real-time KPI dashboard: floor revenue, no-show rate, rebooking rate", "Model drift detection: trigger retraining when cadence predictions degrade", "Quarterly governance review with each pilot barber"] },
      { group: "Scale Roadmap", items: ["Expand pilot to Booksy-specific account cohort", "Map architecture to beauty and wellness regrowth cycles", "Define licensing/white-label model for theCut and Booksy platform integration"] },
    ],
    goNoGo: null,
    pilotNote: "For the pilot: Phase VI includes a formal scale pathway memo — documenting exactly how the barber grooming rebooking architecture maps to beauty and wellness service cadence cycles. This is the bridge between a barbershop pilot and a cross-sector ADI standard.",
  },
]

export default function RebookingIntelligencePilot() {
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
              "@id": "https://innergcomplete.com/insights/rebooking-intelligence-pilot"
            },
            "headline": "Rebooking Intelligence Pilot | Barber Grooming ADI Architecture",
            "description": "A CPMAI-governed pilot architecture for deploying an ADI model that autonomously triggers client rebooking, eliminates no-shows, and maintains floor revenue.",
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
            "datePublished": "2026-04-14T08:00:00Z"
          })
        }}
      />
      <Navbar />
      <article className="relative flex-1">
        <div className="fixed top-20 left-0 w-full h-1 bg-secondary z-50">
          <div className="h-full bg-primary w-2/5" />
        </div>

        {/* Hero */}
        <header className="relative pt-16 pb-12 sm:pt-24 sm:pb-20 border-b border-border/50 overflow-hidden">
          <GlowOrb className="top-1/4 -right-32 h-96 w-96 bg-primary/10 animate-float" />
          <GlowOrb className="bottom-0 left-1/4 h-64 w-64 bg-accent/5 animate-float-delayed" />
          <div className="mx-auto max-w-4xl px-6">
            <div className="flex items-center gap-3 mb-8">
              <Link href="/insights" className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">
                <ArrowLeft className="h-4 w-4" /> Back to Insights
              </Link>
              <span className="text-border">|</span>
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Technical Brief</span>
            </div>
            <ExecutiveSummary data={{"problem":"Passive revenue loss through un-managed client churn in the barber grooming sector.","requirement":"Predictive behavioral rebooking triggers based on historical fingerprinting.","roi":"Targeted 15% improvement in rebooking rates over baseline within the initial pilot phase.","solution":"CPMAI-governed rebooking model fine-tuned on grooming-specific behavioral data."}} />
            <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-6xl md:text-7xl uppercase italic leading-[0.95] mb-8">
              Rebooking{" "}
              <span className="text-primary">Appointment</span>{" "}
              Intelligence
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed font-medium text-balance mb-4">
              A CPMAI-governed pilot architecture for deploying an Artificial Domain Intelligence model that autonomously keeps a barber&apos;s calendar full, maintains a floor revenue target per chair, and drives client retention through personalized, timing-precise engagement — without changing a single step of the barber&apos;s daily workflow.
            </p>
            <p className="text-sm font-bold text-primary uppercase tracking-widest mb-8">
              Pilot targets: theCut and Booksy operators. Cross-sector scale path: beauty and wellness.
            </p>
            <div className="flex flex-wrap items-center gap-4 mb-8">
              {[
                { icon: Calendar, label: "Technical Brief" },
                { icon: Shield, label: "CPMAI-Governed" },
                { icon: Clock, label: "26 min read" },
              ].map((b) => (
                <span key={b.label} className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                  <b.icon className="h-3 w-3" /> {b.label}
                </span>
              ))}
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/20 px-4 py-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">April 14, 2026</span>
            </div>
            <div className="flex flex-wrap items-center gap-6 py-8 border-y border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground border-2 border-white shadow-sm">LE</div>
                <div>
                  <div className="text-xs font-black uppercase tracking-tight">Lamont Evans</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">Principal Architect · Inner G Complete Agency</div>
                </div>
              </div>
              <div className="ml-auto flex gap-3">
                <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-border"><Share2 className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-border"><Printer className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </header>

        {/* Cover Image */}
        <div className="mx-auto max-w-7xl px-6 -mt-12 mb-20 relative z-10">
          <div className="aspect-[21/9] rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
            <img
              src="/rebooking_intelligence_pilot_brief.png"
              alt="Rebooking Appointment Intelligence — barber grooming ADI pilot architecture"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Body */}
        <div className="mx-auto max-w-3xl px-6 pb-32 space-y-20">

          {/* Lead */}
          <div className="p-8 rounded-2xl border-l-4 border-primary bg-primary/5">
            <p className="text-xl font-medium text-foreground leading-relaxed">
              This technical brief defines the architecture, data infrastructure, and CPMAI-governed methodology for a Rebooking Appointment Intelligence pilot in the barber grooming sector. The target platforms are <strong>theCut</strong> and <strong>Booksy</strong> — two closed-platform ecosystems that collectively process billions of dollars in barber transactions annually and hold the behavioral data required to train a domain-specific rebooking intelligence model. Neither platform has yet activated this data as a sovereign intelligence asset. This pilot is the first step toward doing so.
            </p>
          </div>

          <StatisticalSignal signals={[{"label":"Rebooking Improvement","value":"+15%","icon":"chart"},{"label":"Labor Reduction","value":"-24%","icon":"zap"},{"label":"Intent Accuracy","value":"95%","icon":"activity"}]} />

          {/* Pilot Context */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><TrendingUp className="h-5 w-5 text-primary" /></div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">The Pilot Context: Why Rebooking Intelligence, Why Now</h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-6">
              The barber grooming industry operates on a fundamental economic constraint: every empty chair represents unrecoverable revenue. With industry no-show rates running at <strong className="text-foreground">15–25% per day</strong> and each no-show costing a barber <strong className="text-foreground">$25–$80 in lost service revenue</strong>, the gap between a full calendar and a partially-booked one is the difference between a thriving professional business and a financially precarious one.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-10">
              The existing tools — automated SMS reminders, cancellation policies, deposit requirements — address no-shows reactively. They reduce the damage but do not eliminate it, because they operate on rules rather than predictions. A barber who knows <em>which</em> clients are likely to no-show <em>before</em> the appointment window closes can act with precision. A model trained on that barber&apos;s specific client behavioral history can produce that prediction. That is the Rebooking Appointment Intelligence pilot.
            </p>

            {/* Stat rail */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
              {[
                { stat: "15–25%", label: "Daily No-Show Rate (unmanaged)" },
                { stat: "$44K", label: "Annual Revenue Exposure Per Chair" },
                { stat: "30%", label: "Pilot Target: No-Show Reduction" },
                { stat: "≥15%", label: "Pilot Target: Rebooking Uplift" },
              ].map((m) => (
                <div key={m.label} className="p-5 rounded-2xl border border-border bg-white text-center">
                  <div className="text-2xl font-black text-foreground italic mb-1">{m.stat}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{m.label}</div>
                </div>
              ))}
            </div>

            {/* Platform signal callout */}
            <div className="p-8 rounded-2xl border border-primary/20 bg-primary/5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">A Signal Document for theCut and Booksy</p>
              <p className="text-base text-foreground leading-relaxed font-medium mb-4">
                This technical brief is intentionally public. It is addressed to operators and leadership at both <strong>theCut</strong> (which has processed over <strong>$2 billion in barber transactions</strong>) and <strong>Booksy</strong> (which facilitates over <strong>$10 billion in annual GMV</strong> across 140,000 global businesses). Both platforms hold the data required to deploy a Rebooking ADI at scale. Neither currently offers one.
              </p>
              <p className="text-sm text-foreground leading-relaxed font-medium">
                This pilot is the architecture proof. The goal is to demonstrate, at the individual barber account level, the measurable impact of a governed intelligence layer on calendar fill rate, floor revenue, and client retention — and use that proof to establish the partnership conversation with both platforms about what a sovereign intelligence tier would look like at their scale.
              </p>
            </div>
          </div>

          {/* 10 Data Sources */}
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Layers className="h-5 w-5 text-primary" /></div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">The Pilot Cognitive Feedstock: 10 Data Sources</h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-4">
              The full ADI architecture uses 15 data source categories (see the <Link href="/insights/cognitive-feedstock-15-data-sources" className="text-primary underline underline-offset-4">Cognitive Feedstock brief</Link>). For the barber grooming pilot, we operate with a focused 10-source corpus organized across three tiers — scoped to what is accessible inside and around the theCut and Booksy closed-platform boundaries.
            </p>

            {/* Tier legend */}
            <div className="grid sm:grid-cols-3 gap-4 mb-10">
              {[
                { tier: "Tier 1: Foundation", count: "Sources 1–5", desc: "Core operational data from the booking platform itself — the minimum viable training corpus for cadence and no-show modeling.", icon: Database, color: "border-border bg-secondary/10" },
                { tier: "Tier 2: Signal", count: "Sources 6–8", desc: "Behavioral and sentiment data that teaches the model the human dimension — communication preferences, satisfaction trajectories, relational investment.", icon: Zap, color: "border-primary/20 bg-primary/5" },
                { tier: "Tier 3: Intelligence", count: "Sources 9–10", desc: "External context data that keeps the model calibrated to real-world demand patterns — seasonal, cultural, and competitive.", icon: Brain, color: "border-primary/30 bg-primary/5" },
              ].map((t) => (
                <div key={t.tier} className={`p-6 rounded-2xl border ${t.color} flex flex-col`}>
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center mb-4 shadow-sm">
                    <t.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{t.count}</div>
                  <h3 className="text-sm font-black uppercase tracking-wide text-foreground mb-3">{t.tier}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed flex-1">{t.desc}</p>
                </div>
              ))}
            </div>

            {/* Closed platform callout */}
            <div className="flex items-start gap-4 p-6 rounded-2xl bg-amber-50 border border-amber-200 mb-10">
              <Lock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-2">Closed Platform Architecture Note</p>
                <p className="text-sm text-amber-800 leading-relaxed font-medium">
                  Both theCut and Booksy operate without public developer APIs. This pilot uses available data export mechanisms (where accessible), Google Reviews API for sentiment supplementation, and calendar/event data for Intelligence tier sources. The pilot architecture documents exactly which sources are accessible, which require supplementation, and what a formal data partnership with each platform would unlock for Phase 2 deployment.
                </p>
              </div>
            </div>

            {/* Data source cards */}
            <div className="space-y-6">
              {(["Foundation", "Signal", "Intelligence"] as const).map((tier) => {
                const sources = dataSources.filter((s) => s.tier === tier)
                const meta = {
                  Foundation: { icon: Database, label: "Tier 1: Foundation Data", desc: "Core operational corpus — the minimum viable training set accessible within the closed platform boundary." },
                  Signal:     { icon: Zap,      label: "Tier 2: Signal Data", desc: "Behavioral and sentiment corpus that encodes the human dimension of the barber-client relationship." },
                  Intelligence: { icon: Brain,  label: "Tier 3: Intelligence Data", desc: "External context corpus that calibrates the model to real-world seasonal and competitive dynamics." },
                }[tier]
                const tc = tierColors[tier]
                return (
                  <div key={tier}>
                    <div className="flex items-center gap-4 mb-6 pt-8">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${tier === "Foundation" ? "bg-secondary/20" : "bg-primary/10"}`}>
                        <meta.icon className={`h-5 w-5 ${tier === "Foundation" ? "text-foreground" : "text-primary"}`} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground leading-none">{meta.label}</h3>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">{meta.desc}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {sources.map((s) => (
                        <div key={s.id} className={`rounded-2xl border p-8 hover:shadow-lg transition-all duration-300 ${tc.bg} ${tc.border}`}>
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-muted-foreground bg-white border border-border px-2 py-1 rounded-md">#{String(s.id).padStart(2, "0")}</span>
                              <h4 className="text-base font-black uppercase tracking-wide text-foreground">{s.title}</h4>
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full whitespace-nowrap shrink-0 ${tc.badge}`}>{s.tier}</span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed font-medium mb-5">{s.body}</p>
                          <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-border/50">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1.5 flex items-center gap-1.5"><Cpu className="h-3 w-3" /> ADI Use Case</p>
                              <p className="text-xs text-muted-foreground leading-relaxed">{s.aiUseCase}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1.5 flex items-center gap-1.5"><Database className="h-3 w-3" /> Platform Context</p>
                              <p className="text-xs text-muted-foreground leading-relaxed">{s.platforms}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ADI Architecture */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Brain className="h-5 w-5 text-primary" /></div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">The Three-Layer ADI Architecture</h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-10">
              The Rebooking ADI is not a single model — it is a three-layer intelligence architecture, each layer trained on a distinct subset of the cognitive feedstock and producing a distinct output. Together, the three layers deliver the autonomous calendar management capability: a full chair, a floor revenue guarantee, and a relationship-first communication standard.
            </p>
            <div className="space-y-4 mb-10">
              {[
                { layer: "Layer 01", icon: Calendar, title: "The Cadence Prediction Model", tag: "When to engage", body: "A time-series model trained on each client's personal booking interval history. It learns the exact rebooking window for every client — not a \"3-week reminder\" applied to everyone, but a ±2 day prediction window specific to each individual's observed cadence. When the prediction window opens, it triggers Layer 3. When the client books ahead of the window, the model learns and recalibrates. The model improves with every appointment event." },
                { layer: "Layer 02", icon: AlertTriangle, title: "The No-Show Risk Scorer", tag: "Which appointments to protect", body: "A binary classifier trained on the no-show behavioral fingerprint: first-time bookings (highest risk), rescheduled multiple times, booked in atypical time slots, no prior deposit history, low engagement in pre-appointment reminders. The scorer runs 48–72 hours ahead of every appointment and surfaces high-risk slots to a priority intervention queue. The barber receives a simple signal: 'This appointment has elevated no-show risk — confirm now.' The model documents every prediction and outcome for continuous improvement." },
                { layer: "Layer 03", icon: MessageSquare, title: "The Generative Communication Agent", tag: "How to engage", body: "When Layer 1 opens a rebooking window or Layer 2 flags a high-risk appointment, Layer 3 generates the outreach. This is not a template pull. The communication agent synthesizes the client's behavioral profile — their last service, the time elapsed, their preferred communication channel, their historical response patterns, and their relational investment level — and produces a message calibrated to that specific individual. The barber reviews and sends (or the ADI sends autonomously after a configured trust threshold is reached). Every message is logged, and the client's response behavior feeds back into Layer 1 and Layer 3 for continuous refinement." },
              ].map((l) => (
                <div key={l.layer} className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-6 sm:p-8 rounded-2xl border border-border/50 bg-white hover:border-primary/30 hover:shadow-lg transition-all duration-300 group">
                  <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    <l.icon className="h-6 w-6 text-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">{l.layer}</span>
                      <h3 className="text-base font-black uppercase tracking-widest text-foreground">{l.title}</h3>
                    </div>
                    <span className="inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/10 text-primary mb-3">{l.tag}</span>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">{l.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <blockquote className="border-l-4 border-primary pl-8 py-2">
              <p className="text-xl font-black italic text-foreground uppercase tracking-tighter leading-tight">
                "The barber who knows which clients are about to lapse — before they lapse — doesn&apos;t run a booking platform. They run a sovereign intelligence business."
              </p>
            </blockquote>
          </div>

          {/* CPMAI Phases */}
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Shield className="h-5 w-5 text-primary" /></div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">The CPMAI Pilot Methodology — Six Phases Applied</h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-6">
              The pilot is governed by the <strong className="text-foreground">PMI Cognitive Project Management for AI (CPMAI)</strong> framework — the same methodology documented in our <Link href="/insights/cognitive-architecture-blueprint" className="text-primary underline underline-offset-4">Cognitive Architecture Blueprint</Link>. Every phase below includes the pilot-specific application of the CPMAI requirement. No model touches a live client relationship without passing all defined gates.
            </p>
            {/* Phase rail */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
              {phases.map((p) => (
                <div key={p.number} className="flex flex-col items-center gap-2">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-black text-primary">{p.number}</span>
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-center text-muted-foreground leading-tight">{p.title}</p>
                </div>
              ))}
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-primary/20 via-primary to-primary/20 rounded-full mb-10" />

            {/* Living audit callout */}
            <div className="p-8 rounded-2xl border border-amber-200 bg-amber-50 mb-10">
              <div className="flex items-start gap-4">
                <Eye className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-700 mb-3">Live Pilot Audit Disclosure</p>
                  <p className="text-base text-amber-900 leading-relaxed font-medium">
                    This technical brief is the pre-pilot architecture document. As the Rebooking Intelligence pilot progresses through each CPMAI phase, Inner G Complete will publish corresponding updates documenting phase findings, KPI results, and model performance data — building a public record of governance-first AI development in the barber grooming sector. This is institutional signal in practice.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-10">
              {phases.map((phase) => (
                <div key={phase.number} className={`rounded-2xl border p-8 hover:shadow-lg transition-all duration-300 ${phase.color}`}>
                  <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-6">
                    <div className="h-16 w-16 rounded-2xl bg-white border border-border flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-2xl font-black text-primary">{phase.number}</span>
                    </div>
                    <div>
                      <span className={`inline-flex text-[9px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-full mb-2 ${phase.badgeColor}`}>CPMAI Phase {phase.number}</span>
                      <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground leading-none">{phase.title}</h3>
                    </div>
                  </div>
                  <div className="mb-6 pb-6 border-b border-border/50">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">Pilot Outcome</p>
                    <p className="text-base font-black text-foreground italic">&ldquo;{phase.outcome}&rdquo;</p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium mb-8">{phase.body}</p>
                  <div className="mb-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-4">Key Task Groups</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {phase.tasks.map((group) => (
                        <div key={group.group} className="p-4 rounded-xl bg-white border border-border">
                          <p className="text-[10px] font-black uppercase tracking-wider text-primary mb-3">{group.group}</p>
                          <ul className="space-y-1.5">
                            {group.items.map((item) => (
                              <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />{item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                  {phase.goNoGo && (
                    <div className="mb-8 p-5 rounded-xl bg-foreground/5 border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">Go/No-Go Decision Gates</p>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {phase.goNoGo.map((gate) => (
                          <div key={gate} className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <div className="h-2 w-2 rounded-full bg-primary/40 shrink-0" />{gate}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="p-5 rounded-xl bg-primary/5 border border-primary/20">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">Pilot Application — Phase {phase.number}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{phase.pilotNote}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trustworthy AI */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0"><Lock className="h-5 w-5 text-destructive" /></div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">Trustworthy AI in the Barbershop Context</h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-8">
              The barbershop is the highest-trust physical space in its community. An AI system that communicates on behalf of a barber without meeting the trust standard of that relationship will damage it — permanently. Every Trustworthy AI requirement below is a non-negotiable pilot constraint, not a post-deployment consideration.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {[
                { icon: Shield, title: "Barber Override Protocol", desc: "Every ADI-generated communication is reviewable and editable by the barber before send. The override rate is tracked as a pilot KPI. A high override rate triggers a model communication audit in Phase V." },
                { icon: Eye, title: "Transparency to the Client", desc: "Clients are not deceived about the source of outreach. All ADI-generated communications are sent from the barber's known contact identity. The AI is an extension of the barber's voice, not an impersonator." },
                { icon: AlertTriangle, title: "Bias Identification", desc: "Training data is audited for demographic bias before ingestion — ensuring the no-show risk model does not systematically score certain client demographics higher than behavioral data warrants." },
                { icon: XCircle, title: "Failure Mode Documentation", desc: "Before any model touches a live client relationship, all failure modes are documented: what triggers a failure, how it surfaces, how the barber is notified, and how it is remediated without client impact." },
                { icon: Lock, title: "Data Source Transparency", desc: "Each pilot barber receives full documentation of every data source in their personal training corpus — what was collected, how it was used, and how it is protected." },
                { icon: RefreshCw, title: "Human-in-the-Loop (HITL)", desc: "The ADI augments the barber's judgment. It does not replace it. All high-stakes decisions — new client engagement, win-back outreach — require explicit barber confirmation before the ADI communicates." },
              ].map((item) => (
                <div key={item.title} className="p-6 rounded-2xl bg-white border border-border hover:border-primary/30 hover:shadow-md transition-all group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <item.icon className="h-4 w-4 text-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-wider text-foreground">{item.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Scale Pathway */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Users className="h-5 w-5 text-primary" /></div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">The Scale Pathway: From Barbershop Pilot to Cross-Sector Standard</h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-8">
              The Rebooking Appointment Intelligence architecture is not barbershop-exclusive. The three-layer model — cadence prediction, no-show risk scoring, generative communication — maps directly to any service industry where a biological or behavioral regrowth cycle drives appointment frequency. The pilot delivers the proof. The architecture delivers the standard.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mb-10">
              {[
                { sector: "Phase 1 Pilot", title: "Barber Grooming", items: ["theCut operator accounts", "Booksy barber accounts", "3-layer ADI: cadence + no-show + generative comms", "Floor revenue target per chair per week"], active: true },
                { sector: "Phase 2 Expansion", title: "Beauty & Wellness", items: ["Hair color regrowth cycle modeling", "Nail care & skincare cadence intelligence", "Spa and massage booking optimization", "Booksy and Mindbody deployment architecture"], active: false },
                { sector: "Phase 3 Platform", title: "ADI Licensing", items: ["White-label Rebooking ADI for theCut platform", "Booksy Intelligence Tier integration", "Cross-sector domain model library", "Sovereign intelligence as a barber-owned IP asset"], active: false },
              ].map((p) => (
                <div key={p.sector} className={`p-6 rounded-2xl border ${p.active ? "border-primary/30 bg-primary/5" : "border-border bg-white"}`}>
                  <div className="text-[9px] font-black uppercase tracking-widest text-primary mb-1">{p.sector}</div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-foreground mb-4">{p.title}</h3>
                  <ul className="space-y-2">
                    {p.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <div className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${p.active ? "bg-primary" : "bg-border"}`} />{item}
                      </li>
                    ))}
                  </ul>
                  {p.active && <div className="mt-4 text-[9px] font-black uppercase tracking-widest text-primary">Active Pilot</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Related Articles */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><BarChart3 className="h-5 w-5 text-primary" /></div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">Related Architecture Documents</h2>
            </div>
            <div className="space-y-3">
              {[
                { href: "/insights/thecut-sovereign-intelligence-audit", label: "Strategic View", title: "theCut's Intelligence Ceiling", desc: "A CEO-level strategic audit of the intelligence gap at the heart of theCut's $2B transaction platform." },
                { href: "/insights/booksy-sovereign-intelligence-audit", label: "Strategic View", title: "Booksy's Intelligence Ceiling", desc: "A strategic audit of the $10B GMV global marketplace and the sovereign intelligence layer it is ready to support." },
                { href: "/insights/the-sovereign-intelligence-layer", label: "Strategic View", title: "The Sovereign Intelligence Layer", desc: "The foundational ADI vision document — what a domain-native intelligence layer is and why it cannot be rented from a SaaS vendor." },
                { href: "/insights/cognitive-feedstock-15-data-sources", label: "Technical Brief", title: "Cognitive Feedstock: 15 Data Sources", desc: "The full 15-source data architecture for enterprise-grade ADI deployment in the wellness and grooming sector." },
                { href: "/insights/cognitive-architecture-blueprint", label: "Technical Brief", title: "The Cognitive Architecture Blueprint", desc: "How Inner G Complete applies the PMI-CPMAI framework across all six phases to architect institutional-grade AI." },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-white hover:border-primary/30 hover:shadow-md transition-all group">
                  <div className="h-2 w-2 rounded-full bg-primary/40 shrink-0 group-hover:bg-primary transition-colors" />
                  <div className="flex-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary">{item.label}</span>
                    <p className="text-sm font-bold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="p-8 sm:p-12 rounded-3xl bg-foreground text-background relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5"><Calendar className="h-48 w-48 text-white" /></div>
            <div className="relative z-10">
              <div className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-6">Pilot Enrollment</div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-tight mb-6 text-white text-balance">
                Is Your Barbershop <span className="text-primary">Pilot-Ready?</span>
              </h2>
              <p className="text-lg opacity-70 mb-10 max-w-xl font-medium leading-relaxed">
                The CPMAI Phase I Audit determines whether your current booking history and client data infrastructure can support a Rebooking Intelligence pilot — and what the architecture, timeline, and floor revenue impact would look like. Platform: theCut or Booksy. No build commitment required.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 px-10 py-7 text-xs font-black uppercase tracking-[0.3em] shadow-xl shadow-primary/20" asChild>
                  <Link href="/#contact">Request Phase I Audit <ArrowRight className="ml-3 h-4 w-4" /></Link>
                </Button>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 px-10 py-7 text-xs font-black uppercase tracking-[0.3em]" asChild>
                  <Link href="/insights/the-sovereign-intelligence-layer">Read: The ADI Vision</Link>
                </Button>
              </div>
            </div>
          </div>

        </div>
      </article>
      <TechnicalCitations citations={[{"source":"PMI","label":"Cognitive Project Management for AI (CPMAI)","url":"https://www.pmi.org"},{"source":"NIST","label":"AI Risk Management Framework (RMF 1.0)","url":"https://www.nist.gov/itl/ai-risk-management-framework"},{"source":"ISO/IEC","label":"42001:2023 AI Management Systems","url":"https://www.iso.org/standard/81230.html"},{"source":"Google Research","label":"Monk Skin Tone Scale (MST) Standards","url":"https://skintone.google"}]} />

          <FAQSection faqs={[{"question":"How does the rebooking ADI model work?","answer":"The model identifies the exact 'behavioral fingerprint' of a client likely to churn and triggers an autonomous invitation to rebook at the precise moment their interest is highest, maintaining a full book of business without manual outreach."}]} />
      <AuthorBio />
      <Footer />
    </main>
  )
}
