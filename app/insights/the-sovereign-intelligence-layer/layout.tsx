import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How Barbershops Are Building AI Moats in 2026 [Case Study]',
  description: 'Why the enterprise that builds a proprietary Artificial Domain Intelligence creates an unassailable competitive advantage. Read the sovereign strategy.',
  keywords: ['sovereign intelligence layer', 'Artificial Domain Intelligence case study', 'enterprise grooming AI moat'],
  openGraph: {
    title: 'How Barbershops Are Building AI Moats in 2026 [Case Study]',
    description: 'Why the enterprise that builds a proprietary Artificial Domain Intelligence creates an unassailable competitive advantage. Read the sovereign strategy.',
    type: 'article',
    url: 'https://agency.innergcomplete.com/insights/the-sovereign-intelligence-layer',
    siteName: 'Inner G Complete Agency',
    images: [
      {
        url: '/adi_sovereign_layer_cover_1776108008232.png',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Sovereign Intelligence Layer",
    images: ['/adi_sovereign_layer_cover_1776108008232.png'],
  },
  alternates: {
    canonical: "https://agency.innergcomplete.com/insights/the-sovereign-intelligence-layer",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
