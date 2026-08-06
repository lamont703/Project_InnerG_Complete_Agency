import type { Metadata } from 'next'
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: 'Mindbody for Salons in 2026: Is It Still Worth It? (Honest Review)',
  description: 'A practical look at Mindbody\'s platform for salon owners — pricing, limitations, and where AI-driven alternatives are gaining ground.',
  keywords: [
    'mindbody alternatives 2026',
    'mindbody reviews',
    'wellness software ADI layers',
  ],
  openGraph: {
    title: 'Mindbody for Salons in 2026: Is It Still Worth It? (Honest Review)',
    description: 'A practical look at Mindbody\'s platform for salon owners — pricing, limitations, and where AI-driven alternatives are gaining ground.',
    type: 'article',
    url: `${SITE_URL}/insights/mindbody-sovereign-intelligence-audit`,
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
    title: "Mindbody for Salons in 2026: Honest Review",
    images: ['/mindbody_sovereign_intelligence_audit.png'],
  },
  alternates: {
    canonical: `${SITE_URL}/insights/mindbody-sovereign-intelligence-audit`,
  },
}


export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
