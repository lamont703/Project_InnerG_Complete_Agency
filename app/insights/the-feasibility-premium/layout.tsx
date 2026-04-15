import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'The Feasibility Premium: Starting with "No" | Strategic View',
  description: 'Why the most successful AI projects in wellness and grooming begin with a ruthless CPMAI viability audit, not a development sprint.',
  openGraph: {
    title: 'The Feasibility Premium: Starting with "No"',
    type: 'article',
    url: 'https://innergcomplete.com/insights/the-feasibility-premium',
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
