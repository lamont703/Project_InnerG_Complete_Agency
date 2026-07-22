import { Navbar } from "@/components/layout/navbar"
import dynamic from "next/dynamic"
import { BookOpen } from "lucide-react"
import { Suspense } from "react"
import { insightsArticles, insightsCategories } from "@/lib/insights-articles"

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
          <InsightsList reports={insightsArticles} />
        </Suspense>
      </section>

    </main>
  )
}
