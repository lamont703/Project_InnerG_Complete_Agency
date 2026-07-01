import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ABC Fitness Software Audit: Too Big to Innovate? | Sovereign Audit',
  description: 'We analyzed ABC Fitness\'s enterprise architecture. Discover why boutique fitness owners are ditching it for sovereign AI solutions.',
  openGraph: {
    title: 'ABC Fitness Software Audit: Too Big to Innovate? | Sovereign Audit',
    description: 'We analyzed ABC Fitness\'s enterprise architecture. Discover why boutique fitness owners are ditching it for sovereign AI solutions.',
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
    title: "ABC Fitness's Intelligence Ceiling",
    images: ['/abc_fitness_sovereign_intelligence_audit.png'],
  },
  alternates: {
    canonical: "https://innergcomplete.com/insights/abc-fitness-sovereign-intelligence-audit",
  },
}


export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
