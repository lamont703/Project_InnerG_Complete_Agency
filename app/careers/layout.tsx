import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Careers | Inner G Complete Agency',
  description: 'Join the architecture firm building the sovereign intelligence layer for the wellness and grooming sectors. We are hiring elite AI product managers, engineers, and strategists.',
  keywords: [
    'AI careers',
    'AI product manager jobs',
    'machine learning engineer jobs',
    'Inner G Complete hiring',
    'ADI architecture roles',
  ],
  openGraph: {
    title: 'Careers at Inner G Complete | Build Sovereign Intelligence',
    description: 'We are hiring elite AI product managers, engineers, and strategists to build the intelligence standard for wellness and grooming.',
    url: 'https://innergcomplete.com/careers',
    type: 'website',
  },
  alternates: {
    canonical: 'https://innergcomplete.com/careers',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
