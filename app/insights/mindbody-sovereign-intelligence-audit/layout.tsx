import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mindbody is Dead for Salons in 2026 | Sovereign Audit',
  description: 'An explosive audit of Mindbody\'s legacy infrastructure and why elite salon owners are migrating to AI-driven sovereign architecture.',
  keywords: [
    'mindbody alternatives 2026',
    'mindbody reviews',
    'wellness software ADI layers',
  ],
  openGraph: {
    title: 'Mindbody is Dead for Salons in 2026 | Sovereign Audit',
    description: 'An explosive audit of Mindbody\'s legacy infrastructure and why elite salon owners are migrating to AI-driven sovereign architecture.',
    type: 'article',
    url: 'https://agency.innergcomplete.com/insights/mindbody-sovereign-intelligence-audit',
    siteName: 'Inner G Complete Agency',
    images: [
      {
        url: '/mindbody_sovereign_intelligence_audit.png',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MindBody's Intelligence Ceiling",
    images: ['/mindbody_sovereign_intelligence_audit.png'],
  },
  alternates: {
    canonical: "https://innergcomplete.com/insights/mindbody-sovereign-intelligence-audit",
  },
}


export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
