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

import { SiteConfig, defaultSiteConfig } from "./config-defaults"
import { cn } from "@/lib/utils"

const defaultReviews = reviews

interface TestimonialsProps {
  config?: SiteConfig
  isEditable?: boolean
}

export function Testimonials({ config = defaultSiteConfig, isEditable }: TestimonialsProps) {
  const [index, setIndex] = useState(0)

  const { testimonials } = config
  const title = testimonials?.title || "Social Proof"
  const subtitle = testimonials?.subtitle || "What the city is saying"
  const reviewsList = testimonials?.reviews || defaultReviews

  const handleVisualEdit = (field: string) => {
    if (isEditable) {
      window.parent.postMessage({ type: "VISUAL_EDIT_REQUEST", field }, "*")
    }
  }

  const editableClass = (field: string) =>
    isEditable
      ? "cursor-pointer hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 hover:ring-offset-background rounded-lg p-0.5 transition-all inline-block"
      : ""

  const prev = () => setIndex((i) => (i === 0 ? reviewsList.length - 1 : i - 1))
  const next = () => setIndex((i) => (i === reviewsList.length - 1 ? 0 : i + 1))

  const review = reviewsList[index]

  return (
    <section id="reviews" className="border-t border-border bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
        <p 
          onClick={() => handleVisualEdit("testimonials.title")}
          className={cn("text-sm font-semibold uppercase tracking-widest text-primary inline-block", editableClass("testimonials.title"))}
        >
          {title}
        </p>
        <h2 
          onClick={() => handleVisualEdit("testimonials.subtitle")}
          className={cn("mt-3 font-heading text-4xl font-bold uppercase tracking-tight text-balance text-foreground lg:text-5xl", editableClass("testimonials.subtitle"))}
        >
          {subtitle}
        </h2>

        <div className="relative mt-12 rounded-2xl border border-border bg-card p-8 sm:p-12">
          <Quote className="mx-auto size-10 text-primary" />

          <div className="mt-6 flex justify-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-5 fill-primary text-primary" />
            ))}
          </div>

          <blockquote 
            onClick={() => handleVisualEdit(`testimonials.reviews.${index}.quote`)}
            className={cn("mt-6 text-xl leading-relaxed text-pretty text-card-foreground sm:text-2xl", editableClass(`testimonials.reviews.${index}.quote`))}
          >
            &ldquo;{review.quote}&rdquo;
          </blockquote>

          <div className="mt-8">
            <p 
              onClick={() => handleVisualEdit(`testimonials.reviews.${index}.name`)}
              className={cn("font-heading text-lg font-semibold uppercase tracking-wide text-foreground", editableClass(`testimonials.reviews.${index}.name`))}
            >
              {review.name}
            </p>
            <p 
              onClick={() => handleVisualEdit(`testimonials.reviews.${index}.detail`)}
              className={cn("text-sm text-muted-foreground", editableClass(`testimonials.reviews.${index}.detail`))}
            >
              {review.detail}
            </p>
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
              {reviewsList.map((_, i) => (
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
