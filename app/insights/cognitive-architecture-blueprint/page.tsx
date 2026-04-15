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
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Shield,
  Database,
  Cpu,
  BarChart3,
  Rocket,
  FileSearch,
  Layers,
  Eye,
  AlertTriangle,
  Lock,
  RefreshCw,
  BookOpen,
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

const phases = [
  {
    number: "I",
    title: "Business Understanding",
    icon: FileSearch,
    color: "border-primary/20 bg-primary/5",
    iconColor: "text-primary",
    badgeColor: "bg-primary/10 text-primary",
    enterpriseOutcome: "We define exactly what the AI must accomplish — in business terms — before any technology selection begins.",
    body: "This is where most enterprise AI initiatives are won or lost. CPMAI Phase I demands ruthless clarity on the business problem statement, the cost-benefit economics, the ROI model, and — critically — the question of whether AI is even the right solution. We evaluate noncognitive and non-automated alternatives first. If a non-AI solution can achieve the business objective, we say so. This phase concludes with a mandatory three-gate Go/No-Go decision before any development resources are committed.",
    taskGroups: [
      { title: "Business Objectives", tasks: ["Define the business problem statement", "Establish success criteria & KPI benchmarks", "Perform cost-benefit and ROI analysis"] },
      { title: "Cognitive Requirements", tasks: ["Define AI value proposition vs. non-AI alternatives", "Identify AI pattern selection (classification, generation, prediction)", "Map hybrid scope: AI + non-AI components"] },
      { title: "Trustworthy AI Requirements", tasks: ["Trustworthy AI framework selection", "Ethical AI considerations & bias management", "AI failure mode identification & handling protocols"] },
    ],
    goNoGo: [
      "Objective clarity confirmed",
      "ROI viability validated",
      "Data availability verified",
      "Technology & expertise access confirmed",
      "Implementation feasibility established",
    ],
    adiApplication: "For the Grooming & Wellness ADI project: We establish that the business objective is a sovereign intelligence layer that enables personalization, predictive operations, and enterprise-grade compliance — capabilities that no off-the-shelf SaaS platform can deliver. The non-AI alternative analysis confirms that rule-based automation alone cannot replicate the domain-specific learning cycle required.",
  },
  {
    number: "II",
    title: "Data Understanding",
    icon: Database,
    color: "border-border bg-secondary/10",
    iconColor: "text-foreground",
    badgeColor: "bg-secondary text-secondary-foreground",
    enterpriseOutcome: "We audit your data landscape with precision — mapping what exists, what is missing, and what is compliant enough to train on.",
    body: "The data understanding phase is where our Cognitive Feedstock framework operationalizes. We conduct a full Data Landscape Audit across all 15 source categories, evaluate data quality across structure, completeness, and compliance dimensions, and produce a Data Readiness Score (DRS). This phase also includes a critical evaluation of pre-trained foundation models that could accelerate development — reducing the need to train from scratch in domains where public models already carry relevant knowledge.",
    taskGroups: [
      { title: "Initial Data Collection", tasks: ["Data inventory & location mapping across all 15 source categories", "Nature and structure assessment (structured, unstructured, semi-structured)", "Data inspection & volume sufficiency check"] },
      { title: "Data Quality Audit", tasks: ["Current quality assessment per source", "Preparation & transformation pipeline planning", "Training / test / validation split requirements"] },
      { title: "Foundation Model Analysis", tasks: ["Identify applicable pretrained models (LLMs, vision models, recommendation systems)", "Transfer learning & fine-tuning requirements", "Edge device data requirements for on-premise deployments"] },
    ],
    goNoGo: [
      "Data inventory complete",
      "Quality threshold met (DRS ≥ 31)",
      "PHI isolation architecture in place",
      "Training data volume sufficient",
      "Foundation model candidates identified",
    ],
    adiApplication: "For the ADI project: We map all 15 data sources against our Cognitive Feedstock framework (see companion brief). PHI-sensitive sources (consultation forms, visual diagnostics, treatment records) are isolated under HIPAA-compliant architecture before ingestion. Pre-trained recommendation and NLP models from established foundation providers are evaluated to accelerate Phase IV.",
  },
  {
    number: "III",
    title: "Data Preparation",
    icon: Layers,
    color: "border-border bg-secondary/10",
    iconColor: "text-foreground",
    badgeColor: "bg-secondary text-secondary-foreground",
    enterpriseOutcome: "We build the production-grade data pipeline — cleaned, labeled, and architected for continuous ingestion.",
    body: "Raw data is not training data. Phase III transforms the audited corpus from Phase II into a structured, model-ready dataset through rigorous cleansing, augmentation, and labeling operations. Every decision made in this phase is documented for future auditability — a requirement for Trustworthy AI compliance and a non-negotiable for any client seeking regulatory defensibility. The output of this phase is not just a dataset: it is a repeatable data pipeline that will continuously feed the model as new operational data flows in.",
    taskGroups: [
      { title: "Data Selection", tasks: ["Select and document inclusion/exclusion criteria for each data source", "Define selection methodology for auditable reproducibility"] },
      { title: "Data Cleansing & Enhancement", tasks: ["Missing value treatment", "Outlier handling", "Normalization and format standardization", "Augmentation to address class imbalance or low-volume sources"] },
      { title: "Data Labeling", tasks: ["Label strategy by data type (manual, semi-supervised, synthetic)", "Labeling cost and scale projection", "Quality verification protocol for labeled sets"] },
    ],
    goNoGo: null,
    adiApplication: "For the ADI project: We build the Aesthetic Data Pipeline — a continuous ETL infrastructure that ingests operational data from PMS platforms (Mindbody, Zenoti), CRM systems, and digital consultation forms on a real-time or scheduled basis. All ingested data passes through our HIPAA compliance layer for PHI screening before entering the training corpus.",
  },
  {
    number: "IV",
    title: "Model Development",
    icon: Cpu,
    color: "border-primary/20 bg-primary/5",
    iconColor: "text-primary",
    badgeColor: "bg-primary/10 text-primary",
    enterpriseOutcome: "We select, configure, and train the model architecture that converts the prepared corpus into a functioning domain intelligence.",
    body: "This is where the intelligence is built. CPMAI Phase IV covers algorithm selection, ensemble configuration, foundation model fine-tuning, generative AI integration, prompt engineering strategy, and hyperparameter optimization. Crucially, this phase is not a one-shot process — it is iterative by design. The CPMAI model explicitly accommodates multiple training runs, each producing measurable performance outputs that inform Phase V evaluation. For the ADI project, we anticipate a hybrid architecture: a fine-tuned recommendation model for personalization, combined with a generative AI layer for conversational client interaction.",
    taskGroups: [
      { title: "Algorithm & Architecture Selection", tasks: ["Domain-relevant algorithm/modeling technique selection", "Ensemble method configuration if multi-model approach", "AutoML tool evaluation to accelerate training cycles"] },
      { title: "Foundation Model Fine-Tuning", tasks: ["Selection of base pretrained models", "Fine-tuning method (transfer learning, RLHF, prompt tuning)", "API cost and limitation analysis for hosted models"] },
      { title: "Generative AI Integration", tasks: ["Generative AI approach and API selection", "Prompt engineering strategy for domain-specific outputs", "LLM chaining logic for multi-step reasoning workflows"] },
      { title: "Training & Optimization", tasks: ["Model training execution and result documentation", "Validation design (train/test/validation split enforcement)", "Hyperparameter optimization and fit measurement"] },
    ],
    goNoGo: null,
    adiApplication: "For the ADI project: The core model is a multi-layer intelligence architecture — (1) a recommendation engine trained on regrowth cycles, service history, and behavioral preference data; (2) a generative conversational layer fine-tuned on domain-specific client interaction transcripts; and (3) a predictive analytics module trained on scheduling, inventory, and staff performance metrics.",
  },
  {
    number: "V",
    title: "Model Evaluation",
    icon: BarChart3,
    color: "border-border bg-secondary/10",
    iconColor: "text-foreground",
    badgeColor: "bg-secondary text-secondary-foreground",
    enterpriseOutcome: "We validate model performance against the exact KPIs established in Phase I — not against engineering metrics that have no business meaning.",
    body: "Phase V closes the loop between what was promised in Phase I and what the model actually delivers. CPMAI requires evaluation against both technology KPIs (precision, recall, F1, latency) and business KPIs (rebooking rate improvement, no-show reduction, conversion lift). If either dimension fails to meet the thresholds established in Phase I, the model returns to Phase III or IV for iteration — not to production. This hard gate is what distinguishes a CPMAI-governed project from a project that ships a model and calls it done.",
    taskGroups: [
      { title: "Model Performance Audit", tasks: ["Confusion matrix / ROC curve analysis (classification tasks)", "Generative output quality evaluation (relevance, hallucination rate)", "Benchmark comparison against Phase I acceptable performance values"] },
      { title: "Business KPI Verification", tasks: ["Measure against Phase I KPI targets: rebooking rate, no-show reduction, lead conversion", "Document any KPI gaps requiring model iteration", "Stakeholder review and approval readiness"] },
      { title: "Iteration Planning", tasks: ["Define iteration approach for underperforming metrics", "Identify which previous phase requires re-entry", "Document learnings for next training cycle"] },
    ],
    goNoGo: [
      "Technology KPI thresholds met",
      "Business KPI targets achieved",
      "Stakeholder operational approval obtained",
      "Failure mode testing passed",
      "Explainability requirements satisfied",
    ],
    adiApplication: "For the ADI project: Model evaluation is conducted against a predefined scorecard established in Phase I. Business KPIs include: rebooking conversion rate uplift ≥ 15%, no-show prediction accuracy ≥ 80%, personalized recommendation acceptance rate ≥ 40%, and inbound lead response time < 30 seconds. A model that passes technology benchmarks but misses business KPIs does not advance to Phase VI.",
  },
  {
    number: "VI",
    title: "Model Operationalization",
    icon: Rocket,
    color: "border-primary/20 bg-primary/5",
    iconColor: "text-primary",
    badgeColor: "bg-primary/10 text-primary",
    enterpriseOutcome: "We deploy to production under a formal governance framework — with monitoring, maintenance, and iteration roadmaps in place from day one.",
    body: "Deployment is not the finish line — it is the starting point of the intelligence lifecycle. CPMAI Phase VI defines the deployment architecture, continuous monitoring infrastructure, governance ownership structure, and the criteria for initiating the next iteration. An operationalized ADI model that is not continuously monitored will degrade over time as client behavior, market trends, and product formulations evolve. The governance framework established in this phase ensures the model is treated as a living intelligence asset, not a static software release.",
    taskGroups: [
      { title: "Operationalization Plan", tasks: ["Deployment mode selection (cloud, on-premise, hybrid, edge)", "IT integration requirements and API surface definition", "Hybrid non-cognitive components (frontend apps, dashboards, automation workflows)"] },
      { title: "Monitoring & Maintenance", tasks: ["Continuous monitoring approach and tooling selection", "Model drift detection protocols", "Retraining trigger thresholds and cadence"] },
      { title: "Governance Framework", tasks: ["Ownership structure and accountable stakeholders", "Model governance policy documentation", "Response protocols for model errors, bias events, or compliance violations"] },
      { title: "Next Iteration Planning", tasks: ["Post-mortem review: what worked, what didn't", "Scope definition for next training iteration", "Resource requirements for iteration continuity"] },
    ],
    goNoGo: null,
    adiApplication: "For the ADI project: The model is deployed via a secure cloud architecture with API endpoints consumed by client-facing applications (booking interfaces, AI concierge, analytics dashboards). A real-time monitoring layer tracks model output quality against live KPI data. The governance framework designates Inner G Complete as the model steward with quarterly review cycles and defined escalation paths for compliance events.",
  },
]

export default function CognitiveArchitectureBlueprint() {
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
              "@id": "https://innergcomplete.com/insights/cognitive-architecture-blueprint"
            },
            "headline": "Cognitive Architecture Blueprint | Technical View | Inner G Complete",
            "description": "The fundamental engineering blueprint for transitioning a wellness enterprise from traditional systems to advanced sovereign AI.",
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
      <BreadcrumbSchema slug="cognitive-architecture-blueprint" title="Cognitive Architecture Blueprint | Technical View | Inner G Complete" />
      <Navbar />

      <article className="relative flex-1">
        {/* Progress Bar */}
        <div className="fixed top-20 left-0 w-full h-1 bg-secondary z-50">
          <div className="h-full bg-primary w-full" />
        </div>

        {/* Hero */}
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
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Technical Brief</span>
            </div>

            <ExecutiveSummary data={{"problem":"High failure rate (85%) of ad-hoc, un-governed AI deployments in enterprise wellness.","requirement":"Hierarchical blueprint following the PMI-CPMAI methodology across six phases.","roi":"Elimination of non-viable AI spend through strict Go/No-Go feasibility decision gates.","solution":"Tiered Foundation-Signal-Execution architecture providing institutional auditability."}} />
            <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-6xl md:text-7xl uppercase italic leading-[0.95] mb-8">
              The Cognitive{" "}
              <span className="text-primary">Architecture</span>{" "}
              Blueprint
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed font-medium text-balance mb-4">
              How Inner G Complete applies the PMI Cognitive Project Management for AI (CPMAI) framework to architect the Aesthetic Domain Intelligence model — a governance-first methodology for building institutional-grade AI that survives enterprise due diligence.
            </p>
            <p className="text-sm font-bold text-primary uppercase tracking-widest mb-8">
              CPMAI is the PMI-certified standard for AI project governance. This is how we use it.
            </p>

            <div className="flex flex-wrap items-center gap-4 mb-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <Shield className="h-3 w-3" /> Governance Framework
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <BookOpen className="h-3 w-3" /> PMI-CPMAI Aligned
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/20 px-4 py-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                <Clock className="h-3 w-3" /> 20 min read
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/20 px-4 py-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                April 13, 2026
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
                <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-border" aria-label="Share article">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-border" aria-label="Print article">
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
              src="/cpmai_framework_cover.png"
              alt="CPMAI six-phase cognitive architecture framework"
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
              The differentiator between an AI system that survives enterprise procurement and one that gets cancelled in legal review is not the model architecture — it is the governance methodology behind it. Inner G Complete adopts the <strong>PMI Cognitive Project Management for AI (CPMAI)</strong> framework as the operational standard for every ADI engagement. This brief explains what CPMAI is, how we apply it across all six phases, and — critically — how it maps to the Aesthetic Domain Intelligence project currently in active development.
            </p>
          </div>

          <StatisticalSignal signals={[{"label":"Project Risk Mitigation","value":"85%","icon":"shield"},{"label":"Governance Tiers","value":"3","icon":"layers"},{"label":"Decision Gates","value":"6","icon":"activity"}]} />

          {/* What is CPMAI */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                What Is CPMAI?
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-6">
              CPMAI is the Project Management Institute&apos;s certified framework for managing AI and cognitive computing projects. It is built on the architecture of CRISP-DM — the industry-standard data science methodology — but extends it with AI-specific governance layers including Trustworthy AI requirements, ethical AI considerations, Go/No-Go decision gates, human-in-the-loop protocols, and a formal Model Operationalization and Governance structure.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-10">
              Where generic project management frameworks treat AI as a software delivery problem, CPMAI treats it as what it actually is: a <strong className="text-foreground">living intelligence asset</strong> that must be designed, validated, governed, and continuously maintained against defined business outcomes.
            </p>

            {/* Phase overview rail */}
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
            <div className="h-1 w-full bg-gradient-to-r from-primary/20 via-primary to-primary/20 rounded-full" />
          </div>

          {/* Living Audit Disclosure */}
          <div className="p-8 rounded-2xl border border-amber-200 bg-amber-50">
            <div className="flex items-start gap-4">
              <Eye className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-700 mb-3">Living Audit Disclosure</p>
                <p className="text-base text-amber-900 leading-relaxed font-medium">
                  This document is the first in a series of public-facing implementation updates for the <strong>Aesthetic Domain Intelligence (ADI)</strong> project. As Inner G Complete moves through each CPMAI phase, we will publish corresponding briefs documenting our decisions, findings, and outcomes. This is &quot;Building in Public&quot; for the enterprise — a real-time portfolio signal of our methodology, rigor, and institutional capability.
                </p>
              </div>
            </div>
          </div>

          {/* The 6 Phases */}
          <div className="space-y-12">
            <div className="flex items-center gap-4 mb-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                The Six CPMAI Phases: Applied to ADI
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium">
              Each phase below is described at two levels: (1) what CPMAI requires in general, and (2) how Inner G Complete applies it specifically to the Grooming, Beauty & Wellness ADI engagement.
            </p>

            {phases.map((phase, index) => (
              <div key={phase.number} className={`rounded-2xl border p-8 hover:shadow-lg transition-all duration-300 ${phase.color}`}>
                {/* Phase Header */}
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-6">
                  <div className="h-16 w-16 rounded-2xl bg-white border border-border flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-2xl font-black text-primary">{phase.number}</span>
                  </div>
                  <div>
                    <span className={`inline-flex text-[9px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-full mb-2 ${phase.badgeColor}`}>
                      CPMAI Phase {phase.number}
                    </span>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground leading-none">{phase.title}</h3>
                  </div>
                </div>

                {/* Enterprise Outcome */}
                <div className="mb-6 pb-6 border-b border-border/50">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">Enterprise Outcome</p>
                  <p className="text-base font-black text-foreground italic">&ldquo;{phase.enterpriseOutcome}&rdquo;</p>
                </div>

                {/* Body */}
                <p className="text-sm text-muted-foreground leading-relaxed font-medium mb-8">{phase.body}</p>

                {/* Task Groups */}
                <div className="mb-8">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-4">Key Task Groups</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {phase.taskGroups.map((group) => (
                      <div key={group.title} className="p-4 rounded-xl bg-white border border-border">
                        <p className="text-[10px] font-black uppercase tracking-wider text-primary mb-3">{group.title}</p>
                        <ul className="space-y-1.5">
                          {group.tasks.map((task) => (
                            <li key={task} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                              {task}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Go/No-Go Gates (if applicable) */}
                {phase.goNoGo && (
                  <div className="mb-8 p-5 rounded-xl bg-foreground/5 border border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">Go/No-Go Decision Gates</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {phase.goNoGo.map((gate) => (
                        <div key={gate} className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <div className="h-2 w-2 rounded-full bg-primary/40 shrink-0" />
                          {gate}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ADI Application */}
                <div className="p-5 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">
                    ADI Project Application — Phase {phase.number}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{phase.adiApplication}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Trustworthy AI Section */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <Lock className="h-5 w-5 text-destructive" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                The Trustworthy AI Layer
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-8">
              CPMAI explicitly mandates a Trustworthy AI framework as a non-negotiable Phase I requirement. Inner G Complete adopts the following five-pillar standard across every ADI engagement:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {[
                { icon: Shield, title: "Regulatory Compliance", desc: "HIPAA/HITECH for all PHI-touching systems. State medical board licensing requirements. FDA cosmetic ingredient standards where applicable. BAA architecture for every enterprise deployment." },
                { icon: Eye, title: "Transparency & Explainability", desc: "Every model recommendation must be traceable to the data inputs that drove it. Clients and end-users receive explainable outputs — not black-box scoring — so that human judgment can always override." },
                { icon: AlertTriangle, title: "Bias Identification & Management", desc: "Training data is audited for demographic, preference, and historical bias before ingestion. Models are tested against underrepresented client segments before any production approval." },
                { icon: XCircle, title: "Failure Mode Engineering", desc: "Every AI system deployed includes formal failure mode documentation: what triggers a failure, how it is detected, how it is surfaced to human oversight, and how it is remediated without client impact." },
                { icon: Lock, title: "Data Source Transparency", desc: "Enterprise clients receive full documentation of every data source in the training corpus, including collection methods, data selection logic, and any exclusions — prior to model operationalization." },
                { icon: RefreshCw, title: "Human-in-the-Loop (HITL)", desc: "All high-stakes decisions (clinical recommendations, PHI handling, client escalations) preserve a human override layer. The AI augments human judgment; it does not replace it in safety-critical workflows." },
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

          {/* What Comes Next */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <RefreshCw className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                What Comes Next: The Living Implementation Series
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed font-medium mb-6">
              This document represents <strong className="text-foreground">Phase 0 of the public ADI architecture record</strong>. As Inner G Complete progresses through each CPMAI phase, we will publish corresponding updates to this series:
            </p>

            <div className="space-y-3 mb-10">
              {[
                { phase: "Phase I Update", title: "ADI Business Case: Objectives, KPIs, and the Go Decision", status: "Upcoming", active: false },
                { phase: "Phase II Update", title: "Data Landscape Audit Results: Our DRS Score and What We Found", status: "Upcoming", active: false },
                { phase: "Phase III Update", title: "Building the Aesthetic Data Pipeline: Our ETL Architecture", status: "Upcoming", active: false },
                { phase: "Phase IV Update", title: "Algorithm Selection & Foundation Model Fine-Tuning Decisions", status: "Upcoming", active: false },
                { phase: "Phase V Update", title: "Model Evaluation: KPI Verification Against Phase I Targets", status: "Upcoming", active: false },
                { phase: "Phase VI Update", title: "Go-Live: Deployment Architecture and Governance Framework", status: "Upcoming", active: false },
              ].map((item) => (
                <div key={item.phase} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-white">
                  <div className="h-2 w-2 rounded-full bg-border shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.phase}</p>
                    <p className="text-sm font-bold text-foreground">{item.title}</p>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground border border-border px-2 py-1 rounded-full">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-base text-muted-foreground leading-relaxed font-medium">
              Enterprise clients who engage with this series receive unfiltered transparency into how a production-grade ADI is actually built — not a marketing deck, but a live architectural record. This is what &quot;institutional signal&quot; looks like in practice.
            </p>
          </div>

          {/* CTA */}
          <div className="p-8 sm:p-12 rounded-3xl bg-foreground text-background relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Shield className="h-48 w-48" />
            </div>
            <div className="relative z-10">
              <div className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-6">
                CPMAI-Governed Engagement
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-tight mb-6">
                Engage a Methodology. <br />Not Just a Team.
              </h2>
              <p className="text-lg opacity-70 mb-10 max-w-xl font-medium leading-relaxed">
                Every Inner G Complete engagement begins with a CPMAI Phase I Business Understanding audit. We don&apos;t quote a build until we can confirm — with evidence — that your project will survive all six gates.
              </p>
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-10 py-7 text-xs font-black uppercase tracking-[0.3em] shadow-xl shadow-primary/20"
                asChild
              >
                <Link href="/#contact">
                  Request Phase I Audit
                  <ArrowRight className="ml-3 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

        </div>
      </article>

      <TechnicalCitations citations={[{"source":"PMI","label":"Cognitive Project Management for AI (CPMAI)","url":"https://www.pmi.org"},{"source":"NIST","label":"AI Risk Management Framework (RMF 1.0)","url":"https://www.nist.gov/itl/ai-risk-management-framework"},{"source":"ISO/IEC","label":"42001:2023 AI Management Systems","url":"https://www.iso.org/standard/81230.html"},{"source":"Google Research","label":"Monk Skin Tone Scale (MST) Standards","url":"https://skintone.google"}]} />

          <FAQSection faqs={[{"question":"What are the three tiers of the ADI architecture?","answer":"Tier 1 is the Operational Foundation (raw booking data); Tier 2 is the Signal Layer (behavioral and sentiment fingerprints); Tier 3 is the Intelligence Layer (autonomous decision-making and execution)."},{"question":"Is this architecture HIPAA compliant?","answer":"Yes. By following CPMAI governance, we architect PHI isolation protocols that ensure sensitive data is protected while still fueling the intelligence model."}]} />
      <AuthorBio />
      <Footer />
    </main>
  )
}
