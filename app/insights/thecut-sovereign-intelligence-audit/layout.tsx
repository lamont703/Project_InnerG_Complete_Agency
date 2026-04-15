import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'theCut\'s Intelligence Ceiling | Strategic View | Inner G Complete',
  description: 'A CEO-level strategic audit of the intelligence gap within theCut\'s $2B transaction platform and the blueprint for its ADI evolution.',
  keywords: [
    'theCut AI strategy',
    'theCut barber app intelligence',
    'barber platform AI evolution',
    'theCut strategic audit',
  ],
  openGraph: {
    title: 'theCut\'s Intelligence Ceiling | Inner G Complete',
    type: 'article',
    url: 'https://innergcomplete.com/insights/thecut-sovereign-intelligence-audit',
    siteName: 'Inner G Complete Agency',
    images: [
      {
        url: '/thecut_sovereign_intelligence_audit.png',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "theCut's Intelligence Ceiling",
    images: ['/thecut_sovereign_intelligence_audit.png'],
  },
  alternates: {
    canonical: "https://innergcomplete.com/insights/thecut-sovereign-intelligence-audit",
  },
}


export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
