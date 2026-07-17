/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from Supabase storage bucket and unsplash
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      // Google Places / Maps photo CDN (shop, salon, school, store galleries)
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "maps.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "streetviewpixels-pa.googleapis.com",
      },
      // Booksy CDN via CloudFront (barber & cosmetologist portfolio photos)
      {
        protocol: "https",
        hostname: "d2zdpiztbgorvt.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "d220aniogakg8b.cloudfront.net",
      },
      // Google Places photos alternate CDN
      {
        protocol: "https",
        hostname: "places.googleapis.com",
      },
    ],
  },

  // Strict mode for better React development experience
  reactStrictMode: true,

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // Explicitly allow server-only packages to prevent accidental browser bundling.
  // google-ads-api/google-ads-node ship a ~10MB generated protobuf file that
  // hangs the Turbopack bundler if it's traced into the route bundle instead
  // of loaded natively at request time. googleapis (used for Search Console)
  // is the same problem at a much bigger scale (~200MB).
  serverExternalPackages: ["google-ads-api", "google-ads-node", "googleapis"],

  // Required for Vercel deployment — disable x-powered-by header
  poweredByHeader: false,

  // Security headers and asset indexing controls
  async headers() {
    return [
      {
        source: "/Texas%20Barber%20Bulletin.pdf",
        headers: [
          { key: "X-Robots-Tag", value: "noindex" }
        ]
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ]
  },

  // Redirect legacy /dashboard route to default project
  // TODO Phase 2: Once auth is connected, redirect to /select-portal if no session
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/dashboard/innergcomplete",
        permanent: false,
      },
      // A real, currently-running Facebook ad campaign is sending paid
      // clicks to a truncated destination URL — confirmed live via real
      // pixel-analytics 404 events (fbclid present, referrer facebook.com)
      // still 404ing today. The ad's actual destination can't be fixed
      // from here (it lives in Meta Ads Manager), so this catches the
      // traffic on our side instead of losing it to a dead page. Matches
      // both truncation variants seen in the real logs ("/barber-beauty"
      // and "/barber-beauty-", the latter with a trailing hyphen).
      {
        source: "/barber-beauty",
        destination: "/barber-beauty-network",
        permanent: true,
      },
      {
        source: "/barber-beauty-",
        destination: "/barber-beauty-network",
        permanent: true,
      },
      // Ezoic's ads.txt Manager is the source of truth for this site's
      // ads.txt so Ezoic can keep its own demand-partner lines current
      // without a redeploy here. Per Ezoic's own setup docs, redirect
      // /ads.txt to their managed URL rather than maintaining the file
      // by hand. public/ads.txt is left in place but is now unreachable
      // on the live site (shadowed by this redirect).
      {
        source: "/ads.txt",
        destination: "https://srv.adstxtmanager.com/19390/innergcomplete.com",
        permanent: true,
      },
    ]
  },
}

export default nextConfig
