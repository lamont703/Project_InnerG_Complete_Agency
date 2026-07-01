import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Rebooking AI Case Study: Eliminating Barber No-Shows in 2026",
  description: "Read the pilot case study on how autonomous AI is predicting no-shows and automatically rebooking clients to maintain 100% floor revenue.",
  keywords: [
    "Barber ADI pilot",
    "rebooking AI model",
    "theCut platform intelligence",
    "Booksy barber automation",
    "no-show prediction AI",
    "predictive scheduling case study",
    "CPMAI blueprint",
    "barbershop retention technology"
  ],
  openGraph: {
    title: "Rebooking AI Case Study: Eliminating Barber No-Shows in 2026",
    description: "Read the pilot case study on how autonomous AI is predicting no-shows and automatically rebooking clients to maintain 100% floor revenue.",
    type: "article",
    url: "https://agency.innergcomplete.com/insights/rebooking-intelligence-pilot",
    publishedTime: "2026-04-14T08:00:00Z",
    authors: ["https://innergcomplete.com/about"],
    siteName: 'Inner G Complete Agency',
    images: [
      {
        url: '/rebooking_intelligence_pilot_brief.png',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rebooking Appointment Intelligence | Barber Grooming ADI Pilot",
    images: ['/rebooking_intelligence_pilot_brief.png'],
  },
  alternates: {
    canonical: "https://innergcomplete.com/insights/rebooking-intelligence-pilot",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
