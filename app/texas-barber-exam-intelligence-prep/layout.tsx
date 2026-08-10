import type { Metadata } from "next"
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";

export const metadata: Metadata = {
  title: "Texas Barber Exam Prep (2026): Pass Rates & Practice Test",
  description:
    "Real 2026 Texas barber written exam pass-rate data by city, a PSI-aligned study guide, and free practice questions — everything you need to pass the state board exam on your first try.",
  keywords: [
    "texas barber written exam practice test",
    "barber exam practice test",
    "barber written exam",
    "texas barber practice test",
    "texas class a barber written exam",
    "PSI barber exam Texas",
    "Texas barber school pass rate",
    "NACCAS accreditation Texas barber school",
    "barber exam study guide Texas",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    title: "Texas Barber Exam Prep (2026): Pass Rates & Practice Test",
    description:
      "Only 56.98% of Texas barber candidates pass the written exam on the first attempt, against 92.34% on the practical. Real 2026 TDLR data, a study guide and free practice questions.",
    url: `${SITE_URL}/texas-barber-exam-intelligence-prep`,
    siteName: "Inner G Complete Agency",
    images: [
      {
        url: "/texas_barber_crisis_cover.png",
        width: 1200,
        height: 630,
        alt: "Texas Barber Written Exam Prep — Pass Rates & Practice Test",
      },
    ],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Texas Barber Exam Prep (2026): Pass Rates & Practice Test",
    description:
      "56.98% first-attempt written pass rate against 92.34% practical. Real 2026 TDLR data, a study guide and free practice questions.",
    images: ["/texas_barber_crisis_cover.png"],
  },
  alternates: {
    canonical: `${SITE_URL}/texas-barber-exam-intelligence-prep`,
  },
}

const courseJsonLd = graph(
            {
            "@type": "Course",
            "@id": `${SITE_URL}/texas-barber-exam-intelligence-prep#course`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
  name: "Texas Barber Exam Intelligence Prep™",
  description:
    "ADI-powered barber board exam preparation targeting Texas's 56.98% first-attempt written pass rate. Covers PSI syntax decoding, NACCAS compliance, and domain-specific mastery across all 85 scored written exam items for TDLR licensure.",
  url: `${SITE_URL}/texas-barber-exam-intelligence-prep`,
  datePublished: "2026-04-01",
  provider: {
    "@type": "Organization",
    name: "Inner G Complete Agency",
    url: SITE_URL,
    logo: `${SITE_URL}/apple-icon.png`,
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
},
          )

const breadcrumbJsonLd = graph(
            {
            "@type": "BreadcrumbList",
            "@id": `${SITE_URL}/texas-barber-exam-intelligence-prep#breadcrumblist`,
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Solutions", item: `${SITE_URL}/solutions` },
    {
      "@type": "ListItem",
      position: 3,
      name: "Texas Barber Exam Intelligence Prep",
      item: `${SITE_URL}/texas-barber-exam-intelligence-prep`,
    },
  ],
},
          )

const faqJsonLd = graph(
            {
            "@type": "FAQPage",
            "@id": `${SITE_URL}/texas-barber-exam-intelligence-prep#faqpage`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the Texas barber written exam pass rate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It depends which question you are asking. From the 2026 TDLR roster of 2,411 sittings between January and May 2026: 56.98% of candidates pass on their first attempt, 44.09% of all attempts including retakes are passes, and 63.45% of candidates pass eventually — meaning 36.55% never pass in that window.",
      },
    },
    {
      "@type": "Question",
      name: "Why do Texas barber students fail the PSI written exam?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The failure is not due to lack of practical skill — students pass the practical at 92.34%. The PSI written theory exam uses specific distractor logic and question syntax that standard barbering curricula don't explicitly address, creating an informational design failure.",
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
        text: "Written pass rates by metro, weighted by test takers: El Paso 42.11%, San Antonio 52.17% and Austin 58.82% all sit below the NACCAS 70% threshold. Houston reaches 67.87% on the largest candidate pool of any metro (249 takers), while Dallas (78.43%) and Fort Worth (77.91%) clear it comfortably.",
      },
    },
  ],
},
          )

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
