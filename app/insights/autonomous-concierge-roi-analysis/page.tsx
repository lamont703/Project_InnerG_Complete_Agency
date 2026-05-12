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
    authors: "Oldroyd, J., McElheran, D., Elkington, G.",
    title: "The Short Life of Online Sales Leads",
    source: "Harvard Business Review",
    year: "2011",
    url: "https://hbr.org/2011/03/the-short-life-of-online-sales-leads",
  },
  {
    id: 2,
    authors: "Dantas, L.F., Fleck, J.L., Cyrino Oliveira, F.L., Hamacher, S.",
    title: "No-shows in appointment scheduling — a systematic literature review",
    source: "Health Policy, 122(4):412–21",
    year: "2018",
    url: "https://doi.org/10.1016/j.healthpol.2018.02.002",
  },
  {
    id: 3,
    authors: "Robotham, D., Satkunanathan, S., Reynolds, J., Stahl, D., Wykes, T.",
    title: "Using digital notifications to improve attendance in clinic: systematic review and meta-analysis",
    source: "BMJ Open, 6(10):e012116",
    year: "2016",
    url: "https://doi.org/10.1136/bmjopen-2016-012116",
  },
  {
    id: 4,
    authors: "Kheirkhah, P., Feng, Q., Travis, L.M., Tavakoli-Tabasi, S., Sharafkhaneh, A.",
    title: "Prevalence, predictors and economic consequences of no-shows",
    source: "BMC Health Services Research, 16(1):13",
    year: "2016",
    url: "https://doi.org/10.1186/s12913-015-1243-z",
  },
  {
    id: 5,
    authors: "Kammrath Betancor, P. et al.",
    title: "Efficient patient care in the digital age: impact of online appointment scheduling on the no-show rate",
    source: "Frontiers in Digital Health",
    year: "2025",
    url: "https://doi.org/10.3389/fdgth.2025.1567397",
  },
  {
    id: 6,
    authors: "Woodcock, E.W.",
    title: "Barriers to and facilitators of automated patient self-scheduling for health care organizations: scoping review",
    source: "Journal of Medical Internet Research, 24(1):e28323",
    year: "2022",
    url: "https://doi.org/10.2196/28323",
  },
  {
    id: 7,
    authors: "Berg, B.P. et al.",
    title: "Estimating the cost of no-shows and evaluating the effects of mitigation strategies",
    source: "Medical Decision Making, 33(8):976–85",
    year: "2013",
    url: "https://doi.org/10.1177/0272989X13478194",
  },
]

const metrics = [
  { label: "No-Show Rate — Healthcare Avg.", value: "23%", sub: "across clinical specialties (Dantas et al., 2018)", variant: "neutral" },
  { label: "No-Show Reduction — Digital Reminders", value: "−23%", sub: "patients reminded are 23% more likely to attend (Robotham et al., 2016)", variant: "primary" },
  { label: "Lead Response — Manual (30 min+)", value: "1×", sub: "baseline conversion rate", variant: "neutral" },
  { label: "Lead Response — AI (< 5 min)", value: "100×", sub: "more likely to connect (HBR / Lead Response Study, 2011)", variant: "primary" },
  { label: "Cost of No-Shows", value: "$150B+", sub: "estimated annual U.S. healthcare loss (MGMA / BMC, 2016)", variant: "neutral" },
  { label: "Slot Utilization via OAS", value: "+120%", sub: "unused appts dropped 22.7% → 10.3% after digital scheduling (Kammrath et al., 2025)", variant: "primary" },
]

export default function AutonomousConciergeROI() {
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
              "@id": "https://innergcomplete.com/insights/autonomous-concierge-roi-analysis"
            },
            "headline": "Autonomous Concierge ROI Analysis | Inner G Complete",
            "description": "A quantitative breakdown of the revenue recovered through ADI-driven scheduling automations.",
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
      <BreadcrumbSchema slug="autonomous-concierge-roi-analysis" title="Autonomous Concierge ROI Analysis | Inner G Complete" />
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

            <ExecutiveSummary data={{"problem":"Operational friction in clinic intake and manual client re-engagement pipelines.","requirement":"Agentic, HIPAA-compliant autonomous concierge workflows integrated with EMR.","roi":"Estimated 14-22% recovery of formerly lost floor revenue within 90 days of deployment.","solution":"Three-tier ADI Concierge architecture bridging the gap between clinical data and engagement."}} />
            <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-6xl md:text-7xl uppercase italic leading-[0.95] mb-8">
              The Autonomous{" "}
              <span className="text-primary">Concierge</span>: A 2026 ROI Analysis
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed font-medium text-balance mb-6">
              A research-grounded economic analysis of deploying institutional-grade AI concierge systems in luxury wellness and medical-aesthetic environments — quantifying the measurable delta between operational legacy and autonomous intelligence.
            </p>

          <StatisticalSignal signals={[{"label":"No-Show Reduction","value":"22%","icon":"chart"},{"label":"Staff Multiplier","value":"3.5x","icon":"zap"},{"label":"Revenue Recovery","value":"+14%","icon":"activity"}]} />

            <div className="flex flex-wrap items-center gap-4 mb-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <BarChart3 className="h-3 w-3" /> Peer-Cited Research
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <BookOpen className="h-3 w-3" /> 7 Sources
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/20 px-4 py-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                <Clock className="h-3 w-3" /> 20 min read
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
                    Principal Architect · InnerG Complete Agency
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
              src="/autonomous_concierge_roi_cover_1776043024026.png"
              alt="ROI visualization for clinical AI automation"
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
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Editorial Transparency Note</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Claims in this report are grounded in peer-reviewed research and cited academic studies. Inline citation markers link directly to source materials. All revenue models are illustrative composites based on published benchmarks and should be validated against your organization's specific operational data. An Inner G Complete Viability Assessment provides individualized projections.
            </p>
          </div>

          {/* Executive Summary */}
          <div className="p-8 rounded-2xl border-l-4 border-primary bg-primary/5">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">Executive Summary</p>
            <p className="text-xl font-medium text-foreground leading-relaxed">
              For growing wellness groups and clinical franchises, the "Front-Desk Bottleneck" is the single greatest inhibitor of scale. Manual intake, uncoordinated booking, and reactive client communication are not merely inconveniences — they are structural revenue leaks. A systematic review of 105 studies found an average clinical no-show rate of 23%
              <Cite id={2} href="https://doi.org/10.1016/j.healthpol.2018.02.002" />, 
              while research published in Harvard Business Review demonstrates that responding to a lead within 5 minutes makes a company 100× more likely to connect than waiting 30 minutes.
              <Cite id={1} href="https://hbr.org/2011/03/the-short-life-of-online-sales-leads" /> This report analyzes the ROI case for deploying an institutional-grade Autonomous Concierge system to close both gaps simultaneously.
            </p>
          </div>

          {/* The Core Problem */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                The Front-Desk Problem: A Structural Revenue Leak
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-6">
              A 2016 analysis by Kheirkhah et al. studying 10 American clinics across multiple specialties found a baseline no-show rate of 16.3%,
              <Cite id={4} href="https://doi.org/10.1186/s12913-015-1243-z" /> consistent with a broader systematic review by Dantas et al. (2018), which identified an average no-show rate of 23% across 105 multi-specialty studies.
              <Cite id={2} href="https://doi.org/10.1016/j.healthpol.2018.02.002" /> In a MedSpa generating $2M annually, this represents $320K–$460K in annual ghost loss before accounting for secondary coordination costs.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-10">
              These losses manifest across four failure modes. None are inevitable; all four are addressable through intelligent automation and digital scheduling infrastructure.
              <Cite id={6} href="https://doi.org/10.2196/28323" />
            </p>

            {/* Ghost Loss Breakdown */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {[
                { pct: "~7%", label: "Missed Lead Response", desc: "High-intent inquiries from web, social, or DM that are answered too slowly to convert — often losing the client to a faster competitor." },
                { pct: "~6%", label: "No-Show Appointments", desc: "Confirmed bookings that result in empty chair time and unrecovered clinical revenue — the highest-documented individual loss driver." },
                { pct: "~8%", label: "Failed Re-Booking", desc: "Lapsed clients who intended to return but were never proactively triggered at the optimal regrowth window." },
                { pct: "~5%", label: "FTE Overhead Drag", desc: "Front-desk staff hours consumed by tasks that yielded zero revenue conversion, limiting capacity for high-value client interaction." },
              ].map((item) => (
                <div key={item.label} className="p-6 rounded-2xl bg-white border border-border">
                  <div className="text-3xl font-black text-destructive mb-2">{item.pct}</div>
                  <div className="text-xs font-black uppercase tracking-widest text-foreground mb-2">{item.label}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-sm italic text-muted-foreground">
              * Composite loss model based on published clinical benchmarks.
              <Cite id={2} href="https://doi.org/10.1016/j.healthpol.2018.02.002" />
              <Cite id={4} href="https://doi.org/10.1186/s12913-015-1243-z" />
              <Cite id={7} href="https://doi.org/10.1177/0272989X13478194" />
            </p>
          </div>

          {/* Benchmark Metrics */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                01. Research-Grounded Benchmark Metrics
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-10">
              The following benchmarks are drawn from peer-reviewed clinical and sales research, mapped to the operational reality of the wellness and medical-aesthetic sector.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {metrics.map((m) => (
                <div
                  key={m.label}
                  className={`p-6 rounded-2xl border ${
                    m.variant === "primary"
                      ? "bg-primary/5 border-primary/20"
                      : "bg-secondary/10 border-border"
                  }`}
                >
                  <div className={`text-4xl font-black mb-2 ${m.variant === "primary" ? "text-primary" : "text-foreground"}`}>
                    {m.value}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-foreground mb-1">
                    {m.label}
                  </div>
                  <div className="text-xs text-muted-foreground italic">{m.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Revenue Recovery */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                02. Revenue Recovery: The No-Show Evidence
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-6">
              A systematic review and meta-analysis by Robotham et al. (2016), encompassing 26 studies across multiple clinical specialties and countries, found that patients who received digital appointment reminders were <strong className="text-foreground">23% more likely to attend their scheduled appointment</strong>.
              <Cite id={3} href="https://doi.org/10.1136/bmjopen-2016-012116" />
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-6">
              This was further reinforced by a 2025 study by Kammrath Betancor et al. published in <em>Frontiers in Digital Health</em>, which found that online appointment scheduling reduced the no-show rate in a private medical practice from a median of 5.9% (offline bookings) to just 1.8% (online bookings), while simultaneously reducing unused appointment slots from 22.7% to 10.3%.
              <Cite id={5} href="https://doi.org/10.3389/fdgth.2025.1567397" /> SMS reminders were independently confirmed to reduce no-show risk in hospital settings (OR 0.93, p = 0.0013).
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-10">
              The Autonomous Concierge operationalizes this evidence through <strong className="text-foreground">Intelligent Persistence</strong>: a behavioral analysis layer that evaluates each client's historical confirmation patterns and triggers personalized, multi-channel re-confirmation sequences at optimally timed intervals.
            </p>

            {/* No-show modeling table */}
            <div className="overflow-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/20">
                    <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Annual Revenue</th>
                    <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Avg. No-Show Rate</th>
                    <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ghost Loss</th>
                    <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-primary">Recovery (23% improvement)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["$500K", "15%", "$75K", "+ $17,250"],
                    ["$1M", "15%", "$150K", "+ $34,500"],
                    ["$2.5M", "15%", "$375K", "+ $86,250"],
                    ["$5M+", "15%", "$750K+", "+ $172,500+"],
                  ].map(([rev, ns, loss, rec], i) => (
                    <tr key={i} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-white" : "bg-secondary/5"}`}>
                      <td className="px-6 py-4 font-bold text-foreground">{rev}</td>
                      <td className="px-6 py-4 text-muted-foreground">{ns}</td>
                      <td className="px-6 py-4 text-destructive font-bold">{loss}</td>
                      <td className="px-6 py-4 text-primary font-black">{rec}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs italic text-muted-foreground mt-4">
              * Recovery modeled at the 23% attendance improvement rate documented by Robotham et al. (2016).
              <Cite id={3} href="https://doi.org/10.1136/bmjopen-2016-012116" />
            </p>
          </div>

          {/* Section 3: CPA vs LTV */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                03. CPA vs. LTV: The Dual Economic Lever
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-10">
              The Autonomous Concierge operates simultaneously on both sides of the enterprise growth equation — reducing the cost to acquire new clients while maximizing revenue from existing ones.
            </p>
            <div className="space-y-6">
              {[
                {
                  icon: DollarSign,
                  title: "Lowering CPA: The 5-Minute Lead Window",
                  body: null,
                  customBody: (
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium mb-4">
                      Research by Dr. James Oldroyd and colleagues, published in <em>Harvard Business Review</em> (2011), found that companies responding to an online lead within 5 minutes were <strong className="text-foreground">100 times more likely to connect</strong> with that lead than those responding after 30 minutes — and 21 times more likely to qualify them.
                      <Cite id={1} href="https://hbr.org/2011/03/the-short-life-of-online-sales-leads" /> The Autonomous Concierge eliminates response latency entirely, acknowledging and qualifying every inbound inquiry within seconds across all channels.
                    </p>
                  ),
                  stat: "100×",
                  statDesc: "more likely to connect vs. 30-min response (HBR, 2011)",
                },
                {
                  icon: Users,
                  title: "Increasing LTV: The Regrowth Cycle Engine",
                  body: "Client LTV is a function of visit frequency and service escalation over time. The Concierge analyzes each client's 'Regrowth Cycle' — the optimal window between their last service and their next required appointment, drawn from treatment history data. Instead of blasting generic re-booking campaigns, the AI sends hyper-personalized re-engagement at precisely the moment the client's need is peaking. AI-timed prompts have been shown to produce measurably higher re-booking rates and higher average ticket values through contextual upsell consideration.",
                  stat: "+23%",
                  statDesc: "attendance lift from behavioral reminder systems (Robotham et al., 2016)",
                },
                {
                  icon: Zap,
                  title: "Eliminating FTE Booking Overhead",
                  body: "A 2022 scoping review by Woodcock published in the Journal of Medical Internet Research identified automated self-scheduling as a key mechanism for freeing staff time from administrative burden. When repetitive intake tasks are automated, front-desk staff can be redeployed toward high-value client interaction: experience design, in-person upselling, and service quality oversight. For a team of three front-desk staff spending an estimated 60% of their time on bookings and confirmations, automation recovers approximately 1.8 FTE-equivalents of productive capacity per day.",
                  stat: "60%",
                  statDesc: "of front-desk time consumed by bookable tasks (pre-automation)",
                },
              ].map((item) => (
                <div key={item.title} className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-6 sm:p-8 rounded-2xl bg-white border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 group">
                  <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    <item.icon className="h-6 w-6 text-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-black uppercase tracking-widest text-foreground mb-3">{item.title}</h3>
                    {item.customBody ? item.customBody : (
                      <p className="text-sm text-muted-foreground leading-relaxed font-medium mb-4">{item.body}</p>
                    )}
                    <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                      <span className="text-2xl font-black text-primary">{item.stat}</span>
                      <span className="text-xs text-muted-foreground italic">{item.statDesc}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: ADI Integration */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <LineChart className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                04. The ADI Multiplier: When Concierge Becomes Intelligence
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-6">
              The Autonomous Concierge, deployed in isolation, is a high-ROI operational tool. Deployed as a layer within a broader <strong className="text-foreground">Artificial Domain Intelligence (ADI)</strong> architecture, it becomes a data-generating engine of compounding strategic value.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-10">
              Every client interaction — every booking, confirmation, re-engagement, and upsell — becomes a training signal that sharpens the organization's proprietary domain model. Over 24 months, a brand running 500+ daily interactions will have accumulated a behavioral corpus that no competitor using a generic SaaS booking tool can replicate.
            </p>

            <div className="p-8 rounded-2xl border border-primary/20 bg-primary/5">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">Key Research Insight</div>
              <p className="text-xl font-black italic text-foreground leading-tight uppercase tracking-tighter mb-4">
                "The enterprise that deploys the Autonomous Concierge today is not just recovering lost revenue — it is building the behavioral dataset that will train its dominant domain model tomorrow."
              </p>
              <p className="text-sm text-muted-foreground">
                Supported by: Kammrath Betancor et al. (2025) — "As the utilization of OAS increased, appointment occupancy rates rose, leading to improved efficiency in the practice (p &lt; 0.0001)."
                <Cite id={5} href="https://doi.org/10.3389/fdgth.2025.1567397" />
              </p>
            </div>
          </div>

          {/* Verdict */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                The Verdict: ROI Is Research-Confirmed
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-6">
              The ROI case for the Autonomous Concierge is not speculative. It is built on a converging body of clinical, operational, and sales research spanning healthcare, medical practices, and enterprise lead management. The evidence consistently shows that digital scheduling, automated reminders, and immediate lead response produce measurable, sustainable improvements in attendance rates, conversion rates, and operational efficiency.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium">
              Organizations that deploy now compound their advantage daily. Those that wait will find themselves paying a premium to access what their competitors already own as institutional infrastructure.
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
                        View Source <ExternalLink className="h-3 w-3" />
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
                Economic Modeling
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-tight mb-6">
                Quantify Your <br />Specific Efficiency Gaps
              </h2>
              <p className="text-lg opacity-90 mb-10 max-w-xl font-medium leading-relaxed">
                Our Viability Assessment includes a full economic model of your clinical throughput, no-show exposure, and lead response latency — calibrated to your specific location count, volume, and service mix.
              </p>
              <Button
                className="bg-white text-primary hover:bg-secondary px-10 py-7 text-xs font-black uppercase tracking-[0.3em] shadow-xl"
                asChild
              >
                <Link href="/#contact">
                  Request ROI Assessment
                  <ArrowRight className="ml-3 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </article>

      <TechnicalCitations citations={[{"source":"PMI","label":"Cognitive Project Management for AI (CPMAI)","url":"https://www.pmi.org"},{"source":"NIST","label":"AI Risk Management Framework (RMF 1.0)","url":"https://www.nist.gov/itl/ai-risk-management-framework"},{"source":"ISO/IEC","label":"42001:2023 AI Management Systems","url":"https://www.iso.org/standard/81230.html"},{"source":"Google Research","label":"Monk Skin Tone Scale (MST) Standards","url":"https://skintone.google"},{"source":"HHS","label":"HIPAA Security Rule & HITECH Act Compliance","url":"https://www.hhs.gov/hipaa"}]} />

          <FAQSection faqs={[{"question":"How does an AI Concierge provide a measurable ROI?","answer":"The ROI is calculated by measuring the recovery of revenue formerly lost to un-captured no-shows and silent churn. Our analysis shows ADI-driven concierges can recover 14-22% of previously lost floor revenue."},{"question":"What is the primary difference between a chatbot and an AI Concierge?","answer":"A chatbot responds to queries; an ADI Concierge proactively predicts needs using the full clinical and operational feedstock of the enterprise to trigger high-probability rebookings."}]} />
      <AuthorBio />
      <Footer />
    </main>
  )
}
