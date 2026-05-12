import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'The Cognitive Architecture Blueprint | ADI Methodology',
  description: 'How Inner G Complete applies the PMI-certified CPMAI framework to architect governance-first Aesthetic Domain Intelligence (ADI) models.',
  keywords: ['CPMAI framework', 'cognitive architecture', 'ADI methodology', 'AI project management'],
  openGraph: {
    title: 'The Cognitive Architecture Blueprint | Inner G Complete',
    type: 'article',
    url: 'https://innergcomplete.com/insights/cognitive-architecture-blueprint',
    siteName: 'Inner G Complete Agency',
    images: [
      {
        url: '/cpmai_framework_cover.png',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cognitive Architecture Blueprint",
    images: ['/cpmai_framework_cover.png'],
  },
  alternates: {
    canonical: "https://innergcomplete.com/insights/cognitive-architecture-blueprint",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
