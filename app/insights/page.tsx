"use client"

import { useState, useMemo } from "react"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { ArrowRight, Clock, BookOpen, Search, Filter, Brain } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

function GlowOrb({ className }: { className: string }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
      aria-hidden="true"
    />
  )
}

const reports = [
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
  const [activeCategory, setActiveCategory] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesCategory = activeCategory === "All" || report.category === activeCategory
      const matchesSearch = report.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           report.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [activeCategory, searchQuery])

  const featuredReport = useMemo(() => {
    // Only show the featured section on the "All" view with no search
    if (activeCategory !== "All" || searchQuery) return null
    return reports.find(r => r.featured)
  }, [activeCategory, searchQuery])

  const displayedReports = useMemo(() => {
    // When showing the featured section on the "All" view, exclude it from the grid
    if (featuredReport && activeCategory === "All" && !searchQuery) {
      return filteredReports.filter(r => r.slug !== featuredReport.slug)
    }
    return filteredReports
  }, [filteredReports, featuredReport, activeCategory, searchQuery])

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
              strategic intersection of Aesthetic Intelligence, AI, and Blockchain.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="relative flex-1 py-24 bg-secondary/5">
        <div className="mx-auto max-w-7xl px-6">
          
          {/* Controls - Search/Filter */}
          <div className="mb-16 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3 overflow-x-auto pb-4 sm:pb-0 w-full sm:w-auto scrollbar-hide">
              {categories.map((cat) => (
                <button 
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap rounded-xl px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-all border ${activeCategory === cat ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" : "bg-white text-muted-foreground border-border hover:border-primary/50 hover:text-foreground shadow-sm"}`}
                >
                  {cat === "All" ? cat : cat + "s"}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search research library..." 
                className="w-full bg-white border border-border rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 shadow-sm transition-all"
              />
            </div>
          </div>

          {/* Featured Report (Only show when not searching and category is All) */}
          {featuredReport && (
            <div className="mb-20">
              <Link 
                href={`/insights/${featuredReport.slug}`}
                className="group relative block overflow-hidden rounded-3xl glass-panel border-border/50 p-8 sm:p-16 transition-all duration-500 hover:border-primary/50 shadow-sm hover:shadow-xl bg-white"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                
                <div className="relative z-10 grid gap-16 lg:grid-cols-2 lg:items-center">
                  <div>
                    <div className="flex items-center gap-4 mb-8">
                      <span className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary">
                        {featuredReport.category}
                      </span>
                      <span className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        <Clock className="h-4 w-4" />
                        {featuredReport.readingTime}
                      </span>
                    </div>
                    <h2 className="text-4xl font-black tracking-tight text-foreground sm:text-6xl group-hover:text-primary transition-colors leading-[1.1] uppercase italic">
                      {featuredReport.title}
                    </h2>
                    <p className="mt-8 text-lg text-muted-foreground leading-relaxed font-medium">
                      {featuredReport.excerpt}
                    </p>
                    <div className="mt-10 flex flex-wrap items-center gap-6">
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-3 px-8 py-7 text-sm font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 transition-transform active:scale-95">
                        Expand Research
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <span className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">{featuredReport.date}</span>
                    </div>
                  </div>
                  <div className="hidden lg:block relative aspect-square rounded-2xl overflow-hidden bg-secondary/20 border border-border group-hover:border-primary/30 transition-colors">
                     <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-accent/10 sm:scale-110 group-hover:scale-100 transition-transform duration-700" />
                     <div className="absolute inset-0 flex items-center justify-center p-12">
                        <Brain className="h-40 w-40 text-primary/20 group-hover:scale-110 transition-transform duration-500" />
                     </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Regular Reports Grid */}
          {displayedReports.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {displayedReports.map((report) => (
                <Link 
                  key={report.slug}
                  href={`/insights/${report.slug}`}
                  className="group flex flex-col rounded-2xl glass-panel bg-white p-8 transition-all duration-300 border-border/50 hover:border-primary/50 hover:shadow-xl hover:scale-[1.02]"
                >
                  <div className="mb-8 flex items-center justify-between border-b border-border/50 pb-6">
                    <span className="rounded-lg bg-secondary/50 border border-border/5) px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-colors">
                      {report.category}
                    </span>
                    <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.1em]">{report.date}</span>
                  </div>
                  <h3 className="text-2xl font-black text-foreground group-hover:text-primary transition-colors leading-tight uppercase italic mb-4">
                    {report.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground flex-1 font-medium">
                    {report.excerpt}
                  </p>
                  <div className="mt-10 flex items-center justify-between pt-6 border-t border-border/30">
                    <span className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                      <Clock className="h-3.5 w-3.5" />
                      {report.readingTime}
                    </span>
                    <span className="text-[10px] font-black text-primary flex items-center gap-2 group-hover:translate-x-2 transition-transform uppercase tracking-[0.2em]">
                      Brief <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <div className="inline-block p-4 rounded-full bg-secondary/50 mb-6">
                 <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground">No matching research found</h3>
              <p className="text-muted-foreground mt-2">Try adjusting your filters or search keywords.</p>
              <Button 
                variant="link" 
                onClick={() => { setActiveCategory("All"); setSearchQuery(""); }}
                className="mt-4 text-primary font-bold"
              >
                Clear all filters
              </Button>
            </div>
          )}

          {/* Pagination or Load More */}
          {displayedReports.length > 0 && (
            <div className="mt-24 text-center">
              <Button variant="outline" size="lg" className="border-border text-foreground hover:bg-white hover:border-primary/30 px-12 py-7 font-black uppercase tracking-[0.3em] text-xs transition-all shadow-sm">
                Load Archive
              </Button>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}
