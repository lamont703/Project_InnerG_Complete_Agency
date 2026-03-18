import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const _jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://innergcomplete.com'),
  title: 'Inner G Complete Agency | AI Consulting for Retail & Blockchain for SMBs',
  description:
    'Expert AI and blockchain consulting for small to medium-sized businesses. Total customized solutions for retail, payment processing, and operational efficiency.',
  keywords: ['AI consulting for retail', 'blockchain agency for SMBs', 'AI and blockchain consulting'],
  generator: 'v0.app',
  openGraph: {
    title: 'Inner G Complete Agency',
    description: 'Expert AI and blockchain consulting for SMBs.',
    url: 'https://innergcomplete.com', // Replace with your actual domain
    siteName: 'Inner G Complete',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Inner G Complete — AI & Blockchain Strategy',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Inner G Complete Agency',
    description: 'Expert AI and blockchain consulting for SMBs.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/favicon.ico',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0b0e1a',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { createServerClient } from "@/lib/supabase/server"

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  let agencyTheme = 'dark'
  
  try {
    const supabase = await createServerClient()
    const { data: profile } = await (supabase
      .from('agency_profile') as any)
      .select('theme_preference')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .maybeSingle()
    
    if (profile?.theme_preference) {
      agencyTheme = profile.theme_preference
    }
  } catch (err) {
    // Fallback to dark if any database issues or unauthenticated access
    agencyTheme = 'dark'
  }

  return (
    <html lang="en" className={`${_inter.variable} ${_jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme={agencyTheme}
          enableSystem
          disableTransitionOnChange
        >
          <Analytics />
          <script
            dangerouslySetInnerHTML={{
              __html: `if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; }`,
            }}
          />
          {children}
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  )
}
