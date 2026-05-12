import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Barber School Pilot Scholarship Fund | Free Board Exam Prep | Inner G Complete',
  description: 'Free AI-enhanced board exam prep for Texas barber schools. The Barber Exam Prep Pilot Scholarship provides 500 sponsored student seats to close the 58% written exam failure rate. Apply now — zero cost to your school.',
  keywords: [
    'barber school scholarship Texas',
    'free barber exam prep',
    'Texas barber written exam pass rate',
    'NACCAS accreditation help Texas',
    'barber school pilot program',
    'PSI barber exam preparation',
    'El Paso barber school scholarship',
    'TDLR barber exam prep scholarship',
    'barber student licensure help',
    'barber school board exam failure rate',
  ],
  openGraph: {
    title: 'Barber School Pilot Scholarship Fund | Free Board Exam Prep',
    description: 'Texas barber schools are losing students to the written exam. The Pilot Scholarship gives your students free AI-powered, board-aligned exam prep — at zero cost to your school.',
    url: 'https://innergcomplete.com/barber-school-pilot-scholarship-fund',
    type: 'website',
    images: [
      {
        url: '/el_paso_barber_rescue_report_cover.png',
        width: 1200,
        height: 630,
        alt: 'Barber School Pilot Scholarship Fund — Free Board Exam Prep for Texas Schools',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Barber School Pilot Scholarship Fund | Free Board Exam Prep',
    description: '500 free scholarship seats for Texas barber students. AI-enhanced PSI board exam prep at zero cost to your school. Apply now.',
    images: ['/el_paso_barber_rescue_report_cover.png'],
  },
  alternates: {
    canonical: 'https://innergcomplete.com/barber-school-pilot-scholarship-fund',
  },
}

export default function ScholarshipFundLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EducationalOccupationalProgram",
            "name": "Barber Exam Prep Pilot Scholarship Fund",
            "description": "A sponsored pilot program providing Texas barber students with free AI-enhanced written board exam preparation to close the 58% statewide failure rate.",
            "url": "https://innergcomplete.com/barber-school-pilot-scholarship-fund",
            "provider": {
              "@type": "Organization",
              "name": "Inner G Complete Agency",
              "url": "https://innergcomplete.com"
            },
            "educationalProgramMode": "online",
            "occupationalCategory": "Barber",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD",
              "description": "Free during Phase 01 pilot enrollment. 500 sponsored student seats available nationwide.",
              "availability": "https://schema.org/LimitedAvailability"
            },
            "hasCourse": {
              "@type": "Course",
              "name": "Texas PSI Barber Written Exam Intelligence Prep",
              "description": "AI-driven, board-aligned practice questions and knowledge gap analysis mapped to the 75-question Texas PSI barber written examination.",
              "courseMode": "online",
              "educationalLevel": "Vocational"
            },
            "breadcrumb": {
              "@type": "BreadcrumbList",
              "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://innergcomplete.com" },
                { "@type": "ListItem", "position": 2, "name": "Barber School Pilot Scholarship Fund", "item": "https://innergcomplete.com/barber-school-pilot-scholarship-fund" }
              ]
            }
          })
        }}
      />
      {children}
    </>
  )
}
