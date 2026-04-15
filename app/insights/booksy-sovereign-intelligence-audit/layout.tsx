import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Booksy\'s Intelligence Ceiling | Strategic View | Inner G Complete',
  description: 'A strategic audit of the $10B GMV global Booksy marketplace and the sovereign intelligence tier it is ready to support.',
  keywords: [
    'Booksy AI strategies',
    'barbershop booking platform intelligence',
    'Booksy platform audit',
  ],
  openGraph: {
    title: 'Booksy\'s Intelligence Ceiling | Inner G Complete',
    type: 'article',
    url: 'https://innergcomplete.com/insights/booksy-sovereign-intelligence-audit',
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
