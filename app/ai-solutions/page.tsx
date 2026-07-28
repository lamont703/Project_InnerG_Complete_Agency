"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Navbar } from "@/components/layout/navbar"
import { Brain, BarChart3, GraduationCap, LayoutDashboard, ArrowRight, Shield, Users, Calendar, Globe, Armchair, Radar, ClipboardList, Scale } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const solutions = [
  {
    title: "Barbershop & Salon Comparison Tool",
    label: "Booth Rent & Chair Comparison",
    description: "Compare shops and salons side by side on booth rent, chairs available, ratings and who's hiring — then drill into any city to see what a chair actually costs before you commit.",
    icon: Scale,
    href: "/compare-shops",
    roles: ["Barbers & Stylists", "Shop Owners"]
  },
  {
    title: "Barber & Cosmetology School Comparison Tool",
    label: "Exam Pass Rate Comparison",
    description: "Tuition tells you what a school costs; pass rates tell you whether it works. Compare schools on real 2026 written and practical exam outcomes, city by city.",
    icon: Scale,
    href: "/compare-schools",
    roles: ["School Students", "School Administrators"]
  },
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
    title: "Texas Barber & Cosmetology School Leaderboard",
    label: "School Comparison Tool",
    description: "Compare schools by real 2026 licensing exam outcomes — pass rates, first-attempt success, and retest burden, not just a raw score.",
    icon: BarChart3,
    href: "/texas-school-leaderboard",
    roles: ["School Students", "School Administrators", "School Instructors"]
  },
  {
    title: "Texas Barber & Cosmetology Continuing Education Portal",
    label: "Education Portal",
    description: "Say goodbye to boring PDFs. Generate custom, interactive continuing education courses based entirely on your specific specialty.",
    icon: GraduationCap,
    href: "/barber-cos-continuing-education",
    roles: ["School Students", "School Instructors"]
  },
  {
    title: "Barber & Cosmetology Placement Network",
    label: "Career Passport & Placement",
    description: "Create a digital Career Passport showcasing your portfolio and licensure, or list open chairs and booth availability as a shop owner — direct connections, no cold calling.",
    icon: Users,
    href: "/barber-beauty-network",
    roles: ["Shop Owners", "Barbers & Stylists", "School Students"]
  },
  {
    title: "Shop Day Matches",
    label: "Live Matching",
    description: "See real, live-matched shop day visit requests between students and shops in one place.",
    icon: Users,
    href: "/shop-day-matches",
    roles: ["Shop Owners", "Barbers & Stylists"]
  },
  {
    title: "Shop Day Requests",
    label: "Visit Requests",
    description: "Browse and manage real shop day visit requests from students looking to gain hands-on experience.",
    icon: Calendar,
    href: "/shop-day-requests",
    roles: ["Shop Owners", "Barbers & Stylists"]
  },
  {
    title: "Shop Website Template",
    label: "Live Demo",
    description: "See a live, real example of a fully-built shop website — the same template every claimed shop can customize as their own.",
    icon: Globe,
    href: "/tools/shop-site-template/buzzardsbarbershop",
    roles: ["Shop Owners"]
  },
  {
    title: "AI Booth Station",
    label: "Operational Dashboard",
    description: "A live operational dashboard for booth-rent shops — track chair status, payments, and booth availability in real time.",
    icon: Armchair,
    href: "/tools/ai-booth-station",
    roles: ["Shop Owners"]
  },
  {
    title: "Foot Traffic Radar",
    label: "Competitive Intelligence",
    description: "Explore competitive intelligence and real local foot-traffic data for barbershops across the network — find the right chair with data-backed confidence.",
    icon: Radar,
    href: "/tools/foot-traffic-radar",
    roles: ["Shop Owners"]
  },
  {
    title: "Texas Cosmetology Exam Intelligence Deck",
    label: "Interactive Exam Tool",
    description: "Practice questions aligned to the PSI written exam — the same vendor TDLR contracts to administer the real Cosmetology Operator license test.",
    icon: Brain,
    href: "/tools/texas-cosmetology-exam-practice-deck",
    roles: ["School Students"]
  },
  {
    title: "Accreditation Relationship Auditor",
    label: "Institutional Compliance",
    description: "An institutional relationship auditor tracking your school's real accreditation and compliance standing over time.",
    icon: Shield,
    href: "/tools/texas-barber-school-accreditation-relationship-auditor",
    roles: ["School Administrators"]
  },
  {
    title: "Barber School Pilot Scholarship Fund",
    label: "Free Exam Prep Access",
    description: "Free board-exam prep access for your students at zero cost to your school — see if your school qualifies for the pilot fund.",
    icon: GraduationCap,
    href: "/barber-school-pilot-scholarship-fund",
    roles: ["School Administrators", "School Students"]
  },
  {
    title: "Texas Barber Practical Exam Kit List",
    label: "Exam Kit Checklist",
    description: "The exact tool and product kit list required for the Texas barber practical licensing exam.",
    icon: ClipboardList,
    href: "/texas-barber-practical-exam-kit-list",
    roles: ["School Students"]
  },
  {
    title: "Texas Cosmetology Practical Exam Kit List",
    label: "Exam Kit Checklist",
    description: "The exact tool and product kit list required for the Texas Cosmetology Operator practical licensing exam.",
    icon: ClipboardList,
    href: "/texas-cosmetology-practical-exam-kit-list",
    roles: ["School Students"]
  },
]

export default function AISolutionsPage() {
  const { setTheme } = useTheme();
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  const filterOptions = ["All", "Shop Owners", "Barbers & Stylists", "School Administrators", "School Instructors", "School Students"];

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

    </main>
  )
}
