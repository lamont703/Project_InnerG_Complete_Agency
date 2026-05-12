import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cognitive Feedstock: 15 Data Sources for Aesthetic AI | Technical Brief',
  description: 'Moving beyond simple booking lists to tap into high-fidelity data that captures the human element of wellness and grooming.',
  keywords: ['AI data sources', 'wellness AI parameters', 'grooming data feedstock', 'ADI data landscape'],
  openGraph: {
    title: 'Cognitive Feedstock: 15 Data Sources for Aesthetic AI',
    type: 'article',
    url: 'https://innergcomplete.com/insights/cognitive-feedstock-15-data-sources',
    siteName: 'Inner G Complete Agency',
    images: [
      {
        url: '/cognitive_feedstock_brief_cover_1776041859371.png',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cognitive Feedstock: The 15 Enterprise Data Sources",
    images: ['/cognitive_feedstock_brief_cover_1776041859371.png'],
  },
  alternates: {
    canonical: "https://innergcomplete.com/insights/cognitive-feedstock-15-data-sources",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
