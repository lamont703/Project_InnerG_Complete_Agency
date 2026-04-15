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
  title: 'Inner G Complete Agency | Artificial Domain Intelligence for Grooming & Wellness',
  description:
    'Inner G Complete architects sovereign AI intelligence layers for grooming, beauty, and wellness enterprises. CPMAI-governed ADI models that eliminate no-shows, reduce churn, and build institutional intelligence.',
  keywords: [
    'Artificial Domain Intelligence',
    'ADI grooming AI',
    'barber AI scheduling',
    'wellness AI consulting',
    'beauty industry AI',
    'CPMAI AI framework',
    'sovereign intelligence layer',
    'no-show prediction AI',
    'medspa AI strategy',
    'luxury salon intelligence',
    'AI for barbershops',
    'Inner G Complete Agency',
  ],
  authors: [{ name: 'Lamont Evans', url: 'https://innergcomplete.com/about' }],
  creator: 'Inner G Complete Agency',
  publisher: 'Inner G Complete Agency',
  openGraph: {
    title: 'Inner G Complete Agency | Artificial Domain Intelligence',
    description:
      'We architect sovereign AI intelligence layers for grooming, beauty, and wellness enterprises. CPMAI-governed. Institutionally auditable. Built to own.',
    url: 'https://innergcomplete.com',
    siteName: 'Inner G Complete Agency',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Inner G Complete — Artificial Domain Intelligence for Grooming & Wellness',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Inner G Complete Agency | Artificial Domain Intelligence',
    description:
      'We architect sovereign AI intelligence layers for grooming, beauty, and wellness enterprises. CPMAI-governed.',
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
  maximumScale: 5,
}

import Script from 'next/script'
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { createServerClient } from "@/lib/supabase/server"
import { FacebookSDK } from "@/components/providers/facebook-sdk"

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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Inner G Complete Agency",
              "url": "https://innergcomplete.com",
              "logo": "https://innergcomplete.com/icon-dark-32x32.png",
              "sameAs": [
                "https://www.linkedin.com/company/innergcomplete"
              ],
              "founder": {
                "@type": "Person",
                "name": "Lamont Evans",
                "jobTitle": "Principal Architect"
              },
              "description": "Inner G Complete architects sovereign AI intelligence layers for grooming, beauty, and wellness enterprises using CPMAI-governed ADI models.",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Atlanta",
                "addressRegion": "GA",
                "addressCountry": "US"
              }
            })
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme={agencyTheme}
          enableSystem
          disableTransitionOnChange
        >
          <Analytics />
          <FacebookSDK>
            <script
              dangerouslySetInnerHTML={{
                __html: `if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; }`,
              }}
            />
            {children}
          </FacebookSDK>

          {/* Inner G Complete Agency Pixel */}
          <Script 
            id="inner-g-pixel"
            src="https://senkwhdxgtypcrtoggyf.supabase.co/storage/v1/object/public/pixel/inner-g-pixel.js"
            data-client-id="00000000-0000-0000-0000-000000000001"
            strategy="afterInteractive"
          />

          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  )
}
