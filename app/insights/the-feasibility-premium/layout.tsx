import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Implementation Failures: The Feasibility Premium [Case Study]',
  description: 'Why the most successful AI projects in wellness and grooming begin with a ruthless CPMAI viability audit, not a development sprint.',
  openGraph: {
    title: 'AI Implementation Failures: The Feasibility Premium [Case Study]',
    description: 'Why the most successful AI projects in wellness and grooming begin with a ruthless CPMAI viability audit, not a development sprint.',
    type: 'article',
    url: 'https://agency.innergcomplete.com/insights/the-feasibility-premium',
    siteName: 'Inner G Complete Agency',
    images: [
      {
        url: '/the_feasibility_premium_cover_1776042291644.png',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Feasibility Premium",
    images: ['/the_feasibility_premium_cover_1776042291644.png'],
  },
  alternates: {
    canonical: "https://innergcomplete.com/insights/the-feasibility-premium",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
