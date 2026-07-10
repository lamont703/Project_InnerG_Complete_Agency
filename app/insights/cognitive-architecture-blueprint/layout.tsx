import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How We Build AI Systems for Barbershops: Our Framework Explained',
  description: 'A behind-the-scenes look at the framework we use to design reliable, governance-first AI tools for the barber and beauty industry.',
  keywords: ['CPMAI framework', 'cognitive architecture', 'ADI methodology', 'AI project management'],
  openGraph: {
    title: 'How We Build AI Systems for Barbershops: Our Framework Explained',
    description: 'A behind-the-scenes look at the framework we use to design reliable, governance-first AI tools for the barber and beauty industry.',
    type: 'article',
    url: 'https://agency.innergcomplete.com/insights/cognitive-architecture-blueprint',
    siteName: 'Inner G Complete Agency',
    images: [
      {
        url: '/cpmai_framework_cover.png',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "How We Build AI Systems for Barbershops",
    images: ['/cpmai_framework_cover.png'],
  },
  alternates: {
    canonical: "https://agency.innergcomplete.com/insights/cognitive-architecture-blueprint",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
