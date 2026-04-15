import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Autonomous Concierge: ROI Analysis | Industry Report',
  description: 'Quantifying the economic impact of AI-driven booking agents on clinical throughput and client retention in MedSpas and wellness clinics.',
  keywords: [
    'autonomous concierge AI',
    'MedSpa AI ROI analysis',
    'AI clinical throughput',
    'wellness AI booking agents',
  ],
  openGraph: {
    title: 'Autonomous Concierge: ROI Analysis | Inner G Complete',
    type: 'article',
    url: 'https://innergcomplete.com/insights/autonomous-concierge-roi-analysis',
    siteName: 'Inner G Complete Agency',
    images: [
      {
        url: '/autonomous_concierge_roi_cover_1776043024026.png',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Autonomous Concierge ROI Analysis",
    images: ['/autonomous_concierge_roi_cover_1776043024026.png'],
  },
  alternates: {
    canonical: "https://innergcomplete.com/insights/autonomous-concierge-roi-analysis",
  },
}


export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
