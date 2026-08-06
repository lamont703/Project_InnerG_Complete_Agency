import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact ShearQuery — Compliance Binders & Listing Help',
  description: "Talk to us about a distance-education compliance binder for your school, or about claiming your barbershop or salon listing. We reply within a business day.",
  openGraph: {
    title: 'Contact ShearQuery — Compliance Binders & Listing Help',
    description: "Distance-education compliance binders for schools, plus listing and claim help for barbershops and salons. Reply within one business day.",
    url: 'https://agency.innergcomplete.com/contact',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Contact ShearQuery',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact ShearQuery — Compliance Binders & Listing Help',
    description: "Distance-education compliance binders for schools, plus listing and claim help for barbershops and salons. Reply within one business day.",
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://agency.innergcomplete.com/contact',
  },
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
