import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "El Paso Barber Exam Intelligence Prep™ | Inner G Complete",
  description:
    "El Paso barber schools face a 58% written exam failure rate. Inner G Complete's ADI-powered Exam Intelligence Prep targets PSI syntax mastery, NACCAS compliance, and first-time pass rates for Socorro, EPCC, and all El Paso-area barber programs.",
  keywords: [
    "El Paso barber exam prep",
    "El Paso barber school pass rate",
    "Texas PSI barber written exam El Paso",
    "Socorro High School barber program",
    "NACCAS accreditation El Paso",
    "barber board exam El Paso Texas",
    "TDLR barber exam El Paso",
    "barber school scholarship El Paso",
    "barber exam intelligence prep",
    "Inner G Complete El Paso",
    "El Paso barber license",
    "PSI written exam prep Texas",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    title: "El Paso Barber Exam Intelligence Prep™ | Inner G Complete",
    description:
      "58% written exam failure rate in El Paso. Our ADI resolves PSI syntax gaps and secures NACCAS compliance for El Paso barber schools.",
    url: "https://www.innergcomplete.com/el-paso-barber-exam-intelligence-prep",
    siteName: "Inner G Complete Agency",
    images: [{ url: "/el_paso_barber_rescue_report_cover.png", width: 1200, height: 630, alt: "El Paso Barber Exam Intelligence Prep — ADI-Powered Pass Rate Recovery" }],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "El Paso Barber Exam Intelligence Prep™ | Inner G Complete",
    description: "El Paso's 58% failure rate demands a new approach. ADI-powered prep for PSI board exam mastery.",
    images: ["/el_paso_barber_rescue_report_cover.png"],
  },
  alternates: {
    canonical: "https://www.innergcomplete.com/el-paso-barber-exam-intelligence-prep",
  },
}

const courseJsonLd = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: "El Paso Barber Exam Intelligence Prep™",
  description:
    "ADI-powered barber board exam preparation targeting El Paso's 58% failure rate. Covers PSI syntax decoding, NACCAS compliance, and domain-specific mastery across all 75 written exam categories for Texas TDLR licensure.",
  url: "https://www.innergcomplete.com/el-paso-barber-exam-intelligence-prep",
  datePublished: "2026-04-28",
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
    { "@type": "Thing", name: "El Paso Barber Licensure" },
  ],
  teaches: "PSI barber written exam theory mastery, NACCAS compliance, distractor logic decoding",
  audience: {
    "@type": "EducationalAudience",
    educationalRole: ["student", "professional", "teacher"],
    audienceType: "Barber Students, Barber Instructors, Barber School Owners in El Paso, Texas",
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
    { "@type": "ListItem", position: 3, name: "El Paso Barber Exam Intelligence Prep", item: "https://www.innergcomplete.com/el-paso-barber-exam-intelligence-prep" },
  ],
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the El Paso barber exam failure rate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "El Paso has a 58.0% aggregate written exam failure rate based on the April 2026 TDLR roster. Socorro High School specifically recorded a 58.5% failure rate with 24 failing grades out of 41 tests.",
      },
    },
    {
      "@type": "Question",
      name: "How does the El Paso Barber Exam Intelligence Prep work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Inner G Complete's Artificial Domain Intelligence (ADI) decodes the PSI written exam's specific question syntax and distractor logic. Students train on El Paso-specific datasets that mirror board exam patterns, targeting NACCAS compliance and first-time pass rates.",
      },
    },
    {
      "@type": "Question",
      name: "Is the El Paso Barber Exam Prep free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The Barber Exam Prep Pilot Scholarship provides sponsored access at zero cost to qualifying El Paso barber students and schools. Apply at the Barber School Pilot Scholarship Fund page.",
      },
    },
    {
      "@type": "Question",
      name: "What is the NACCAS 70% threshold and why does it matter for El Paso schools?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "NACCAS requires accredited barber schools to maintain a 70% written pass rate. Schools below this threshold face monitoring and risk losing Title IV federal funding eligibility. At 58%, El Paso programs are operating below this safety buffer.",
      },
    },
    {
      "@type": "Question",
      name: "Which El Paso barber schools have the highest failure rates?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Based on the April 2026 TDLR data, Socorro High School leads with a 58.5% failure rate (24 of 41 students failed). Other El Paso institutions including Milan Institute and El Pipo Barber School also show high-volume failure clusters.",
      },
    },
  ],
}

export default function ElPasoExamPrepLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      {children}
    </>
  )
}
