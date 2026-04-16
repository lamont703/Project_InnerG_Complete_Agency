import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Inner G Complete Agency | Start Your ADI Deployment',
  description: 'Initiate a CPMAI-governed Artificial Domain Intelligence deployment. Contact our architectural support for wellness and grooming enterprises.',
  openGraph: {
    title: 'Contact Inner G Complete Agency | Start Your ADI Deployment',
    description: 'Initiate a CPMAI-governed Artificial Domain Intelligence deployment. Contact our architectural support.',
    url: 'https://innergcomplete.com/contact',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Contact Inner G Complete Agency',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Inner G Complete Agency | Start Your ADI Deployment',
    description: 'Initiate a CPMAI-governed Artificial Domain Intelligence deployment.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://innergcomplete.com/contact',
  },
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
