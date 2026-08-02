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
import { AnalyticsProvider } from '@/components/providers/analytics-provider'

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
    // The non-Texas title/description double as the homepage's Markdown twin
    // (/index.md renders them as its H1 and summary) and as what an OAuth
    // reviewer sees quoted in search results, so they describe what the app
    // actually does — not only the ADI positioning, which said nothing about
    // the directory a visitor lands on.
    title: isTexasBarbering
      ? 'Texas Barber Exam Intelligence | AI Enhanced Practice Questions'
      : 'ShearQuery by Inner G Complete Agency | Barber & Beauty Directory',
    description: isTexasBarbering
      ? 'Institutional-grade licensure prep for Texas Barber students. AI-enhanced practice questions and aesthetic intelligence pathways designed to maximize first-time pass rates.'
      : 'Search verified barbershops, salons, schools, and supply stores, compare booth rent and licensing exam pass rates, and claim your business listing — ShearQuery by Inner G Complete Agency, built on CPMAI-governed Artificial Domain Intelligence.',
    keywords: [
      'Artificial Domain Intelligence',
      'Texas Barber Exam',
      'TDLR Barber Test',
      'PSI Barber Exam Prep',
      'Barber School AI',
      'Aesthetic Intelligence',
      'Inner G Complete Agency',
    ],
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    authors: [{ name: 'Lamont Evans', url: '/about' }],
    creator: tenantName,
    publisher: tenantName,
    openGraph: {
      title: isTexasBarbering ? 'Texas Barber Exam Intelligence' : 'ShearQuery by Inner G Complete Agency',
      description: isTexasBarbering
        ? 'AI-enhanced practice questions and aesthetic intelligence pathways for Texas Barber licensure.'
        : 'Search verified barbershops, salons, schools, and supply stores — and claim your business listing.',
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
      description: isTexasBarbering
        ? 'AI-enhanced Texas Barber licensure prep.'
        : 'Search verified barbershops, salons, schools, and supply stores — and claim your business listing.',
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
    verification: {
      other: {
        'p:domain_verify': 'a5754e83da941bd97520aeb25debc688',
      },
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
import { SiteNavigationTracker } from "@/components/layout/site-navigation-tracker"
import { ScrollCTA } from "@/components/shared/scroll-cta"
import { ViewAsBar } from "@/components/layout/view-as"

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
        {/* Warm the connections to every third-party origin we load a script
            from. Each one otherwise costs a DNS lookup and a TLS handshake at
            the moment the script is requested — on mobile that is most of the
            third-party cost, and it is the part we control. */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://connect.facebook.net" />
        <link rel="preconnect" href="https://senkwhdxgtypcrtoggyf.supabase.co" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />

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

        {/* Meta Pixel Code */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1557622362640803');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img 
            height="1" 
            width="1" 
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1557622362640803&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        {/* End Meta Pixel Code */}
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
                : "Inner G Complete Agency operates ShearQuery, a directory and market-intelligence platform for the barber, beauty, and wellness industry, and architects the Artificial Domain Intelligence behind it.",
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
          <SiteNavigationTracker />
          <AnalyticsProvider>
            <FacebookSDK>
              <script
                dangerouslySetInnerHTML={{
                  __html: `if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; }`,
                }}
              />
              {children}
            </FacebookSDK>
          </AnalyticsProvider>

          {/* Inner G Complete Agency Pixel */}
          <Script 
            id="inner-g-pixel"
            src="https://senkwhdxgtypcrtoggyf.supabase.co/storage/v1/object/public/pixel/inner-g-pixel.js"
            data-client-id="00000000-0000-0000-0000-000000000001"
            strategy="afterInteractive"
          />

          <Toaster position="top-right" richColors closeButton />
          <ScrollCTA />
          {/* Admin-only, and renders nothing for everyone else. Lives in the
              root layout so an active View As is impossible to lose track of —
              it follows you onto pages that don't render the navbar. It's a
              client component, so it costs the server nothing and can't affect
              this layout's caching. */}
          <ViewAsBar />
        </ThemeProvider>
      </body>
    </html>
  )
}
