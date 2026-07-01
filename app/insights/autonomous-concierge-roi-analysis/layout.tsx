import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Autonomous Concierge ROI: How AI Saves Barbers $12k/Yr [Case Study]',
  description: 'Quantifying the massive economic impact of AI-driven booking agents. See how autonomous concierges eliminate no-shows and increase clinical throughput.',
  keywords: [
    'autonomous concierge AI',
    'barber AI ROI case study',
    'AI clinical throughput',
    'wellness AI booking agents',
  ],
  openGraph: {
    title: 'Autonomous Concierge ROI: How AI Saves Barbers $12k/Yr [Case Study]',
    description: 'Quantifying the massive economic impact of AI-driven booking agents. See how autonomous concierges eliminate no-shows and increase clinical throughput.',
    type: 'article',
    url: 'https://agency.innergcomplete.com/insights/autonomous-concierge-roi-analysis',
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
