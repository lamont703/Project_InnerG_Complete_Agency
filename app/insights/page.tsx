import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import dynamic from "next/dynamic"
import { BookOpen } from "lucide-react"
import { Suspense } from "react"

const InsightsList = dynamic(() => import("@/components/insights/insights-list").then(mod => mod.InsightsList), {
  ssr: true,
})

function GlowOrb({ className }: { className: string }) {
  return (
    <div
      className={`absolute rounded-full blur-2xl pointer-events-none opacity-50 ${className}`}
      aria-hidden="true"
    />
  )
}

const reports = [
  {
    slug: "texas-barber-licensure-crisis",
    title: "The Texas Barber Licensure Crisis: A $15M Institutional Risk Analysis",
    excerpt: "Texas barber schools are facing a 'Licensure Cliff' with written fail rates exceeding 45% in major metros. An audit of why school accreditation is at risk and how the Texas ADI Pilot is architected to defend it.",
    date: "April 20, 2026",
    readingTime: "18 min read",
    category: "Industry Report",
    featured: true,
  },
  {
    slug: "barber-education-intelligence-roi",
    title: "Overcoming the Blockade: Barber Education Intelligence",
    excerpt: "Barber students invest $16,800+ into an education that prepares them physically but repeatedly fails them theoretically. A definitive ROI analysis on the Cognitive RAG solution to guarantee licensure velocity.",
    date: "April 19, 2026",
    readingTime: "16 min read",
    category: "Industry Report",
    featured: true,
  },
  {
    slug: "the-sovereign-intelligence-layer",
    title: "The Sovereign Intelligence Layer: Why ADI Wins",
    excerpt: "The enterprise that builds a proprietary Artificial Domain Intelligence doesn't just win market share—it becomes the industry standard that everyone else licenses.",
    date: "April 13, 2026",
    readingTime: "14 min read",
    category: "Strategic View",
    featured: true,
  },
  {
    slug: "mindbody-sovereign-intelligence-audit",
    title: "MindBody's Intelligence Ceiling",
    excerpt: "A platform audit of why MindBody's 700-integration architecture is generating data without generating intelligence — and how a sovereign AI layer changes everything.",
    date: "April 14, 2026",
    readingTime: "24 min read",
    category: "Strategic View",
  },
  {
    slug: "abc-fitness-sovereign-intelligence-audit",
    title: "ABC Fitness's Intelligence Ceiling",
    excerpt: "ABC Fitness built the operational backbone for enterprise gym networks. But managing members is not the same as understanding them. A strategic audit of the intelligence gap at the heart of the world's largest fitness platform.",
    date: "April 14, 2026",
    readingTime: "22 min read",
    category: "Strategic View",
  },
  {
    slug: "thecut-sovereign-intelligence-audit",
    title: "theCut's Intelligence Ceiling",
    excerpt: "theCut processed over $2 billion in barber transactions and became the most trusted booking platform in Black and Brown barbershop culture. A strategic audit of what the model that doesn't exist yet would change for every professional on the platform.",
    date: "April 14, 2026",
    readingTime: "22 min read",
    category: "Strategic View",
  },
  {
    slug: "booksy-sovereign-intelligence-audit",
    title: "Booksy's Intelligence Ceiling",
    excerpt: "Booksy processes $10B+ in annual GMV across 140,000 global businesses and 40 million consumers. A strategic audit of the intelligence layer that this data is ready to support — and why the platform that builds it first defines the category that comes after booking.",
    date: "April 14, 2026",
    readingTime: "24 min read",
    category: "Strategic View",
  },
  {
    slug: "rebooking-intelligence-pilot",
    title: "Rebooking Appointment Intelligence: Barber Grooming ADI Pilot",
    excerpt: "A CPMAI-governed pilot architecture for deploying an ADI model that autonomously keeps a barber's calendar full, maintains a floor revenue target per chair, and drives retention through precision-timed client engagement — without changing the barber's daily workflow.",
    date: "April 14, 2026",
    readingTime: "26 min read",
    category: "Technical Brief",
  },
  {
    slug: "cognitive-architecture-blueprint",
    title: "The Cognitive Architecture Blueprint: Delivering Institutional-Grade AI with CPMAI",
    excerpt: "How Inner G Complete applies the PMI-certified CPMAI framework across all six phases to architect the Aesthetic Domain Intelligence model — governance-first, enterprise-ready.",
    date: "April 13, 2026",
    readingTime: "20 min read",
    category: "Methodology",
  },
  {
    slug: "cognitive-feedstock-15-data-sources",
    title: "Cognitive Feedstock: 15 Data Sources for Aesthetic AI",
    excerpt: "Moving beyond simple booking lists to tap into high-fidelity data that captures the 'human' element of wellness and grooming.",
    date: "April 12, 2026",
    readingTime: "15 min read",
    category: "Technical Brief",
  },
  {
    slug: "the-feasibility-premium",
    title: "The Feasibility Premium: Starting with 'No'",
    excerpt: "Why the most successful AI projects in wellness and grooming begin with a ruthless viability audit, not a dev sprint.",
    date: "April 12, 2026",
    readingTime: "10 min read",
    category: "Strategic View",
  },
  {
    slug: "autonomous-concierge-roi-analysis",
    title: "Autonomous Concierge: ROI Analysis",
    excerpt: "Quantifying the economic impact of AI-driven booking agents on clinical throughput and client retention.",
    date: "April 12, 2026",
    readingTime: "15 min read",
    category: "Industry Report",
  },
]

const categories = ["All", "Industry Report", "Technical Brief", "Strategic View", "Methodology"]

export default function InsightsPage() {
  return (
    <main className="min-h-screen bg-background light text-foreground flex flex-col pt-20">
      <Navbar />

      {/* Header Section */}
      <section className="relative py-20 sm:py-32 overflow-hidden border-b border-border/50">
        <GlowOrb className="top-1/4 -left-32 h-96 w-96 bg-primary/10 animate-float" />
        <GlowOrb className="bottom-1/4 -right-32 h-80 w-80 bg-primary/5 animate-float-delayed" />
        
        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full glass-panel px-4 py-1.5 border border-primary/20">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase">Institutional Research</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-foreground sm:text-7xl uppercase italic leading-none">
              Research & <span className="text-primary">Insights</span>
            </h1>
            <p className="mt-8 text-xl text-muted-foreground leading-relaxed text-balance font-medium">
              We architect the cognitive infrastructures of the future. Our research maps the 
              strategic intersection of Aesthetic Intelligence™, AI, and Blockchain.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="relative flex-1 py-24 bg-secondary/5">
        <Suspense fallback={
          <div className="mx-auto max-w-7xl px-6 py-20 text-center text-muted-foreground">
            Synchronizing research database...
          </div>
        }>
          <InsightsList reports={reports} />
        </Suspense>
      </section>

      <Footer />
    </main>
  )
}
