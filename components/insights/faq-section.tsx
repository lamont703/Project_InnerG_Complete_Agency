"use client"

import React from "react"
import { Plus, Minus } from "lucide-react"

interface FAQItem {
  question: string
  answer: string
}

interface FAQSectionProps {
  faqs: FAQItem[]
}

export function FAQSection({ faqs }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null)

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((f) => ({
      "@type": "Question",
      "name": f.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.answer
      }
    }))
  }

  return (
    <section className="mt-24 py-16 border-t border-border/50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      
      <div className="mb-12">
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Strategic Q&A</span>
        <h2 className="mt-4 text-3xl font-black uppercase italic tracking-tighter text-foreground">
          Frequently Asked Questions
        </h2>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div 
            key={index}
            className="group rounded-2xl border border-border bg-white overflow-hidden transition-all duration-300 hover:border-primary/30"
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <span className="text-sm font-black uppercase tracking-wide text-foreground group-hover:text-primary transition-colors">
                {faq.question}
              </span>
              <div className="h-8 w-8 rounded-full bg-secondary/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                {openIndex === index ? (
                  <Minus className="h-4 w-4 text-primary" />
                ) : (
                  <Plus className="h-4 w-4 text-foreground group-hover:text-primary" />
                )}
              </div>
            </button>
            <div 
              className={`overflow-hidden transition-all duration-300 ${
                openIndex === index ? "max-h-96" : "max-h-0"
              }`}
            >
              <div className="p-6 pt-0 text-base text-muted-foreground leading-relaxed font-medium">
                {faq.answer}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
