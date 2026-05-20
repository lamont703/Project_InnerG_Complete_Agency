"use client"

import { Brain, Blocks, Rocket, Shield, Cpu, BarChart3, Database, Zap, LineChart, Users, ChessKnight, LayoutDashboard } from "lucide-react"

const services = [
  {
    icon: Brain,
    title: "Exam Pass Predictor",
    description:
      "Stop waiting for state board results. Our AI tracks student practice data and flags who is at risk of failing 30 days before the exam.",
    highlights: ["Early Warnings", "Pass Predictions", "Automated Tutoring"],
  },
  {
    icon: Users,
    title: "Auto Job Placement",
    description:
      "Keep your placement rates high. Our AI maps 35,000+ local shops and automatically texts owners to set up job interviews for your graduates.",
    highlights: ["60% Placement", "Automated Interviews", "Local Shop Maps"],
  },
  {
    icon: BarChart3,
    title: "ROI & Debt Tracking",
    description:
      "Prove your school's value. We pull federal financial aid data to show how your tuition costs and graduate salaries compare to local competitors.",
    highlights: ["Title-IV Data", "Graduate Salaries", "Default Rates"],
  },
  {
    icon: Zap,
    title: "24/7 AI Admissions",
    description:
      "Stop losing students who drop off your website. Our AI texts interested students instantly, answers financial aid questions, and drives enrollments.",
    highlights: ["Lead Recovery", "Text Messaging", "24/7 Support"],
  },
  {
    icon: Shield,
    title: "Automated Compliance",
    description:
      "Never stress over a NACCAS or ACCSC audit again. We automatically track and prove your exact graduation, placement, and licensure rates.",
    highlights: ["NACCAS Ready", "Instant Audits", "Title-IV Tracking"],
  },
  {
    icon: Blocks,
    title: "Adaptive Lesson Plans",
    description:
      "Don't teach the same lesson twice. Our AI analyzes what your current students are struggling with and adjusts next week's syllabus automatically.",
    highlights: ["Smart Syllabi", "Cohort Tracking", "Adaptive Teaching"],
  },
]

export function ServicesSection() {
  return (
    <section id="services" className="relative py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-primary mb-4 flex items-center justify-center gap-2">
            Artificial Domain Intelligence
            <span className="text-[8px] opacity-70">[Proprietary]</span>
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
            Engineered for Trade Schools
          </h2>
          <p className="mx-auto mt-8 max-w-3xl text-lg text-muted-foreground leading-relaxed font-medium">
            We partner with a selective cohort of Barber and Cosmetology Schools to build 
            the cognitive infrastructure required for NACCAS/ACCSC compliance and market dominance.
          </p>
        </div>

        {/* Grid */}
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.title}
              className={`group relative rounded-2xl glass-panel p-8 transition-all duration-300 hover:border-primary/30 hover:bg-secondary/30 ${service.title === "Exam Pass Predictor" ? "border-primary/40 ring-1 ring-primary/20 scale-[1.02] shadow-xl shadow-primary/5" : ""}`}
            >
              {service.title === "Exam Pass Predictor" && (
                <div className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
                  Flagship Feature
                </div>
              )}
              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />

              <div className="relative z-10">
                <div className="mb-6 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                  <service.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">{service.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {service.highlights.map((h) => (
                    <span
                      key={h}
                      className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
