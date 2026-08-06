import type { Metadata } from 'next'
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: 'TheCut App Review 2026: Features, Pricing & What Barbers Are Saying',
  description: 'An honest look at TheCut\'s booking app for barbers — what works, common complaints, and how it compares to newer AI-driven tools.',
  keywords: [
    'theCut alternatives 2026',
    'thecut app review',
    'barber platform AI evolution',
    'theCut strategic audit',
  ],
  openGraph: {
    title: 'TheCut App Review 2026: Features, Pricing & What Barbers Are Saying',
    description: 'An honest look at TheCut\'s booking app for barbers — what works, common complaints, and how it compares to newer AI-driven tools.',
    type: 'article',
    url: `${SITE_URL}/insights/thecut-sovereign-intelligence-audit`,
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
    title: "TheCut App Review 2026",
    images: ['/thecut_sovereign_intelligence_audit.png'],
  },
  alternates: {
    canonical: `${SITE_URL}/insights/thecut-sovereign-intelligence-audit`,
  },
}


export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
