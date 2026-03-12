/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from Supabase storage bucket
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Strict mode for better React development experience
  reactStrictMode: true,

  // Explicitly allow server-only packages to prevent accidental browser bundling
  serverExternalPackages: [],

  // Required for Vercel deployment — disable x-powered-by header
  poweredByHeader: false,

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
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
    ]
  },
}

export default nextConfig
