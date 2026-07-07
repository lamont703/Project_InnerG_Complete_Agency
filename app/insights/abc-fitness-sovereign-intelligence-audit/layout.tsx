import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ABC Fitness Software Review 2026: Features, Cost & Better Fits for Boutique Studios',
  description: 'What ABC Fitness gets right for large gym chains — and why boutique studio owners are increasingly looking elsewhere.',
  openGraph: {
    title: 'ABC Fitness Software Review 2026: Features, Cost & Better Fits for Boutique Studios',
    description: 'What ABC Fitness gets right for large gym chains — and why boutique studio owners are increasingly looking elsewhere.',
    type: 'article',
    url: 'https://agency.innergcomplete.com/insights/abc-fitness-sovereign-intelligence-audit',
    siteName: 'Inner G Complete Agency',
    images: [
      {
        url: '/abc_fitness_sovereign_intelligence_audit.png',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ABC Fitness Software Review 2026",
    images: ['/abc_fitness_sovereign_intelligence_audit.png'],
  },
  alternates: {
    canonical: "https://innergcomplete.com/insights/abc-fitness-sovereign-intelligence-audit",
  },
}


export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
