import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Inner G Complete Agency',
  description: 'Our privacy and data governance framework for handling enterprise intelligence, client data, and site user data.',
  robots: {
    index: true,
    follow: true,
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
