"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Brain, MapPin, BarChart3, GraduationCap, LayoutDashboard, Target, ArrowRight, Shield } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const solutions = [
  {
    title: "Texas Barber Exam Intelligence Deck",
    label: "Interactive Exam Tool",
    description: "Test your knowledge with real state board questions. Our AI will instantly predict your chances of passing the exam.",
    icon: Brain,
    href: "/tools/texas-barber-exam-practice-deck",
    roles: ["School Students"]
  },
  {
    title: "Texas Barber Instructor Intelligence Dashboard",
    label: "Teacher Dashboard",
    description: "A simple dashboard for instructors to see how their students are doing. Spot struggling students early and help them pass.",
    icon: LayoutDashboard,
    href: "/tools/texas-barber-instructor-intelligence-dashboard",
    roles: ["School Instructors", "School Administrators"]
  },
  {
    title: "Texas Barbershop Placement Matcher & Agent",
    label: "Job Placement Tool",
    description: "Help your graduates find jobs quickly. Our tool maps over 35,000 local shops and automatically sends out text messages to set up interviews.",
    icon: MapPin,
    href: "/texas-barbershop-placement-matcher",
    roles: ["School Students", "School Administrators"]
  },
  {
    title: "Texas Barber School Benchmarking Intelligence",
    label: "School Comparison Tool",
    description: "Compare your school against local competitors. Easily view tuition costs, graduate earnings, and federal student aid data.",
    icon: BarChart3,
    href: "/texas-school-benchmarking",
    roles: ["School Administrators"]
  },
  {
    title: "Texas Barber School Historical Performance Tracker",
    label: "Pass Rate Tracker",
    description: "Look at decades of past state board exam results. Find out exactly where students struggle the most so you can improve your lesson plans.",
    icon: Target,
    href: "/texas-barber-school-historical-performance",
    roles: ["School Administrators", "School Instructors"]
  },
  {
    title: "Texas Barber & Cosmetology Continuing Education Portal",
    label: "Education Portal",
    description: "Say goodbye to boring PDFs. Generate custom, interactive continuing education courses based entirely on your specific specialty.",
    icon: GraduationCap,
    href: "/barber-cos-continuing-education",
    roles: ["School Students", "School Instructors"]
  },
]

export default function AISolutionsPage() {
  const { setTheme } = useTheme();
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  const filterOptions = ["All", "School Administrators", "School Instructors", "School Students"];

  const filteredSolutions = solutions.filter(s => 
    activeFilter === "All" || s.roles.includes(activeFilter)
  );

  return (
    <main className="min-h-screen bg-white text-slate-950 flex flex-col light selection:bg-primary/20">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden flex-1">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0 opacity-50 bg-[url('/aesthetic-intelligence-bg.png')] bg-cover bg-center bg-no-repeat" 
          aria-hidden="true"
        />
        {/* Light Overlay */}
        <div className="absolute inset-0 z-0 bg-white/60 backdrop-blur-[2px]" aria-hidden="true" />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[800px] rounded-full bg-primary/10 blur-3xl pointer-events-none z-0" aria-hidden="true" />
        
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 text-center">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-primary mb-4">
            Interactive Prototypes
          </p>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground text-balance">
            Experience the Power of <br className="hidden sm:block" />
            <span className="text-primary mt-2 inline-block">Aesthetic Intelligence</span>
          </h1>
          <p className="mx-auto mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed px-2 sm:px-0">
            Try out our tools for yourself. Click below to interact with our live dashboards, exam simulators, and job placement matchers designed specifically for barber and cosmetology schools.
          </p>
        </div>
      </section>

      {/* Solutions Grid */}
      <section className="relative pb-20 sm:pb-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          
          {/* Filter Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {filterOptions.map((option) => (
              <button
                key={option}
                onClick={() => setActiveFilter(option)}
                className={`px-4 py-2 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
                  activeFilter === option 
                    ? "bg-primary text-primary-foreground shadow-lg scale-105 border border-primary" 
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 border border-slate-200"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredSolutions.map((solution) => (
              <div
                key={solution.title}
                className="group relative flex flex-col justify-between rounded-2xl glass-panel p-8 transition-all duration-300 hover:border-primary/30 hover:bg-secondary/30"
              >
                <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />
                
                <div className="relative z-10 flex flex-col h-full">
                  <div>
                    <div className="mb-6 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                      <solution.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{solution.title}</h3>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-primary/70">
                      {solution.label}
                    </p>
                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                      {solution.description}
                    </p>
                  </div>

                  <div className="mt-8 mt-auto pt-8">
                    <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-primary gap-2">
                      <Link href={solution.href}>
                        Launch Model
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
