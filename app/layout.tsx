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

import { headers } from 'next/headers'

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const host = headersList.get('host') || 'agency.innergcomplete.com'
  const isTexasBarbering = host.includes('texasbarbering')
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const domainUrl = `${protocol}://${host}`

  const tenantName = isTexasBarbering ? 'Texas Barbering Intelligence' : 'Inner G Complete Agency'
  
  return {
    metadataBase: new URL(domainUrl),
    alternates: {
      canonical: '/',
    },
    title: isTexasBarbering 
      ? 'Texas Barber Exam Intelligence | AI Enhanced Practice Questions'
      : 'Inner G Complete Agency | Artificial Domain Intelligence for Grooming & Wellness',
    description: isTexasBarbering
      ? 'Institutional-grade licensure prep for Texas Barber students. AI-enhanced practice questions and aesthetic intelligence pathways designed to maximize first-time pass rates.'
      : 'Inner G Complete architects sovereign AI intelligence layers for grooming, beauty, and wellness enterprises. CPMAI-governed ADI models.',
    keywords: [
      'Artificial Domain Intelligence',
      'Texas Barber Exam',
      'TDLR Barber Test',
      'PSI Barber Exam Prep',
      'Barber School AI',
      'Aesthetic Intelligence',
      'Inner G Complete Agency',
    ],
    authors: [{ name: 'Lamont Evans', url: '/about' }],
    creator: tenantName,
    publisher: tenantName,
    openGraph: {
      title: isTexasBarbering ? 'Texas Barber Exam Intelligence' : 'Inner G Complete Agency | Artificial Domain Intelligence',
      description: isTexasBarbering 
        ? 'AI-enhanced practice questions and aesthetic intelligence pathways for Texas Barber licensure.' 
        : 'Sovereign AI intelligence layers for grooming enterprises. institutionally auditable.',
      url: '/',
      siteName: tenantName,
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: `${tenantName} — Artificial Domain Intelligence`,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: tenantName,
      description: isTexasBarbering ? 'AI-enhanced Texas Barber licensure prep.' : 'Sovereign AI intelligence layers for grooming enterprises.',
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
  const headersList = await headers()
  const host = headersList.get('host') || 'agency.innergcomplete.com'
  const isTexasBarbering = host.includes('texasbarbering')
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const domainUrl = `${protocol}://${host}`
  const tenantName = isTexasBarbering ? 'Texas Barbering Intelligence' : 'Inner G Complete Agency'

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
        {/* Google Tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-VGHV9QQG46"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-VGHV9QQG46');
          `}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": tenantName,
              "url": domainUrl,
              "logo": `${domainUrl}/icon-dark-32x32.png`,
              "sameAs": [
                "https://www.linkedin.com/company/inner-g-complete-agency/"
              ],
              "founder": {
                "@type": "Person",
                "name": "Lamont Evans",
                "jobTitle": "Principal Architect"
              },
              "description": isTexasBarbering 
                ? "Institutional-grade licensure prep for Texas Barber students using AI-enhanced pathways."
                : "Inner G Complete architects sovereign AI intelligence layers for grooming, beauty, and wellness enterprises.",
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
