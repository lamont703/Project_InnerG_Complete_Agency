import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TheCut App Review 2026: Why Barbers Are Leaving | Sovereign Audit',
  description: 'A brutal audit of TheCut platform. See why the top 1% of barbers are replacing it with custom AI-powered booking funnels.',
  keywords: [
    'theCut alternatives 2026',
    'thecut app review',
    'barber platform AI evolution',
    'theCut strategic audit',
  ],
  openGraph: {
    title: 'TheCut App Review 2026: Why Barbers Are Leaving | Sovereign Audit',
    description: 'A brutal audit of TheCut platform. See why the top 1% of barbers are replacing it with custom AI-powered booking funnels.',
    type: 'article',
    url: 'https://agency.innergcomplete.com/insights/thecut-sovereign-intelligence-audit',
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
