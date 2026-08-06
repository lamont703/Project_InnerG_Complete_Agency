import type { Metadata } from 'next'
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: 'Booksy for Barbershops: 2026 Review — Pricing, Limits & Alternatives',
  description: 'An independent look at Booksy\'s booking platform for barbershops in 2026 — what it does well, where it falls short, and what AI-driven alternatives now offer.',
  keywords: [
    'Booksy alternatives 2026',
    'why barbers are leaving booksy',
    'booksy reviews',
    'Booksy platform audit',
  ],
  openGraph: {
    title: 'Booksy for Barbershops: 2026 Review — Pricing, Limits & Alternatives',
    description: 'An independent look at Booksy\'s booking platform for barbershops in 2026 — what it does well, where it falls short, and what AI-driven alternatives now offer.',
    type: 'article',
    url: `${SITE_URL}/insights/booksy-sovereign-intelligence-audit`,
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
    title: "Booksy for Barbershops: 2026 Review",
    images: ['/booksy_sovereign_intelligence_audit.png'],
  },
  alternates: {
    canonical: `${SITE_URL}/insights/booksy-sovereign-intelligence-audit`,
  },
}


export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
