import type { Metadata } from 'next'
import { Inter, Oswald } from 'next/font/google'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const oswald = Oswald({
  variable: '--font-oswald',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Legends Barbershop & Hair Studio | 24/7 Grooming in Hapeville, Atlanta',
  description:
    'Legendary grooming, 24/7. Upscale barbershop & hair studio in Hapeville/Atlanta offering A-1 haircuts, fades, beard trims, and styling for the whole family. Walk-ins welcome.',
}

export default function LegendzLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className={`${inter.variable} ${oswald.variable} w-full h-full overflow-hidden`}>
      {children}
    </div>
  )
}
