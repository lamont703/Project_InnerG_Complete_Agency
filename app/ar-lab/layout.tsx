import type { Metadata } from "next"
import { notFound } from "next/navigation"

/**
 * Development-only harness for the AR overlay. See app/ar-lab/page.tsx.
 *
 * It 404s in production rather than being auth-gated like the routes in
 * middleware's INTERNAL_TOOL_ROUTES, for one specific reason: the whole point
 * of this route is that a headless browser can reach it, and an auth gate would
 * mean scripts/ar_lab_shot.js needs a session before it can take a picture. A
 * harness that is awkward to run is a harness nobody runs.
 *
 * Not existing in production is also a stronger guarantee than noindex. The
 * `robots` entry below is belt and braces for preview deployments, where
 * NODE_ENV is production but the URL is reachable by anyone with the link.
 * It is excluded from the sitemap in lib/public-routes.ts as well — a sitemap
 * entry that 404s is worse than no entry at all.
 */
export const metadata: Metadata = {
  title: "AR overlay lab (dev only)",
  robots: { index: false, follow: false },
}

export default function ArLabLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound()
  return children
}
