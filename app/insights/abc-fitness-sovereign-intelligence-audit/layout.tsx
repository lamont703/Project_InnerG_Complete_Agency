import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ABC Fitness\'s Intelligence Ceiling | Strategic View | Inner G Complete',
  description: 'A strategic audit of the intelligence gap at the heart of the world\'s largest fitness platform and how ADI bridges it.',
  openGraph: {
    title: 'ABC Fitness\'s Intelligence Ceiling | Inner G Complete',
    type: 'article',
    url: 'https://innergcomplete.com/insights/abc-fitness-sovereign-intelligence-audit',
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
