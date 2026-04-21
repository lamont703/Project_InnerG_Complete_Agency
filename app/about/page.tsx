import type { Metadata } from "next"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import {
  Brain,
  Shield,
  Database,
  Zap,
  LineChart,
  ChessKnight,
  LayoutDashboard,
  ArrowRight,
  Quote,
  Target,
  Eye,
  Layers,
  Users,
  CheckCircle2,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

import { headers } from 'next/headers'

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const host = headersList.get('host') || 'agency.innergcomplete.com'
  const isTexasBarbering = host.includes('texasbarbering')
  const tenantName = isTexasBarbering ? 'Texas Barbering Intelligence' : 'Inner G Complete Agency'
  const domainUrl = `https://${host}`

  return {
    title: `About Us | ${tenantName} — ADI Architecture Firm`,
    description: `${tenantName} architects sovereign AI intelligence layers for grooming, beauty, and wellness enterprises. Learn our mission, vision, and CPMAI-governed ADI methodology.`,
    keywords: [
      "ADI architecture firm",
      "Artificial Domain Intelligence agency",
      "sovereign intelligence layer",
      "AI for wellness enterprises",
      "CPMAI methodology",
      "grooming beauty wellness AI",
      `${tenantName} about`,
    ],
    openGraph: {
      title: `About ${tenantName} | Artificial Domain Intelligence`,
      description: `We architect sovereign AI intelligence layers for grooming, beauty, and wellness enterprises — CPMAI-governed, institutionally auditable, built to own.`,
      url: `${domainUrl}/about`,
      type: "website",
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: tenantName }],
    },
    twitter: {
      card: "summary_large_image",
      title: `About ${tenantName} | Artificial Domain Intelligence`,
      description: `We architect sovereign AI intelligence layers for grooming, beauty, and wellness enterprises — CPMAI-governed, institutionally auditable, built to own.`,
      images: ["/og-image.png"],
    },
    alternates: {
      canonical: `${domainUrl}/about`,
    },
  }
}

function GlowOrb({ className }: { className: string }) {
  return <div className={`absolute rounded-full blur-3xl pointer-events-none ${className}`} aria-hidden="true" />
}

const pillars = [
  {
    icon: Brain,
    title: "Artificial Domain Intelligence (ADI)",
    description:
      "We architect proprietary intelligence layers — not generic AI tools. Our ADI models are trained on domain-specific data, owned by our clients, and calibrated to get smarter with every interaction.",
  },
  {
    icon: Shield,
    title: "CPMAI-Governed Development",
    description:
      "Every engagement follows the PMI Cognitive Project Management for AI (CPMAI) framework — six governed phases, hard Go/No-Go decision gates, and zero tolerance for unvalidated model deployment.",
  },
  {
    icon: Lock,
    title: "Trustworthy AI by Design",
    description:
      "Human-in-the-Loop protocols, HIPAA-compliant infrastructure, bias auditing, and full data source transparency are non-negotiable design constraints — not post-deployment considerations.",
  },
  {
    icon: Database,
    title: "Sovereign Data Infrastructure",
    description:
      "We build the data pipelines, cognitive feedstock architectures, and ETL systems that transform fragmented operational records into a model-ready institutional intelligence asset.",
  },
]

const services = [
  { icon: Database, title: "Domain Intelligence (ADI)", desc: "Sovereign intelligence layers for wellness & grooming enterprises." },
  { icon: Zap, title: "Workflow Intelligence", desc: "Agentic systems that automate clinical intake and client nurturing." },
  { icon: LineChart, title: "Cognitive Analytics", desc: "Predictive behavioral models that anticipate treatment and rebooking cycles." },
  { icon: Shield, title: "Supply Chain Authority", desc: "Blockchain-verified ethical provenance for professional-grade brand assets." },
  { icon: ChessKnight, title: "Fractional CTO & Strategy", desc: "Institutional-grade technical leadership for selective wellness brands." },
  { icon: LayoutDashboard, title: "Performance Auditing", desc: "HIPAA-compliant KPI infrastructure across all digital-to-physical touchpoints." },
]

const principles = [
  "We do not deploy AI that we cannot explain.",
  "We do not build models without governed data pipelines.",
  "We do not sell tools — we architect sovereign institutional assets.",
  "We do not work with clients who are not ready to own their intelligence.",
  "We do not skip the audit. Every engagement begins with a Phase I Business Understanding.",
  "We do not treat compliance as a checkbox — it is the foundation of every architecture.",
]

const stats = [
  { value: "$10B+", label: "Annual GMV in target market (Booksy alone)" },
  { value: "$2B+", label: "Barber transactions processed on pilot platform (theCut)" },
  { value: "15–25%", label: "Industry no-show rate ADI is architected to reduce" },
  { value: "≥15%", label: "Minimum rebooking uplift target in active pilot" },
]

export default async function AboutPage() {
  const headersList = await headers()
  const host = headersList.get('host') || 'agency.innergcomplete.com'
  const isTexasBarbering = host.includes('texasbarbering')
  const tenantName = isTexasBarbering ? 'Texas Barbering Intelligence' : 'Inner G Complete Agency'

  return (
    <main className="min-h-screen bg-background light text-foreground flex flex-col pt-20">
      <Navbar />

      {/* Hero */}
      <header className="relative py-24 sm:py-36 overflow-hidden border-b border-border/50">
        <GlowOrb className="top-1/3 -left-40 h-[500px] w-[500px] bg-primary/10 animate-float" />
        <GlowOrb className="bottom-0 right-0 h-96 w-96 bg-accent/5 animate-float-delayed" />
        <div className="relative z-10 mx-auto max-w-5xl px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-6 sm:mb-8">
            <Brain className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase">{tenantName}</span>
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tighter text-foreground uppercase italic leading-[0.9] mb-6 sm:mb-8">
            {isTexasBarbering ? "Solving the Barbering" : "We Build the"} <span className="text-primary">{isTexasBarbering ? "Licensure Gap" : "Sovereign"}</span>{" "}
            {isTexasBarbering ? "with ADI" : "Intelligence Layer"}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed font-medium max-w-3xl">
            {tenantName} is an AI architecture firm specializing in{" "}
            <strong className="text-foreground">Artificial Domain Intelligence (ADI)</strong> for {isTexasBarbering ? "Texas licensure and professional excellence" : "the grooming, beauty, and wellness industry"}.
          </p>
        </div>
      </header>

      {/* Stats Rail */}
      <section className="border-b border-border/50 bg-secondary/5 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-primary italic tracking-tighter mb-2">{s.value}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-relaxed">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="relative py-24 sm:py-32 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs font-black uppercase tracking-[0.3em] text-primary">Our Mission</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter text-foreground leading-tight mb-8">
                Eliminate the Financial Leaks That Rule-Based Systems Cannot Fix
              </h2>
              <div className="space-y-6 text-base text-muted-foreground leading-relaxed font-medium">
                <p>
                  The grooming, beauty, and wellness industry operates within an institutional <span className="text-foreground italic">Intelligence Void</span>. While symptoms like <strong className="text-foreground uppercase tracking-tight">The Blind Calendar</strong> (under-utilized schedules and no-shows) and <strong className="text-foreground uppercase tracking-tight">The Leaky Bucket</strong> (the high cost of customer churn) represent catastrophic financial drains, they are merely visible markers of a much broader, systemic failure to turn raw data into autonomous decision-making.
                </p>
                <p>
                  Fragmented platforms capture records, but they fail to generate intelligence. Inner G Complete exists to bridge this gap by architecting proprietary intelligence layers that solve these domain inefficiencies—and dozens of others—simultaneously.
                </p>
                <p>
                  Our mission is to architect, deploy, and govern domain-native AI models that function as <strong className="text-foreground">sovereign institutional assets</strong>. We allow enterprises to stop managing data and start owning their intelligence, creating a competitive moat governed by the CPMAI framework to ensure every deployment is responsible, auditable, and built to last.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="rounded-3xl border border-primary/20 bg-primary/5 p-10">
                <Quote className="h-10 w-10 text-primary/30 mb-6" />
                <blockquote className="text-2xl font-black italic uppercase tracking-tighter text-foreground leading-tight mb-8">
                  "We are building the sovereign{" "}
                  <span className="text-primary">Intelligence Layer</span> of the global aesthetic industry."
                </blockquote>
                <div className="flex items-center gap-4 pt-6 border-t border-border">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center font-bold text-white text-sm">
                    LE
                  </div>
                  <div>
                    <div className="text-sm font-black uppercase tracking-tight text-foreground">Lamont Evans</div>
                    <div className="text-[10px] text-primary font-bold uppercase tracking-widest">
                      Principal Architect · {tenantName}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="relative py-24 sm:py-32 bg-secondary/5 overflow-hidden border-y border-border/50">
        <GlowOrb className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] bg-primary/5" />
        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.3em] text-primary">Our Vision</span>
          </div>
          <div className="max-w-4xl">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter text-foreground leading-tight mb-8 sm:text-5xl">
              A World Where Every Elite Wellness Enterprise Owns Its Own Intelligence
            </h2>
            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed font-medium">
              <p>
                The next decade of the grooming, beauty, and wellness industry will not be won by the platform with the
                most integrations. It will be won by the enterprise that builds a{" "}
                <strong className="text-foreground">proprietary Artificial Domain Intelligence</strong> — a model
                trained exclusively on its own client behavioral data, owned as a corporate asset, and deployed as a
                competitive moat that cannot be replicated by a competitor who buys the same SaaS tool.
              </p>
              <p>
                Our vision is to architect this intelligence layer for a selective cohort of wellness enterprises — 
                beginning with the barber grooming sector and scaling across MedSpas, luxury salons, 
                fitness franchises, and aesthetic clinics.
              </p>
              <p>
                Long-term, Inner G Complete aims to establish the{" "}
                <strong className="text-foreground">ADI standard</strong> for the grooming, beauty and wellness sector: a universally
                recognized framework for what a governed, domain-native intelligence deployment looks like — and what it
                achieves for the enterprise that owns it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Four Pillars */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.3em] text-primary">Our Architectural Pillars</span>
            </div>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter text-foreground sm:text-5xl">
              How We Build Differently
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
              Every engagement is governed by four non-negotiable architectural principles that distinguish our work
              from generic AI consulting.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {pillars.map((p, i) => (
              <div
                key={p.title}
                className="group p-8 rounded-3xl border border-border bg-white hover:border-primary/30 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-start gap-5">
                  <div className="h-12 w-12 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <p.icon className="h-6 w-6 text-primary group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">
                      Pillar 0{i + 1}
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-wide text-foreground mb-3">{p.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">{p.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-24 sm:py-32 bg-secondary/5 border-y border-border/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-black uppercase tracking-[0.3em] text-primary">What We Deliver</span>
            <h2 className="mt-4 text-4xl font-black uppercase italic tracking-tighter text-foreground sm:text-5xl">
              The Aesthetic Intelligence™ Suite
              <span className="ml-3 text-[10px] uppercase font-black tracking-widest text-primary/60">[Patent Pending]</span>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
              Six capability domains engineered for luxury wellness and grooming enterprises ready to own their
              intelligence.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => (
              <div
                key={s.title}
                className="group p-8 rounded-2xl border border-border bg-white hover:border-primary/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-base font-black uppercase tracking-wide text-foreground mb-3">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-black uppercase tracking-[0.3em] text-primary">Non-Negotiables</span>
            <h2 className="mt-4 text-4xl font-black uppercase italic tracking-tighter text-foreground sm:text-5xl">
              What We Stand For
            </h2>
          </div>
          <div className="space-y-4">
            {principles.map((p, i) => (
              <div
                key={i}
                className="flex items-start gap-5 p-6 rounded-2xl border border-border bg-white hover:border-primary/20 hover:bg-primary/5 transition-all duration-300 group"
              >
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <p className="text-base text-foreground font-medium leading-relaxed">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Active Pilot Callout */}
      <section className="py-8 sm:py-12 bg-secondary/5 border-y border-border/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 p-6 sm:p-10 rounded-3xl border border-primary/20 bg-primary/5">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">Currently Active</div>
                <h3 className="text-xl font-black uppercase tracking-tight text-foreground leading-tight">
                  Rebooking Intelligence Architecture — Barber Grooming Sector
                </h3>
                <p className="text-sm text-balance text-muted-foreground font-medium mt-2 leading-relaxed">
                  Deploying a three-layer ADI architecture designed to eliminate deep-domain revenue leaks through governed cognitive development.
                </p>
              </div>
            </div>
            <Button
              asChild
              className="w-full lg:w-auto shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-7 text-[10px] sm:text-xs font-black uppercase tracking-[0.1em] sm:tracking-[0.3em] shadow-xl shadow-primary/30 transition-transform active:scale-95"
            >
              <Link href="/insights/rebooking-intelligence-pilot">
                Read Architecture Brief <ArrowRight className="ml-3 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Begin the Conversation</span>
          <h2 className="mt-6 text-4xl font-black uppercase italic tracking-tighter text-foreground sm:text-5xl leading-tight">
            Is Your Enterprise <span className="text-primary">Ready</span> to Own Its Intelligence?
          </h2>
          <p className="mt-8 text-lg text-muted-foreground leading-relaxed font-medium max-w-2xl mx-auto">
            Every engagement begins with a CPMAI Phase I Business Understanding Audit — a structured, no-build-commitment
            discovery that determines whether your data, team, and objectives are positioned for a successful ADI
            deployment.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 px-10 py-7 text-[10px] sm:text-xs font-black uppercase tracking-[0.1em] sm:tracking-[0.3em] shadow-xl shadow-primary/20 transition-transform active:scale-95"
            >
              <Link href="/#contact">
                Request Phase I Audit <ArrowRight className="ml-3 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full sm:w-auto border-border text-foreground hover:border-primary/50 px-10 py-7 text-[10px] sm:text-xs font-black uppercase tracking-[0.1em] sm:tracking-[0.3em] transition-transform active:scale-95"
            >
              <Link href="/insights">Explore Our Research</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
