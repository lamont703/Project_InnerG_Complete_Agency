import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Texas Barber Exam Intelligence Prep™ | Inner G Complete",
  description:
    "Texas barber schools face a statewide 37.25% written exam failure rate. Inner G Complete's ADI-powered Texas Barber Exam Intelligence Prep™ targets PSI syntax mastery, NACCAS compliance, and first-time pass rates for Houston, Dallas, San Antonio, and all Texas barber programs.",
  keywords: [
    "Texas barber exam prep",
    "Texas barber written exam",
    "PSI barber exam Texas",
    "TDLR barber exam prep",
    "Texas barber school pass rate",
    "NACCAS accreditation Texas barber school",
    "barber board exam intelligence prep",
    "Texas barber licensure crisis",
    "barber exam AI prep",
    "Inner G Complete Texas",
    "Texas barber school scholarship",
    "PSI written exam prep Texas",
    "barber exam study guide Texas",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    title: "Texas Barber Exam Intelligence Prep™ | Inner G Complete",
    description:
      "37.25% statewide written exam failure rate. Our Artificial Domain Intelligence resolves PSI syntax gaps and secures NACCAS compliance for Texas barber schools.",
    url: "https://www.innergcomplete.com/texas-barber-exam-intelligence-prep",
    siteName: "Inner G Complete Agency",
    images: [
      {
        url: "/texas_barber_crisis_cover.png",
        width: 1200,
        height: 630,
        alt: "Texas Barber Exam Intelligence Prep™ — ADI-Powered Pass Rate Recovery for TDLR Licensure",
      },
    ],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Texas Barber Exam Intelligence Prep™ | Inner G Complete",
    description:
      "Texas's 37.25% written exam failure rate demands a new approach. ADI-powered prep for PSI board exam mastery and NACCAS compliance.",
    images: ["/texas_barber_crisis_cover.png"],
  },
  alternates: {
    canonical: "https://www.innergcomplete.com/texas-barber-exam-intelligence-prep",
  },
}

const courseJsonLd = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: "Texas Barber Exam Intelligence Prep™",
  description:
    "ADI-powered barber board exam preparation targeting Texas's 37.25% statewide written failure rate. Covers PSI syntax decoding, NACCAS compliance, and domain-specific mastery across all 75 written exam categories for TDLR licensure.",
  url: "https://www.innergcomplete.com/texas-barber-exam-intelligence-prep",
  datePublished: "2026-04-01",
  provider: {
    "@type": "Organization",
    name: "Inner G Complete Agency",
    url: "https://www.innergcomplete.com",
    logo: "https://www.innergcomplete.com/apple-icon.png",
  },
  educationalLevel: "Professional Certification",
  about: [
    { "@type": "Thing", name: "Texas PSI Barber Written Exam" },
    { "@type": "Thing", name: "NACCAS Accreditation Compliance" },
    { "@type": "Thing", name: "TDLR Barber Licensure Texas" },
    { "@type": "Thing", name: "Texas Barber Licensure Crisis" },
  ],
  teaches: "PSI barber written exam theory mastery, NACCAS compliance, distractor logic decoding, Texas Chapter 82 alignment",
  audience: {
    "@type": "EducationalAudience",
    educationalRole: ["student", "professional", "teacher"],
    audienceType: "Barber Students, Barber Instructors, Barber School Owners in Texas",
  },
  hasCourseInstance: {
    "@type": "CourseInstance",
    courseMode: "online",
    courseWorkload: "PT6W",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/LimitedAvailability",
      validThrough: "2026-12-31",
    },
  },
}

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.innergcomplete.com" },
    { "@type": "ListItem", position: 2, name: "Solutions", item: "https://www.innergcomplete.com/solutions" },
    {
      "@type": "ListItem",
      position: 3,
      name: "Texas Barber Exam Intelligence Prep",
      item: "https://www.innergcomplete.com/texas-barber-exam-intelligence-prep",
    },
  ],
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the Texas barber written exam pass rate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The statewide Texas barber written exam pass rate is 37.25% based on April 2026 TDLR data. This means more than 6 in 10 students fail their first attempt, creating a significant bottleneck to licensure.",
      },
    },
    {
      "@type": "Question",
      name: "Why do Texas barber students fail the PSI written exam?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The failure is not due to lack of practical skill — students achieve an 89.8% pass rate on practical exams. The PSI written theory exam uses specific distractor logic and question syntax that standard barbering curricula don't explicitly address, creating an informational design failure.",
      },
    },
    {
      "@type": "Question",
      name: "What is the Texas Barber Exam Intelligence Prep™?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Texas Barber Exam Intelligence Prep™ is an ADI-powered (Artificial Domain Intelligence) exam preparation program by Inner G Complete Agency. It decodes PSI distractor logic, trains students on TDLR Chapter 82 alignment, and secures NACCAS compliance for Texas barber schools.",
      },
    },
    {
      "@type": "Question",
      name: "Is the Texas barber exam prep scholarship free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The Barber Exam Prep Pilot Scholarship provides zero-cost sponsored access to qualifying Texas barber students and schools through the Inner G Complete Agency Pilot Program.",
      },
    },
    {
      "@type": "Question",
      name: "What happens if a Texas barber school falls below the NACCAS 70% threshold?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Schools falling below NACCAS's 70% written exam pass rate threshold are issued a Request for Monitoring. Consecutive failures can result in loss of Title IV federal funding eligibility, which would effectively shut down student enrollment at most institutions.",
      },
    },
    {
      "@type": "Question",
      name: "Which Texas cities have the worst barber exam pass rates?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Based on April 2026 TDLR data, Houston (36.8%), San Antonio (35.2%), and Dallas (37.5%) represent the highest-risk metropolitan clusters. These three hubs account for the majority of the statewide $15M annual wage leak caused by licensure delays.",
      },
    },
  ],
}

export default function TexasBarberExamPrepLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      {children}
    </>
  )
}
