import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Careers at Inner G Complete | Build Sovereign Intelligence',
  description: 'We are hiring elite AI product managers, engineers, and strategists to build the intelligence standard for wellness and grooming.',
  keywords: [
    'AI careers',
    'Machine Learning jobs',
    'Blockchain architect roles',
    'Remote AI engineering',
    'Sovereign intelligence careers',
  ],
  openGraph: {
    title: 'Careers at Inner G Complete | Build Sovereign Intelligence',
    description: 'We are hiring elite AI product managers, engineers, and strategists to build the intelligence standard for wellness and grooming.',
    url: 'https://innergcomplete.com/careers',
    type: 'website',
    images: [
      {
        url: '/careers-hub-cover.png',
        width: 1200,
        height: 630,
        alt: 'Join the Inner G Complete Agency Team',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Careers at Inner G Complete | Build Sovereign Intelligence',
    description: 'We are hiring elite AI product managers, engineers, and strategists to build the intelligence standard for wellness and grooming.',
    images: ['/careers-hub-cover.png'],
  },
  alternates: {
    canonical: 'https://innergcomplete.com/careers',
  },
}

export default function CareersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
