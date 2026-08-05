import type { Metadata } from "next";

/**
 * Product demo — noindex for the whole subtree.
 *
 * The index route is a bare `redirect()` to a sample shop, so it answers 307.
 * A meta tag in a redirect body is not the operative signal (Google follows
 * the redirect), which is why /tools/ai-booth-station is handled by dropping
 * it from the sitemap in lib/public-routes.ts rather than by this file.
 *
 * What this file is actually for is the children. The demo dashboards under
 * [shop_name] answer 200 and were serving `index, follow` — fake shops
 * eligible to be indexed alongside 8,900 real entity pages, which is exactly
 * the confusion the directory's value depends on avoiding.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AiBoothStationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
