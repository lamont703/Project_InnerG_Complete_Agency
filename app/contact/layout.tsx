import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us | Inner G Complete Agency',
  description: 'Initiate a CPMAI-governed Artificial Domain Intelligence deployment. Contact our architectural support for enterprise grooming and wellness AI integration.',
  keywords: [
    'contact Inner G Complete',
    'ADI deployment inquiry',
    'enterprise wellness AI consulting',
    'CPMAI Phase I audit',
    'barber grooming AI consultation',
  ],
  openGraph: {
    title: 'Contact Inner G Complete Agency | Start Your ADI Deployment',
    description: 'Initiate a CPMAI-governed Artificial Domain Intelligence deployment. Contact our architectural support.',
    url: 'https://innergcomplete.com/contact',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Contact | Inner G Complete Agency',
    description: 'Initiate a CPMAI-governed Artificial Domain Intelligence deployment for your enterprise.',
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
