import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Texas Cosmetology Exam Prep (2026): Pass Rates & Study Guide",
  description:
    "Real 2026 Texas cosmetology written exam pass-rate data by city, a PSI-aligned study guide, and free practice questions — everything you need to pass the state board exam on your first try.",
  keywords: [
    "texas cosmetology exam",
    "texas cosmetology written exam",
    "cosmetology written exam texas",
    "cosmetology state board exam texas",
    "texas cosmetology exam study guide",
    "texas cosmetology written exam study guide",
    "psi cosmetology written exam texas",
    "texas cosmetology school pass rate",
    "NACCAS accreditation Texas cosmetology school",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    title: "Texas Cosmetology Exam Prep (2026): Pass Rates & Study Guide",
    description:
      "41% of first-time candidates fail the PSI written exam despite a 96.9% practical pass rate. Real 2026 pass-rate data, a study guide, and free practice questions.",
    url: "https://agency.innergcomplete.com/texas-cosmetology-exam-intelligence-prep",
    siteName: "Inner G Complete Agency",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Texas Cosmetology Exam Prep (2026): Pass Rates & Study Guide",
    description:
      "41% of Texas cosmetology candidates fail the PSI written exam on the first try. Real pass-rate data, a study guide, and free practice questions.",
  },
  alternates: {
    canonical: "https://agency.innergcomplete.com/texas-cosmetology-exam-intelligence-prep",
  },
}

const courseJsonLd = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: "Texas Cosmetology Exam Intelligence Prep™",
  description:
    "ADI-powered cosmetology board exam preparation targeting the 41% first-attempt failure rate on Texas's PSI written exam. Covers PSI syntax decoding, NACCAS compliance, and domain-specific mastery for TDLR Cosmetology Operator licensure.",
  url: "https://agency.innergcomplete.com/texas-cosmetology-exam-intelligence-prep",
  datePublished: "2026-07-12",
  provider: {
    "@type": "Organization",
    name: "Inner G Complete Agency",
    url: "https://agency.innergcomplete.com",
    logo: "https://agency.innergcomplete.com/apple-icon.png",
  },
  educationalLevel: "Professional Certification",
  about: [
    { "@type": "Thing", name: "Texas PSI Cosmetology Written Exam" },
    { "@type": "Thing", name: "NACCAS Accreditation Compliance" },
    { "@type": "Thing", name: "TDLR Cosmetology Licensure Texas" },
  ],
  teaches: "PSI cosmetology written exam theory mastery, NACCAS compliance, distractor logic decoding, Texas Chapter 83 alignment",
  audience: {
    "@type": "EducationalAudience",
    educationalRole: ["student", "professional", "teacher"],
    audienceType: "Cosmetology Students, Cosmetology Instructors, Cosmetology School Owners in Texas",
  },
  hasCourseInstance: {
    "@type": "CourseInstance",
    courseMode: "online",
    courseWorkload: "PT6W",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  },
}

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://agency.innergcomplete.com" },
    { "@type": "ListItem", position: 2, name: "Solutions", item: "https://agency.innergcomplete.com/solutions" },
    {
      "@type": "ListItem",
      position: 3,
      name: "Texas Cosmetology Exam Intelligence Prep",
      item: "https://agency.innergcomplete.com/texas-cosmetology-exam-intelligence-prep",
    },
  ],
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the Texas cosmetology written exam pass rate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Based on 2026 TDLR test-taker data, 72.1% of Texas cosmetology candidates eventually pass the PSI written exam, but only 58.9% pass on their first attempt — meaning 41% require at least one retest.",
      },
    },
    {
      "@type": "Question",
      name: "Why do so many Texas cosmetology students fail the PSI written exam on the first try?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It isn't a practical-skills problem — first-attempt practical pass rates run 91.3%. The PSI written theory exam uses specific distractor logic and question syntax that standard cosmetology curricula don't explicitly train for, which is the gap this program targets.",
      },
    },
    {
      "@type": "Question",
      name: "What is the Texas Cosmetology Exam Intelligence Prep™?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Texas Cosmetology Exam Intelligence Prep™ is an ADI-powered (Artificial Domain Intelligence) exam preparation program by Inner G Complete Agency. It decodes PSI distractor logic and trains candidates on TDLR Chapter 83 alignment for the Cosmetology Operator written exam.",
      },
    },
    {
      "@type": "Question",
      name: "Is the Texas cosmetology exam practice deck free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The practice deck is free to use today. An AI-enhanced, personalized version of the program is in pilot development — join the early access waitlist to be notified when it launches.",
      },
    },
    {
      "@type": "Question",
      name: "What happens if a Texas cosmetology school falls below the NACCAS 70% threshold?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Schools falling below NACCAS's 70% written exam pass rate threshold are issued a Request for Monitoring. Consecutive failures can result in loss of Title IV federal funding eligibility. Statewide, cosmetology sits just above that floor at 72.1% — but individual metro clusters, like San Antonio at 65.44%, currently fall below it.",
      },
    },
    {
      "@type": "Question",
      name: "Which Texas cities have the lowest cosmetology written exam pass rates?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Based on 2026 TDLR data, San Antonio (65.44%) is currently the only major metro cluster below the NACCAS 70% threshold. Houston (71.5%) sits just above it, while Dallas (76.3%) and El Paso (80.0%) post the strongest regional pass rates.",
      },
    },
  ],
}

export default function TexasCosmetologyExamPrepLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      {children}
    </>
  )
}
