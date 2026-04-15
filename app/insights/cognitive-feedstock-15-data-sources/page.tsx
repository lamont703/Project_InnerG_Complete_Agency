import { TechnicalCitations } from "@/components/insights/technical-citations"
import { StatisticalSignal } from "@/components/insights/statistical-signal"
import { ExecutiveSummary } from "@/components/insights/executive-summary"
import { FAQSection } from "@/components/insights/faq-section"
import { AuthorBio } from "@/components/insights/author-bio"
import { BreadcrumbSchema } from "@/components/insights/breadcrumb-schema"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cognitive Feedstock: 15 Data Sources for Aesthetic AI | Technical Brief',
  description: 'Moving beyond simple booking lists to tap into high-fidelity data that captures the human element of wellness and grooming.',
  keywords: ['AI data sources', 'wellness AI parameters', 'grooming data feedstock', 'ADI data landscape'],
  openGraph: {
    title: 'Cognitive Feedstock: 15 Data Sources for Aesthetic AI',
    type: 'article',
    url: 'https://innergcomplete.com/insights/cognitive-feedstock-15-data-sources',
    siteName: 'Inner G Complete Agency',
    images: [
      {
        url: '/cognitive_feedstock_brief_cover_1776041859371.png',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cognitive Feedstock: The 15 Enterprise Data Sources",
    images: ['/cognitive_feedstock_brief_cover_1776041859371.png'],
  },
  alternates: {
    canonical: "https://innergcomplete.com/insights/cognitive-feedstock-15-data-sources",
  },
}

import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import {
  ArrowLeft,
  Share2,
  Printer,
  Database,
  UserCheck,
  Zap,
  Globe,
  ShieldCheck,
  Microscope,
  Clock,
  Layers,
  Brain,
  ArrowRight,
  Lock,
  AlertTriangle,
  BarChart3,
  Cpu,
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

type Tier = "Foundation" | "Signal" | "Intelligence"

const dataSources: {
  id: number
  title: string
  tier: Tier
  category: string
  body: string
  aiUseCase: string
  platforms: string
  compliance: boolean
}[] = [
  {
    id: 1,
    title: "Appointment & Scheduling History",
    tier: "Foundation",
    category: "Core Operational",
    body: "The longitudinal record of every booked, completed, cancelled, and no-showed appointment across all service categories. This is the behavioral backbone of any predictive scheduling model — without it, the AI has no basis for understanding when a client is likely to return, which time slots convert, or how to dynamically staff against demand.",
    aiUseCase: "Predicts peak-hour demand, no-show probability per client, and optimal rebooking windows with behavioral precision.",
    platforms: "Mindbody, Zenoti, Square Appointments, Meevo",
    compliance: false,
  },
  {
    id: 2,
    title: "Client Treatment & Service Records",
    tier: "Foundation",
    category: "Core Operational",
    body: "The complete historical log of every service performed: service type, applied formulas, duration, assigned technician, and outcome notes. This is the most domain-specific data in the entire corpus — it encodes the 'regrowth cycle' unique to this industry and powers the recommendation engine that drives re-booking conversion.",
    aiUseCase: "Drives intelligent re-booking triggers, service progression modeling, and technician-to-client affinity matching.",
    platforms: "Zenoti, Mindbody, Rosy Salon Software",
    compliance: true,
  },
  {
    id: 3,
    title: "Real-Time Inventory & Back-Bar Usage",
    tier: "Foundation",
    category: "Core Operational",
    body: "Granular consumption data for every professional product used per service — dyes, toners, treatment solutions, consumables. When tracked at the per-service level, this data teaches the AI both the true cost-per-service and the supply velocity required to avoid clinical stockouts, especially at high-volume franchise locations.",
    aiUseCase: "Powers automated reorder triggers, cost-per-service margin analysis, and waste reduction optimization.",
    platforms: "Meevo, Square Appointments, Lightspeed Retail",
    compliance: false,
  },
  {
    id: 4,
    title: "Employee Performance & Productivity Metrics",
    tier: "Foundation",
    category: "Core Operational",
    body: "Individual technician-level data covering client retention rate, average ticket value, upsell frequency, service duration vs. benchmark, and rebooking rate. This is the internal benchmarking corpus that allows AI to identify the behavioral patterns of high-performing team members and scale those patterns across a franchise.",
    aiUseCase: "Identifies performance distribution across locations, enables AI-assisted coaching, optimizes shift allocation.",
    platforms: "Planday, Deputy, ADP Workforce Now",
    compliance: false,
  },
  {
    id: 5,
    title: "Digital Consultation & Intake Forms",
    tier: "Foundation",
    category: "Personalization",
    body: "Structured pre-service intake data covering health disclosures, known allergies, contraindications, skin conditions, aesthetic goals, and service preferences. This data is especially critical in medical-aesthetic contexts where incorrect service application creates liability. In AI terms, it is the safety layer that constrains model recommendations to clinically appropriate options for each individual.",
    aiUseCase: "Enables contraindication-aware recommendations, powers personalization agents, and forms the client safety profile.",
    platforms: "Phorest, Jane App, custom intake forms",
    compliance: true,
  },
  {
    id: 6,
    title: "High-Resolution Visual & Diagnostic Assets",
    tier: "Signal",
    category: "Personalization",
    body: "Before-and-after photography, scalp analysis scans, skin health assessments, and RGB spectral imaging from smart devices. This is the most computationally intensive data type in the corpus, requiring computer vision infrastructure rather than simple tabular analysis. The AI learns to quantify treatment efficacy visually — moving from subjective stylist notes to objective, measurable outcomes.",
    aiUseCase: "Computer vision diagnostics, treatment outcome quantification, AI-assisted scalp and skin assessment.",
    platforms: "TrichoScan, Portrait AI, Observ 520x",
    compliance: true,
  },
  {
    id: 7,
    title: "Personalized Technical Formulas",
    tier: "Signal",
    category: "Personalization",
    body: "The specific chemical notations created for each client: color ratios, developer volumes, laser intensity settings, injection depth parameters, or custom topical blends. This data is highly proprietary — it represents the intellectual capital of the individual technician and the brand's service quality. It also makes the AI a genuine domain expert rather than a generic booking assistant.",
    aiUseCase: "Enables formula consistency across franchise locations, trains AI on real-world efficacy-to-outcome mapping.",
    platforms: "Custom databases, Vish (color management), Shortcuts Software",
    compliance: true,
  },
  {
    id: 8,
    title: "Client Preference & Sentiment Profiles",
    tier: "Signal",
    category: "Personalization",
    body: "Qualitative behavioral data: preferred environment (quiet, social), communication channel preferences, service pace preferences, stylist relationship scores, and aggregated post-service satisfaction ratings. This is the 'human intelligence' layer of the corpus — it prevents the AI from optimizing purely for operational efficiency at the cost of the client experience that drives retention.",
    aiUseCase: "Trains personalization and communication agents, informs client-technician matching, reduces churn through experience preservation.",
    platforms: "Birdeye, Google Reviews API, Medallia",
    compliance: false,
  },
  {
    id: 9,
    title: "CRM & Omnichannel Engagement Analytics",
    tier: "Signal",
    category: "Marketing & Interaction",
    body: "Behavioral engagement data across email, SMS, social DM, and in-app touchpoints: open rates, click-through rates, response latency, and interaction-to-booking conversion rates by channel. This corpus teaches the AI each client's preferred communication rhythm and the messaging triggers that convert attention into appointments.",
    aiUseCase: "Powers intelligent send-time optimization, channel preference modeling, and churn prediction via engagement decay signals.",
    platforms: "HubSpot, Klaviyo, Attentive, Postscript",
    compliance: false,
  },
  {
    id: 10,
    title: "Conversation & Voice Interaction Logs",
    tier: "Signal",
    category: "Marketing & Interaction",
    body: "Transcribed and indexed records of AI front-desk interactions, inbound calls, and live chat sessions. When processed through NLP, these logs surface the most common client friction points, booking objections, and question patterns — forming the training basis for a conversational AI that handles objections with domain-specific accuracy rather than generic deflection.",
    aiUseCase: "NLP training for conversational AI agents, friction point identification, objection handling optimization.",
    platforms: "Dialpad, Otter.ai, OpenAI Whisper + custom pipelines",
    compliance: true,
  },
  {
    id: 11,
    title: "Loyalty, Membership & Revenue Behavior",
    tier: "Signal",
    category: "Marketing & Interaction",
    body: "Transaction-level data from loyalty programs, membership subscriptions, and package redemption patterns. This corpus is critical for lifetime value modeling — it reveals which client behaviors (visit frequency, spend patterns, referral activity) correlate with long-term, high-value retention versus those that signal churn risk.",
    aiUseCase: "Lifetime value prediction, churn risk scoring, premium tier marketing trigger optimization.",
    platforms: "Perkville, Zenoti Loyalty, custom platforms",
    compliance: false,
  },
  {
    id: 12,
    title: "Ingredient & Product Efficacy Metadata",
    tier: "Intelligence",
    category: "External & Market",
    body: "Structured ingredient databases mapping active compounds to clinical efficacy profiles, contraindication matrices, and regulatory status by region. This corpus is what elevates an AI from a booking assistant to a domain-competent clinical advisor — it can evaluate whether a product formulation is appropriate for a specific skin phenotype or contraindicated by a disclosed health condition.",
    aiUseCase: "Powers AI-assisted product recommendations, contraindication screening, and ingredient compatibility analysis.",
    platforms: "CosIng (EU), FDA Cosmetic Database, Mintel GNPD",
    compliance: false,
  },
  {
    id: 13,
    title: "Global Trend & Search Intelligence",
    tier: "Intelligence",
    category: "External & Market",
    body: "Aggregated demand signals from search trend APIs, booking platform trend data, and social sentiment analysis. This external intelligence layer prevents the AI from becoming myopically optimized on historical behavior while missing macro industry shifts — the emergence of a new treatment modality, a viral aesthetic trend, or a regulatory change affecting service availability.",
    aiUseCase: "Proactive service offering recommendations, trend-informed content strategy, early-mover positioning alerts.",
    platforms: "Google Trends API, Fresha Data, Semrush, Brandwatch",
    compliance: false,
  },
  {
    id: 14,
    title: "Regional Regulatory & Compliance Standards",
    tier: "Intelligence",
    category: "External & Market",
    body: "Structured documentation from HHS, state medical boards, FDA, and HIPAA/HITECH frameworks, mapped to specific service categories and geographic jurisdictions. Without this corpus, an AI operating across multi-state franchise locations risks recommending services or data handling practices that are compliant in one state and legally prohibited in another.",
    aiUseCase: "Compliance guardrails in AI recommendations, jurisdiction-aware service eligibility, HIPAA-compliant data routing.",
    platforms: "HHS.gov, State licensing board APIs, LexisNexis",
    compliance: false,
  },
  {
    id: 15,
    title: "Market Competitor & Pricing Benchmarks",
    tier: "Intelligence",
    category: "External & Market",
    body: "Real-time and historical pricing data, service mix trends, and market positioning signals for comparable brands in the same geographic and demographic tier. This corpus is the foundation of a dynamic pricing model that responds to market pressure without eroding brand positioning — a capability that static pricing menus can never provide.",
    aiUseCase: "Dynamic pricing optimization, competitive positioning analysis, service mix benchmarking.",
    platforms: "SimilarWeb, Fresha Market Intelligence, custom scrapers",
    compliance: false,
  },
]

const tierColors: Record<Tier, { bg: string; border: string; text: string; badge: string }> = {
  Foundation: {
    bg: "bg-secondary/10",
    border: "border-border",
    text: "text-foreground",
    badge: "bg-secondary text-secondary-foreground",
  },
  Signal: {
    bg: "bg-primary/5",
    border: "border-primary/20",
    text: "text-foreground",
    badge: "bg-primary/10 text-primary",
  },
  Intelligence: {
    bg: "bg-accent/5",
    border: "border-accent/30",
    text: "text-foreground",
    badge: "bg-accent/10 text-accent-foreground",
  },
}

export default function DataSourcesBrief() {
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
              "@id": "https://innergcomplete.com/insights/cognitive-feedstock-15-data-sources"
            },
            "headline": "Cognitive Feedstock: The 15 Enterprise Data Sources | Inner G Complete",
            "description": "A breakdown of the 15 critical data streams that fuel an enterprise Artificial Domain Intelligence model.",
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
            "datePublished": "2026-04-12T08:00:00Z"
          })
        }}
      />
      <Navbar />

      <article className="relative flex-1">
        {/* Progress Bar */}
        <div className="fixed top-20 left-0 w-full h-1 bg-secondary z-50">
          <div className="h-full bg-primary w-1/3" />
        </div>

        {/* Hero */}
        <header className="relative pt-16 pb-12 sm:pt-24 sm:pb-20 border-b border-border/50 overflow-hidden">
          <GlowOrb className="top-1/4 -right-32 h-96 w-96 bg-primary/10 animate-float" />
          <GlowOrb className="bottom-0 left-1/4 h-64 w-64 bg-accent/5 animate-float-delayed" />

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
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Technical Brief</span>
            </div>

            <ExecutiveSummary data={{"problem":"Superior model performance is blocked by training on generic, non-domain intelligence.","requirement":"A coordinated 15-source technical feedstock ingestion strategy for model training.","roi":"Targeting a 40% improvement in model domain competence over generic foundation models.","solution":"Comprehensive multi-touch ETL pipeline designed for high-signal aesthetic data ingestion."}} />
            <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-6xl md:text-7xl uppercase italic leading-[0.95] mb-8">
              Cognitive Feedstock:{" "}
              <span className="text-primary">15 Data Sources</span> for Aesthetic AI
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed font-medium text-balance mb-6">
              The difference between a generic AI chatbot and a sovereign Aesthetic Domain Intelligence is not the model architecture — it is the corpus. This technical brief maps the 15 data sources required to train an AI that performs at institutional-grade accuracy in the wellness and medical-aesthetic sector.
            </p>
            <p className="text-sm font-bold text-primary uppercase tracking-widest mb-8">
              50% of ML projects are abandoned due to data quality failures. This is why corpus architecture comes first.
            </p>

            <div className="flex flex-wrap items-center gap-4 mb-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <Database className="h-3 w-3" /> Technical Framework
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/20 px-4 py-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                <Clock className="h-3 w-3" /> 15 min read
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/20 px-4 py-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                April 12, 2026
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-6 py-8 border-y border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-foreground">
                  LE
                </div>
                <div>
                  <div className="text-xs font-black uppercase">Lamont Evans</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">
                    Principal Architect · Inner G Complete Agency
                  </div>
                </div>
              </div>
              <div className="ml-auto flex gap-3">
                <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-border">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-border">
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
              src="/cognitive_feedstock_brief_cover_1776041859371.png"
              alt="Neural mapping for aesthetic intelligence"
              width={1400}
              height={600}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Body */}
        <div className="mx-auto max-w-3xl px-6 pb-32 space-y-20">

          {/* Lead */}
          <div className="p-8 rounded-2xl border-l-4 border-primary bg-primary/5">
            <p className="text-xl font-medium text-foreground leading-relaxed">
              An AI model is only as intelligent as the data it was trained on. In the wellness and grooming industry, the most common failure mode of AI projects is not insufficient technology — it is insufficient, fragmented, or compliance-compromised training data. This brief defines the 15 data sources required to architect a model that can deliver institutional-grade intelligence, and explains precisely what each source enables the AI to do.
            </p>
          </div>

          <StatisticalSignal signals={[{"label":"Unique Data Sources","value":"15","icon":"data"},{"label":"Domain Competence","value":"+40%","icon":"chart"},{"label":"Normalization Rate","value":"99.9%","icon":"activity"}]} />

          {/* Tier Architecture Explainer */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                The Three-Tier Data Architecture
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-10">
              The 15 sources are organized across three architectural tiers, each building on the previous. A model trained only on Tier 1 data produces operational efficiencies. A model trained across all three tiers produces a sovereign domain intelligence.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              {[
                {
                  tier: "Tier 1: Foundation",
                  count: "Sources 1–5",
                  desc: "Operational and personalization data generated by daily service delivery. Without this layer, the AI has nothing to analyze. This is the minimum viable corpus.",
                  icon: Database,
                  color: "border-border bg-secondary/10",
                  iconColor: "text-foreground",
                },
                {
                  tier: "Tier 2: Signal",
                  count: "Sources 6–11",
                  desc: "Behavioral, visual, and engagement data that teaches the model to understand the 'human element' — preferences, sentiment, and experience quality.",
                  icon: Zap,
                  color: "border-primary/20 bg-primary/5",
                  iconColor: "text-primary",
                },
                {
                  tier: "Tier 3: Intelligence",
                  count: "Sources 12–15",
                  desc: "External market, regulatory, and competitive data that prevents the model from becoming myopically optimized on internal history while the world changes around it.",
                  icon: Brain,
                  color: "border-primary/30 bg-primary/8",
                  iconColor: "text-primary",
                },
              ].map((item) => (
                <div key={item.tier} className={`p-6 rounded-2xl border ${item.color} flex flex-col`}>
                  <div className={`h-10 w-10 rounded-xl bg-white flex items-center justify-center mb-4 shadow-sm`}>
                    <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{item.count}</div>
                  <h3 className="text-sm font-black uppercase tracking-wide text-foreground mb-3">{item.tier}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed flex-1">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Compliance callout */}
            <div className="flex items-start gap-4 p-6 rounded-2xl bg-amber-50 border border-amber-200">
              <Lock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-2">HIPAA Compliance Flag</p>
                <p className="text-sm text-amber-800 leading-relaxed font-medium">
                  Sources marked <strong>PHI-Sensitive</strong> below contain Protected Health Information under HIPAA and require a formal Business Associate Agreement (BAA), AES-256 encryption at rest and in transit, audit-log infrastructure, and PHI isolation architecture before they can be ingested into any training pipeline. Failure to implement these controls before data collection begins creates retroactive compliance exposure.
                </p>
              </div>
            </div>
          </div>

          {/* All 15 Sources */}
          <div className="space-y-6">
            {(["Foundation", "Signal", "Intelligence"] as Tier[]).map((tier) => {
              const tierSources = dataSources.filter((s) => s.tier === tier)
              const tierMeta = {
                Foundation: { icon: Database, label: "Tier 1: Foundation Data", desc: "Core operational and personalization corpus — the minimum viable training set." },
                Signal: { icon: Zap, label: "Tier 2: Signal Data", desc: "Behavioral and experience data that encodes the human element of the service." },
                Intelligence: { icon: Brain, label: "Tier 3: Intelligence Data", desc: "External corpus that keeps the model calibrated to a changing market reality." },
              }[tier]

              return (
                <div key={tier}>
                  <div className="flex items-center gap-4 mb-6 pt-8">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${tier === "Foundation" ? "bg-secondary/20" : "bg-primary/10"}`}>
                      <tierMeta.icon className={`h-5 w-5 ${tier === "Foundation" ? "text-foreground" : "text-primary"}`} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black uppercase italic tracking-tighter text-foreground leading-none">{tierMeta.label}</h2>
                      <p className="text-xs text-muted-foreground mt-1 font-medium">{tierMeta.desc}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {tierSources.map((source) => (
                      <div
                        key={source.id}
                        className={`rounded-2xl border p-8 hover:shadow-lg transition-all duration-300 group ${tierColors[source.tier].bg} ${tierColors[source.tier].border}`}
                      >
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-muted-foreground bg-white border border-border px-2 py-1 rounded-md">
                              #{String(source.id).padStart(2, "0")}
                            </span>
                            <h3 className="text-base font-black uppercase tracking-wide text-foreground">{source.title}</h3>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            {source.compliance && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-full whitespace-nowrap">
                                <Lock className="h-2.5 w-2.5" /> PHI-Sensitive
                              </span>
                            )}
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full whitespace-nowrap ${tierColors[source.tier].badge}`}>
                              {source.tier}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed font-medium mb-5">{source.body}</p>

                        <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-border/50">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1.5 flex items-center gap-1.5">
                              <Cpu className="h-3 w-3" /> AI Use Case
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{source.aiUseCase}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1.5 flex items-center gap-1.5">
                              <Database className="h-3 w-3" /> Common Platforms
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{source.platforms}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Auxiliary Sources */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                Emerging Signal Sources
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-8">
              While the 15 primary sources above form the "Institutional Bedrock" of any enterprise-grade ADI, a leading cohort of wellness organizations are beginning to pilot the following auxiliary data streams for hyper-specialized model fine-tuning. These sources represent the frontier of the Aesthetic Intelligence corpus.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              {[
                {
                  label: "Biometric Wearables",
                  sub: "HRV, sleep, recovery signals",
                  detail: "Oura Ring, Apple Health, WHOOP — correlating client recovery state with treatment cadence.",
                  icon: Zap,
                },
                {
                  label: "Smart Mirror & Sensor Data",
                  sub: "Real-time skin and scalp imaging",
                  detail: "HiMirror, Visia Complexion Analysis — objective diagnostic data captured passively during sessions.",
                  icon: Microscope,
                },
                {
                  label: "AR Try-On Interaction",
                  sub: "Virtual style experimentation data",
                  detail: "ModiFace, Perfect Corp — which looks a client explores before committing to a service decision.",
                  icon: Globe,
                },
                {
                  label: "Social Listening & Sentiment",
                  sub: "Brand mention and trend nodes",
                  detail: "Brandwatch, Sprinklr — real-time consumer sentiment mapped to product and service categories.",
                  icon: UserCheck,
                },
                {
                  label: "Supply Chain Provenance",
                  sub: "Ingredient sourcing and carbon data",
                  detail: "Blockchain-verified origin data for sustainable and ethical sourcing compliance.",
                  icon: ShieldCheck,
                },
                {
                  label: "Public Health & Epidemiological Data",
                  sub: "Regional wellness trend signals",
                  detail: "CDC, NIH public datasets — macro health trends that influence treatment demand and clinical protocols.",
                  icon: Database,
                },
              ].map((item) => (
                <div key={item.label} className="bg-white p-6 rounded-2xl border border-border hover:border-primary/30 hover:shadow-md transition-all group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <item.icon className="h-4 w-4 text-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase text-foreground">{item.label}</div>
                      <div className="text-[10px] text-primary font-bold uppercase tracking-wider">{item.sub}</div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Data Readiness Score */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                Your Data Readiness Score
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-8">
              Before any AI architecture can begin, Inner G Complete conducts a <strong className="text-foreground">Data Landscape Audit</strong> — a structured evaluation of how many of the 15 primary sources your organization currently collects, how cleanly they are structured, and whether they are compliance-ready for AI ingestion. The result is a Data Readiness Score (DRS) that determines the viable scope of your first ADI deployment.
            </p>
            <div className="overflow-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/20">
                    <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">DRS Range</th>
                    <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sources Active</th>
                    <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">AI Capability</th>
                    <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-primary">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["1–10", "< 5 of 15", "Basic automation only — booking and reminder workflows.", "Data engineering required first"],
                    ["11–30", "5–9 of 15", "Operational AI — scheduling optimization, churn prediction.", "Phased deployment viable"],
                    ["31–60", "10–12 of 15", "Client intelligence — personalization, LTV modeling.", "Strong ADI foundation"],
                    ["61–100", "13–15 of 15", "Domain intelligence — full ADI with compound learning.", "Production ready"],
                  ].map(([score, sources, capability, verdict], i) => (
                    <tr key={i} className={`border-b border-border/50 ${i === 3 ? "bg-primary/5" : i % 2 === 0 ? "bg-white" : "bg-secondary/5"}`}>
                      <td className="px-6 py-4 font-black text-foreground">{score}</td>
                      <td className="px-6 py-4 text-muted-foreground">{sources}</td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">{capability}</td>
                      <td className={`px-6 py-4 font-bold text-xs ${i === 3 ? "text-primary" : i === 0 ? "text-destructive" : "text-muted-foreground"}`}>{verdict}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CTA */}
          <div className="p-8 sm:p-12 rounded-3xl bg-primary text-primary-foreground relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-20">
              <Microscope className="h-48 w-48" />
            </div>
            <div className="relative z-10">
              <div className="text-[10px] font-black uppercase tracking-[0.4em] text-primary-foreground/60 mb-6">
                Data Landscape Audit
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-tight mb-6">
                Map Your Corpus.<br />Know Your Score.
              </h2>
              <p className="text-lg opacity-90 mb-10 max-w-xl font-medium leading-relaxed">
                The Inner G Complete Data Landscape Audit evaluates your current data infrastructure across all 15 source categories, produces your Data Readiness Score, and provides a phased roadmap to production-ready ADI deployment.
              </p>
              <Button
                className="bg-white text-primary hover:bg-secondary px-10 py-7 text-xs font-black uppercase tracking-[0.3em] shadow-xl"
                asChild
              >
                <Link href="/#contact">
                  Request Technical Audit
                  <ArrowRight className="ml-3 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </article>

      <TechnicalCitations citations={[{"source":"PMI","label":"Cognitive Project Management for AI (CPMAI)","url":"https://www.pmi.org"},{"source":"NIST","label":"AI Risk Management Framework (RMF 1.0)","url":"https://www.nist.gov/itl/ai-risk-management-framework"},{"source":"ISO/IEC","label":"42001:2023 AI Management Systems","url":"https://www.iso.org/standard/81230.html"},{"source":"Google Research","label":"Monk Skin Tone Scale (MST) Standards","url":"https://skintone.google"}]} />

          <FAQSection faqs={[{"question":"What is 'Cognitive Feedstock'?","answer":"Feedstock consists of the 15+ specialized data streams (booking cycles, intake summaries, technical formulas, etc.) required to train a model that performs with domain competence in wellness."}]} />
      <AuthorBio />
      <Footer />
    </main>
  )
}
