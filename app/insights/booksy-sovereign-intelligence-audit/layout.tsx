import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Why Booksy is Failing Barbers in 2026 | Sovereign Audit',
  description: 'We audited Booksy\'s algorithm. Discover why top barbers are abandoning legacy booking apps for autonomous AI concierges.',
  keywords: [
    'Booksy alternatives 2026',
    'why barbers are leaving booksy',
    'booksy reviews',
    'Booksy platform audit',
  ],
  openGraph: {
    title: 'Why Booksy is Failing Barbers in 2026 | Sovereign Audit',
    description: 'We audited Booksy\'s algorithm. Discover why top barbers are abandoning legacy booking apps for autonomous AI concierges.',
    type: 'article',
    url: 'https://agency.innergcomplete.com/insights/booksy-sovereign-intelligence-audit',
    siteName: 'Inner G Complete Agency',
    images: [
      {
        url: '/booksy_sovereign_intelligence_audit.png',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Booksy's Intelligence Ceiling",
    images: ['/booksy_sovereign_intelligence_audit.png'],
  },
  alternates: {
    canonical: "https://innergcomplete.com/insights/booksy-sovereign-intelligence-audit",
  },
}


export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
