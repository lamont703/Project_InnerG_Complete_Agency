import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Research & Insights | Inner G Complete Agency',
  description: 'Institutional research mapping the strategic intersection of Aesthetic Domain Intelligence, generative AI, and predictive modeling for the grooming and wellness sectors.',
  keywords: [
    'Artificial Domain Intelligence research',
    'barber industry AI case studies',
    'CPMAI methodology reports',
    'wellness technical briefs',
    'grooming industry data architectures',
    'rebooking AI models',
  ],
  openGraph: {
    title: 'Research & Insights | Inner G Complete Agency',
    description: 'Institutional research mapping the strategic intersection of Aesthetic Domain Intelligence, generative AI, and predictive modeling.',
    url: 'https://innergcomplete.com/insights',
    type: 'website',
    images: [
      {
        url: '/insights-library-cover.png',
        width: 1200,
        height: 630,
        alt: 'Inner G Complete Research & Insights Library',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Research & Insights | Inner G Complete Agency',
    description: 'Institutional research mapping the strategic intersection of Aesthetic Domain Intelligence, generative AI, and predictive modeling.',
    images: ['/insights-library-cover.png'],
  },
  alternates: {
    canonical: 'https://innergcomplete.com/insights',
  },
}

export default function InsightsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
