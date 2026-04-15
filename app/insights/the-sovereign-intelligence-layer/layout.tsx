import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'The Sovereign Intelligence Layer | Core Vision',
  description: 'Why the enterprise that builds a proprietary Artificial Domain Intelligence creates an unassailable competitive moat.',
  keywords: ['sovereign intelligence layer', 'Artificial Domain Intelligence vision', 'enterprise grooming AI moat'],
  openGraph: {
    title: 'The Sovereign Intelligence Layer: Why ADI Wins',
    type: 'article',
    url: 'https://innergcomplete.com/insights/the-sovereign-intelligence-layer',
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
    canonical: "https://innergcomplete.com/insights/the-sovereign-intelligence-layer",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
