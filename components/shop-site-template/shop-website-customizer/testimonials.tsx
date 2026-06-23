"use client"

import { useState } from "react"
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react"

const reviews = [
  {
    quote: "Hair cut, ambiance and service was A-1. Walked out feeling like a brand new man. This is the only shop I trust now.",
    name: "Marcus T.",
    detail: "Skin Fade · Beard Trim",
  },
  {
    quote: "Best Barbershop in GA! Open 24/7 which is clutch for my work schedule. Always clean, always professional.",
    name: "Devin R.",
    detail: "Late-Night Appointment",
  },
  {
    quote: "Brought my son in for his first real haircut. They were patient, kind, and the cut was perfect. Family spot for life.",
    name: "Andre W.",
    detail: "Kids Haircut",
  },
  {
    quote: "The vibe is unmatched. Dope music, sharp barbers, and a fade that lasts. Hapeville is lucky to have Legends.",
    name: "Jaylen B.",
    detail: "Taper Fade · Styling",
  },
]

export function Testimonials() {
  const [index, setIndex] = useState(0)

  const prev = () => setIndex((i) => (i === 0 ? reviews.length - 1 : i - 1))
  const next = () => setIndex((i) => (i === reviews.length - 1 ? 0 : i + 1))

  const review = reviews[index]

  return (
    <section id="reviews" className="border-t border-border bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          Social Proof
        </p>
        <h2 className="mt-3 font-heading text-4xl font-bold uppercase tracking-tight text-balance text-foreground lg:text-5xl">
          What the city is saying
        </h2>

        <div className="relative mt-12 rounded-2xl border border-border bg-card p-8 sm:p-12">
          <Quote className="mx-auto size-10 text-primary" />

          <div className="mt-6 flex justify-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-5 fill-primary text-primary" />
            ))}
          </div>

          <blockquote className="mt-6 text-xl leading-relaxed text-pretty text-card-foreground sm:text-2xl">
            &ldquo;{review.quote}&rdquo;
          </blockquote>

          <div className="mt-8">
            <p className="font-heading text-lg font-semibold uppercase tracking-wide text-foreground">
              {review.name}
            </p>
            <p className="text-sm text-muted-foreground">{review.detail}</p>
          </div>

          <div className="mt-10 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous review"
              className="flex size-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <ChevronLeft className="size-5" />
            </button>

            <div className="flex items-center gap-2">
              {reviews.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Go to review ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    i === index ? "w-6 bg-primary" : "w-2 bg-border"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={next}
              aria-label="Next review"
              className="flex size-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
