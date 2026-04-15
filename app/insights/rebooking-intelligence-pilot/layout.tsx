import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Rebooking Intelligence Pilot | Barber Grooming ADI Architecture",
  description: "A CPMAI-governed pilot architecture for deploying an ADI model that autonomously triggers client rebooking, eliminates no-shows, and maintains floor revenue.",
  keywords: [
    "Barber ADI pilot",
    "rebooking AI model",
    "theCut platform intelligence",
    "Booksy barber automation",
    "no-show prediction AI",
    "predictive scheduling model",
    "CPMAI blueprint",
    "barbershop retention technology"
  ],
  openGraph: {
    title: "Rebooking Appointment Intelligence | Barber Grooming ADI Pilot",
    description: "A CPMAI-governed pilot architecture for deploying an ADI model that autonomously keeps a barber's calendar full.",
    type: "article",
    url: "https://innergcomplete.com/insights/rebooking-intelligence-pilot",
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
