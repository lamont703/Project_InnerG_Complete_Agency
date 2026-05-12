import type { Metadata } from "next"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { 
  BookOpen, 
  Brain, 
  ShieldCheck, 
  Database, 
  Zap, 
  Lock, 
  Target, 
  Activity, 
  Layers, 
  FileText 
} from "lucide-react"

const terms = [
  {
    term: "Artificial Domain Intelligence (ADI)",
    definition: "A proprietary, industry-specific AI model trained on deep-vertical data. Unlike generic foundation models, an ADI is calibrated for a specific domain—such as grooming or medical aesthetics—and serves as a sovereign institutional asset owned by the enterprise.",
    icon: Brain,
  },
  {
    term: "Sovereign Intelligence Layer",
    definition: "A 'headless' AI architecture that functions independently on top of legacy platforms (MindBody, Booksy, etc.). It allows enterprises to maintain ownership of their predictive logic, client behavioral data, and institutional intelligence regardless of the master platform they use.",
    icon: Layers,
  },
  {
    term: "CPMAI Governance",
    definition: "Cognitive Project Management for AI. An industry-standard six-phase methodology for managing AI initiatives. It prioritizes business understanding, data readiness, and ethical checkpoints to ensure AI projects deliver actual ROI and maintain clinical safety.",
    icon: ShieldCheck,
  },
  {
    term: "Cognitive Feedstock",
    definition: "The 15+ specialized data categories (booking history, intake forms, technical formulas, employee performance) required to train an AI model to operate with genuine domain competence in the wellness and aesthetic sector.",
    icon: Database,
  },
  {
    term: "Intelligence Ceiling",
    definition: "The performance limit of generic SaaS platforms. Once an enterprise reaches this ceiling, they can no longer optimize for higher LTV or retention without a custom intelligence layer that interprets behavioral patterns the platform ignores.",
    icon: Target,
  },
  {
    term: "Human-in-the-Loop (HITL)",
    definition: "A non-negotiable architectural protocol where AI-generated recommendations are validated by a licensed professional before execution. This ensures brand safety and clinical accuracy in high-stakes aesthetic environments.",
    icon: Activity,
  },
  {
    term: "PHI Isolation Architecture",
    definition: "A HIPAA-compliant data pattern that separates Protected Health Information (PHI) from general behavioral flows. This enables advanced AI model training on anonymized signals while maintaining rigorous regulatory safety standards.",
    icon: Lock,
  },
  {
    term: "Rebooking Intelligence",
    definition: "A specific predictive model that analyzes historical client behavior to forecast churn risk and autonomously triggers re-engagement sequences at the precise moment of highest rebooking probability.",
    icon: Zap,
  },
  {
    term: "Feasibility Premium",
    definition: "The strategic value (cost avoidance and certainty) gained by conducting a CPMAI data audit before committing development capital. It ensures that AI projects are only built on verified, high-quality data foundations.",
    icon: FileText,
  },
  {
    term: "Aesthetic Outcome Quantification",
    definition: "The process of using structured data and computer vision to move treatment measurements from subjective stylist notes to objective, machine-readable indicators of success and clinical progression.",
    icon: BookOpen,
  }
]

export const metadata: Metadata = {
  title: "Technical Glossary | Artificial Domain Intelligence | Inner G Complete",
  description: "Official definitions for the core entities of the ADI and CPMAI framework — defining the future of sovereign intelligence in grooming and wellness.",
  alternates: {
    canonical: "https://innergcomplete.com/glossary",
  },
}

export default function GlossaryPage() {
  const glossarySchema = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "name": "ADI & CPMAI Technical Glossary",
    "description": "Definitions for sovereign intelligence entities in the wellness and grooming sectors.",
    "hasDefinedTerm": terms.map((t) => ({
      "@type": "DefinedTerm",
      "name": t.term,
      "description": t.definition
    }))
  }

  return (
    <main className="min-h-screen bg-background light text-foreground flex flex-col pt-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(glossarySchema) }}
      />
      <Navbar />

      {/* Hero */}
      <section className="relative py-24 border-b border-border/50 overflow-hidden">
        <div className="absolute top-0 right-0 p-32 opacity-10 blur-3xl bg-primary/20 rounded-full" />
        <div className="mx-auto max-w-5xl px-6 relative z-10">
          <div className="mb-8">
            <span className="text-xs font-black uppercase tracking-[0.4em] text-primary">Intelligence Repository</span>
            <h1 className="mt-4 text-5xl font-black uppercase italic tracking-tighter text-foreground sm:text-7xl leading-[0.9]">
              Technical <span className="text-primary">Glossary</span>
            </h1>
          </div>
          <p className="text-xl text-muted-foreground leading-relaxed font-medium max-w-2xl">
            Defining the entities and architectural principles of the **Artificial Domain Intelligence (ADI)** foundation. High-fidelity reference for enterprise operators and AI architects.
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="py-24 bg-secondary/5">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-6 md:grid-cols-2">
            {terms.map((t) => (
              <div 
                key={t.term}
                id={t.term.toLowerCase().replace(/\s+/g, '-')}
                className="p-8 rounded-3xl border border-border bg-white hover:border-primary/30 hover:shadow-xl transition-all duration-300 group"
              >
                <div className="h-12 w-12 rounded-xl bg-secondary/30 flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                  <t.icon className="h-6 w-6 text-foreground group-hover:text-primary transition-colors" />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight text-foreground mb-4">
                  {t.term}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                  {t.definition}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
