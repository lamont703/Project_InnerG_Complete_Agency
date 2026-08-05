import type { Metadata } from "next";

/**
 * Retired page — kept reachable, removed from search.
 *
 * noindex rather than a redirect to `/`, deliberately. Google's redirect
 * guidance says sending old URLs to an irrelevant destination such as the
 * homepage "might be treated as a soft 404", and is only appropriate when
 * content was consolidated onto that page. Nothing here moved to the
 * homepage.
 *
 * The usual reason to redirect anyway is to preserve accumulated search
 * equity, and there is none: 4 pixel events in 90 days, 0 of them from a
 * search engine. So a redirect would carry the soft-404 risk to salvage
 * nothing, while noindex keeps the handful of direct hits working and is
 * trivially reversible if the panels come back.
 *
 * Also removed from the sitemap (lib/public-routes.ts). That matters beyond
 * this page: the content is AI, blockchain and startup guidance for
 * developers, the clearest topical outlier on a domain that is otherwise
 * entirely barber and beauty. Retiring it narrows what the site claims to be
 * about.
 *
 * Lives in a layout because the page is `"use client"` and a client component
 * cannot export `metadata` — see .claude/skills/publish-page.
 */
export const metadata: Metadata = {
  title: "Panel Discussions | ShearQuery",
  robots: { index: false, follow: false },
};

export default function DiscussionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
