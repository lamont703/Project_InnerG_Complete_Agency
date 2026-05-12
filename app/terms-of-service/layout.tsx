import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | Inner G Complete Agency',
  description: 'Terms of service and enterprise agreements for Inner G Complete Agency website and ADI deployments.',
  robots: {
    index: true,
    follow: true,
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
