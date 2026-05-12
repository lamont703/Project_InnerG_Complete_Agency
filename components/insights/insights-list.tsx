"use client"

import { useState, useMemo } from "react"
import { Search, Clock, BookOpen, ArrowRight } from "lucide-react"
import Link from "next/link"

const categories = ["All", "Industry Report", "Technical Brief", "Strategic View", "Methodology"]

interface Report {
  slug: string
  title: string
  excerpt: string
  date: string
  readingTime: string
  category: string
  featured?: boolean
}

interface InsightsListProps {
  reports: Report[]
}

export function InsightsList({ reports }: InsightsListProps) {
  const [activeCategory, setActiveCategory] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesCategory = activeCategory === "All" || report.category === activeCategory
      const matchesSearch = report.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           report.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [activeCategory, searchQuery, reports])

  const featuredReport = useMemo(() => {
    if (activeCategory !== "All" || searchQuery) return null
    return reports.find(r => r.featured)
  }, [activeCategory, searchQuery, reports])

  const displayedReports = useMemo(() => {
    if (featuredReport && activeCategory === "All" && !searchQuery) {
      return filteredReports.filter(r => r.slug !== featuredReport.slug)
    }
    return filteredReports
  }, [filteredReports, featuredReport, activeCategory, searchQuery])

  return (
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
            aria-label="Search research articles"
            placeholder="Search research library..." 
            className="w-full bg-white border border-secondary rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 shadow-sm transition-all"
          />
        </div>
      </div>

      {/* Featured Report */}
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
                    Featured Research
                  </span>
                  <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <Clock className="h-3 w-3" /> {featuredReport.readingTime}
                  </span>
                </div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter text-foreground sm:text-6xl mb-8 group-hover:text-primary transition-colors leading-[0.95]">
                  {featuredReport.title}
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed mb-10 font-medium">
                  {featuredReport.excerpt}
                </p>
                <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
                  Read Technical Brief <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
              <div className="hidden lg:block relative aspect-square rounded-2xl overflow-hidden border border-border/50 bg-secondary/10">
                <div className="absolute inset-0 flex items-center justify-center p-12">
                   <BookOpen className="w-full h-full text-primary/10" />
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Grid */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {displayedReports.map((report) => (
          <Link 
            key={report.slug}
            href={`/insights/${report.slug}`}
            className="group flex flex-col rounded-3xl border border-border/50 bg-white p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="rounded-lg bg-secondary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {report.category}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <Clock className="h-3 w-3" /> {report.readingTime}
              </span>
            </div>
            <h3 className="mb-4 text-xl font-black uppercase italic tracking-tighter text-foreground group-hover:text-primary transition-colors leading-tight">
              {report.title}
            </h3>
            <p className="mb-8 flex-1 text-sm leading-relaxed text-muted-foreground font-medium">
              {report.excerpt}
            </p>
            <div className="flex items-center justify-between border-t border-border pt-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{report.date}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary group-hover:gap-2 transition-all">
                Full Report <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
