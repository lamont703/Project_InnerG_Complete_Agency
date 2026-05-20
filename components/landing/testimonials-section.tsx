"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Quote } from "lucide-react"
import { Button } from "@/components/ui/button"

const testimonials = [
  {
    quote:
      "Inner G Complete didn't just build us a software dashboard — they architected a complete enrollment engine. Their autonomous AI recovered so many abandoned leads that our next cohort was fully booked a month early.",
    name: "Marcus Thorne",
    role: "Director of Admissions",
    company: "Texas Barber Academy",
  },
  {
    quote:
      "The Predictive Diagnostics tool completely changed our pedagogy. We stopped guessing who was struggling and started intervening early. Our State Board first-time pass rate jumped from 72% to 94%.",
    name: "Elena Rodriguez",
    role: "Lead Educator",
    company: "Lumina Cosmetology Institute",
  },
  {
    quote:
      "Maintaining our NACCAS accreditation used to be a nightmare of spreadsheets. Their AI Placement Matcher not only secured jobs for our graduates automatically, but it generated the exact audit-ready paper trail we needed for Title-IV.",
    name: "James Sterling",
    role: "School Owner",
    company: "Sterling Grooming College",
  },
]

export function TestimonialsSection() {
  const [active, setActive] = useState(0)

  const prev = () => setActive((i) => (i === 0 ? testimonials.length - 1 : i - 1))
  const next = () => setActive((i) => (i === testimonials.length - 1 ? 0 : i + 1))

  const t = testimonials[active]

  return (
    <section className="relative py-32">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent" aria-hidden="true" />

      <div className="mx-auto max-w-4xl px-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          Testimonials
        </p>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
          What Our Partners Say
        </h2>

        <div className="mt-16 glass-panel rounded-2xl p-6 sm:p-10 lg:p-14">
          <Quote className="mx-auto h-10 w-10 text-primary/30" aria-hidden="true" />
          <blockquote className="mt-6 text-lg leading-relaxed text-foreground sm:text-xl">
            &ldquo;{t.quote}&rdquo;
          </blockquote>
          <div className="mt-8">
            <p className="font-semibold text-foreground">{t.name}</p>
            <p className="text-sm text-muted-foreground">
              {t.role}, {t.company}
            </p>
          </div>

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={prev}
              className="h-10 w-10 rounded-full border-border text-foreground hover:bg-secondary/50"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`h-2 rounded-full transition-all ${i === active ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"
                    }`}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={next}
              className="h-10 w-10 rounded-full border-border text-foreground hover:bg-secondary/50"
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
