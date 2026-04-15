import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MindBody\'s Intelligence Ceiling | Strategic View | Inner G Complete',
  description: 'A platform audit of why MindBody\'s 700-integration architecture generates data without generating intelligence—and how sovereign AI changes that.',
  keywords: [
    'MindBody AI integration',
    'MindBody data architecture',
    'wellness software ADI layers',
  ],
  openGraph: {
    title: 'MindBody\'s Intelligence Ceiling | Inner G Complete',
    type: 'article',
    url: 'https://innergcomplete.com/insights/mindbody-sovereign-intelligence-audit',
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
